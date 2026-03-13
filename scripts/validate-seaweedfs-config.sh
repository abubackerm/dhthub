#!/bin/bash

# ===========================================
# SeaweedFS Configuration Validation Script
# ===========================================
# This script validates the SeaweedFS configuration
# before deployment.

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if .env file exists
check_env_file() {
    print_info "Checking .env file..."
    
    if [ ! -f .env ]; then
        print_warning ".env file not found"
        print_info "Creating .env from .env.example..."
        cp .env.example .env
        print_success ".env file created from .env.example"
        print_warning "Please update .env with your actual values before starting services"
    else
        print_success ".env file found"
    fi
}

# Check required environment variables
check_env_vars() {
    print_info "Checking required environment variables..."
    
    source .env
    
    local missing_vars=()
    
    # SeaweedFS required variables
    [ -z "$SEAWEDFS_S3_ACCESS_KEY" ] && missing_vars+=("SEAWEDFS_S3_ACCESS_KEY")
    [ -z "$SEAWEDFS_S3_SECRET_KEY" ] && missing_vars+=("SEAWEDFS_S3_SECRET_KEY")
    [ -z "$SEAWEDFS_S3_PORT" ] && missing_vars+=("SEAWEDFS_S3_PORT")
    [ -z "$SEAWEDFS_FILER_PORT" ] && missing_vars+=("SEAWEDFS_FILER_PORT")
    [ -z "$SEAWEDFS_MASTER_PORT" ] && missing_vars+=("SEAWEDFS_MASTER_PORT")
    [ -z "$SEAWEDFS_PG_SCHEMA" ] && missing_vars+=("SEAWEDFS_PG_SCHEMA")
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    print_success "All required environment variables are set"
}

# Check Docker is available
check_docker() {
    print_info "Checking Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        return 1
    fi
    
    if ! docker ps &> /dev/null; then
        print_error "Docker daemon is not running"
        return 1
    fi
    
    print_success "Docker is available and running"
}

# Check Docker Compose is available
check_docker_compose() {
    print_info "Checking Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        print_success "docker-compose is available"
        return 0
    elif docker compose version &> /dev/null; then
        print_success "docker compose is available"
        return 0
    else
        print_error "Docker Compose is not installed"
        return 1
    fi
}

# Check Docker network
check_network() {
    print_info "Checking Docker network..."
    
    if docker network ls | grep -q "dht-hub-network"; then
        print_success "dht-hub-network exists"
    else
        print_warning "dht-hub-network not found"
        print_info "Creating dht-hub-network..."
        docker network create dht-hub-network
        print_success "dht-hub-network created"
    fi
}

# Check Docker volumes
check_volumes() {
    print_info "Checking Docker volumes..."
    
    local volumes=(
        "dht-seaweedfs-master-data"
        "dht-seaweedfs-volume-1-data"
        "dht-seaweedfs-volume-2-data"
        "dht-seaweedfs-volume-3-data"
    )
    
    local missing_volumes=()
    
    for volume in "${volumes[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            echo "  ✓ $volume exists"
        else
            echo "  ✗ $volume missing"
            missing_volumes+=("$volume")
        fi
    done
    
    if [ ${#missing_volumes[@]} -gt 0 ]; then
        print_error "Missing Docker volumes:"
        for volume in "${missing_volumes[@]}"; do
            echo "  - $volume"
        done
        print_info "Run 'docker volume create <volume-name>' for each missing volume"
        return 1
    fi
    
    print_success "All Docker volumes exist"
}

# Validate docker-compose syntax
validate_compose_file() {
    print_info "Validating docker-compose configuration..."
    
    if docker-compose -f dht-docker-compose.yml config &> /dev/null; then
        print_success "docker-compose.yml is valid"
    elif docker compose -f dht-docker-compose.yml config &> /dev/null; then
        print_success "docker-compose.yml is valid"
    else
        print_error "docker-compose.yml has syntax errors"
        return 1
    fi
}

# Check if services are already running
check_running_services() {
    print_info "Checking for running SeaweedFS services..."
    
    local services=(
        "dht-seaweedfs-master"
        "dht-seaweedfs-volume-1"
        "dht-seaweedfs-volume-2"
        "dht-seaweedfs-volume-3"
        "dht-seaweedfs-filer"
        "dht-seaweedfs-s3"
    )
    
    local running_count=0
    
    for service in "${services[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
            echo "  ✓ $service is running"
            running_count=$((running_count + 1))
        else
            echo "  - $service is not running"
        fi
    done
    
    if [ $running_count -eq ${#services[@]} ]; then
        print_success "All SeaweedFS services are running"
    elif [ $running_count -gt 0 ]; then
        print_warning "$running_count/${#services[@]} SeaweedFS services are running"
    else
        print_info "No SeaweedFS services are running"
    fi
}

# Check port availability
check_ports() {
    print_info "Checking port availability..."
    
    source .env
    
    local ports=(
        "$SEAWEDFS_MASTER_PORT:9333"
        "$SEAWEDFS_FILER_PORT:8888"
        "$SEAWEDFS_S3_PORT:8333"
        "8080:8080"
        "8081:8081"
        "8082:8082"
    )
    
    local blocked_ports=()
    
    for port_mapping in "${ports[@]}"; do
        local port="${port_mapping%%:*}"
        if netstat -tuln 2>/dev/null | grep -q ":${port} " || 
           ss -tuln 2>/dev/null | grep -q ":${port} " ||
           lsof -i :$port &> /dev/null; then
            echo "  ✗ Port $port is in use"
            blocked_ports+=("$port")
        else
            echo "  ✓ Port $port is available"
        fi
    done
    
    if [ ${#blocked_ports[@]} -gt 0 ]; then
        print_warning "Some ports are already in use:"
        for port in "${blocked_ports[@]}"; do
            echo "  - Port $port"
        done
        print_info "Services may fail to start if ports are blocked"
    else
        print_success "All required ports are available"
    fi
}

# Print configuration summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "SeaweedFS Configuration Summary"
    echo "=========================================="
    echo ""
    
    source .env
    
    echo "SeaweedFS Components:"
    echo "  - Master: http://localhost:$SEAWEDFS_MASTER_PORT"
    echo "  - Volume 1: http://localhost:8080"
    echo "  - Volume 2: http://localhost:8081"
    echo "  - Volume 3: http://localhost:8082"
    echo "  - Filer: http://localhost:$SEAWEDFS_FILER_PORT"
    echo "  - S3 API: http://localhost:$SEAWEDFS_S3_PORT"
    echo ""
    echo "PostgreSQL Configuration:"
    echo "  - Schema: $SEAWEDFS_PG_SCHEMA"
    echo "  - Host: $SEAWEDFS_PG_HOST"
    echo "  - Port: $SEAWEDFS_PG_PORT"
    echo "  - Database: $SEAWEDFS_PG_DB"
    echo ""
}

# Main execution
main() {
    echo "=========================================="
    echo "SeaweedFS Configuration Validation"
    echo "=========================================="
    echo ""
    
    local errors=0
    
    check_docker || errors=$((errors + 1))
    echo ""
    
    check_docker_compose || errors=$((errors + 1))
    echo ""
    
    check_env_file || true
    echo ""
    
    check_env_vars || errors=$((errors + 1))
    echo ""
    
    check_network || errors=$((errors + 1))
    echo ""
    
    check_volumes || errors=$((errors + 1))
    echo ""
    
    validate_compose_file || errors=$((errors + 1))
    echo ""
    
    check_running_services || true
    echo ""
    
    check_ports || true
    echo ""
    
    print_summary
    
    if [ $errors -eq 0 ]; then
        echo "=========================================="
        echo -e "${GREEN}All Checks Passed!${NC}"
        echo "=========================================="
        echo ""
        echo "You can now start SeaweedFS services:"
        echo "  docker-compose -f dht-docker-compose.yml up -d"
        echo ""
        echo "After starting, initialize the PostgreSQL schema:"
        echo "  ./scripts/init-seaweedfs.sh"
        echo ""
        exit 0
    else
        echo "=========================================="
        echo -e "${RED}Validation Failed${NC}"
        echo "=========================================="
        echo ""
        echo "Please fix the errors above before deploying SeaweedFS."
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
