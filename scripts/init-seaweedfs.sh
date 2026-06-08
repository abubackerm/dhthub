#!/bin/bash

# ===========================================
# SeaweedFS PostgreSQL Schema Initialization
# ===========================================
# This script initializes the SeaweedFS filer
# with a dedicated PostgreSQL schema for metadata
# storage.

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables if .env exists
if [ -f .env ]; then
    echo -e "${GREEN}Loading environment variables from .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default values (can be overridden by environment variables)
POSTGRES_HOST="${SEAWEDFS_PG_HOST:-localhost}"
POSTGRES_PORT="${SEAWEDFS_PG_PORT:-5432}"
POSTGRES_USER="${SEAWEDFS_PG_USER:-postgres}"
POSTGRES_PASSWORD="${SEAWEDFS_PG_PASSWORD:-}"
POSTGRES_DB="${SEAWEDFS_PG_DB:-postgres}"
SEAWEDFS_SCHEMA="${SEAWEDFS_PG_SCHEMA:-seaweedfs}"

S3_ENDPOINT="${SEAWEDFS_S3_ENDPOINT:-http://localhost:8333}"
S3_ACCESS_KEY="${SEAWEDFS_S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${SEAWEDFS_S3_SECRET_KEY:-}"
DEFAULT_BUCKET="${SEAWEDFS_DEFAULT_BUCKET:-dht-hub}"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if PostgreSQL is ready
check_postgres() {
    print_info "Checking PostgreSQL connection..."
    
    if command -v psql &> /dev/null; then
        # Use psql if available
        PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c '\q' 2>/dev/null
    elif command -v docker &> /dev/null; then
        # Use docker if PostgreSQL is in container
        docker exec dht-postgres pg_isready -U $POSTGRES_USER -d $POSTGRES_DB &> /dev/null
    else
        print_error "Neither psql nor docker is available to check PostgreSQL connection"
        return 1
    fi
    
    if [ $? -eq 0 ]; then
        print_info "PostgreSQL is ready"
        return 0
    else
        print_error "PostgreSQL is not ready"
        return 1
    fi
}

# Function to create SeaweedFS schema
create_schema() {
    print_info "Creating SeaweedFS schema: $SEAWEDFS_SCHEMA"
    
    local sql="CREATE SCHEMA IF NOT EXISTS $SEAWEDFS_SCHEMA;"
    
    if command -v psql &> /dev/null; then
        PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "$sql"
    else
        docker exec dht-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "$sql"
    fi
    
    if [ $? -eq 0 ]; then
        print_info "Schema $SEAWEDFS_SCHEMA created successfully"
    else
        print_error "Failed to create schema $SEAWEDFS_SCHEMA"
        return 1
    fi
}

# Function to grant permissions
grant_permissions() {
    print_info "Granting permissions on schema $SEAWEDFS_SCHEMA"
    
    local sql="GRANT ALL ON SCHEMA $SEAWEDFS_SCHEMA TO $POSTGRES_USER;"
    local sql2="ALTER DEFAULT PRIVILEGES IN SCHEMA $SEAWEDFS_SCHEMA GRANT ALL ON TABLES TO $POSTGRES_USER;"
    
    if command -v psql &> /dev/null; then
        PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "$sql"
        PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -c "$sql2"
    else
        docker exec dht-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "$sql"
        docker exec dht-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "$sql2"
    fi
    
    if [ $? -eq 0 ]; then
        print_info "Permissions granted successfully"
    else
        print_error "Failed to grant permissions"
        return 1
    fi
}

# Function to verify schema
verify_schema() {
    print_info "Verifying schema $SEAWEDFS_SCHEMA exists"
    
    local sql="SELECT schema_name FROM information_schema.schemata WHERE schema_name = '$SEAWEDFS_SCHEMA';"
    
    if command -v psql &> /dev/null; then
        local result=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "$sql" | tr -d ' ')
    else
        local result=$(docker exec dht-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -t -c "$sql" | tr -d ' ')
    fi
    
    if [ "$result" = "$SEAWEDFS_SCHEMA" ]; then
        print_info "Schema verification successful"
        return 0
    else
        print_error "Schema verification failed"
        return 1
    fi
}

# Function to check SeaweedFS cluster health
check_seaweedfs_health() {
    print_info "Checking SeaweedFS cluster health..."
    
    # Check master
    if command -v curl &> /dev/null; then
        local master_status=$(curl -s -f http://localhost:${SEAWEDFS_MASTER_PORT:-9333}/cluster/status 2>/dev/null | jq -r '.isLeader' 2>/dev/null || echo "false")
        if [ "$master_status" = "true" ] || [ "$master_status" != "false" ]; then
            print_info "Master server is healthy"
        else
            print_warning "Master server may not be fully ready yet"
        fi
    else
        print_warning "curl not available, skipping health check"
    fi
    
    # Check filer
    if command -v curl &> /dev/null; then
        curl -s -f http://localhost:${SEAWEDFS_FILER_PORT:-8888}/healthz &> /dev/null
        if [ $? -eq 0 ]; then
            print_info "Filer server is healthy"
        else
            print_warning "Filer server may not be ready yet"
        fi
    fi
    
    # Check S3 gateway
    if command -v curl &> /dev/null; then
        curl -s -f http://localhost:${SEAWEDFS_S3_PORT:-8333}/healthz &> /dev/null
        if [ $? -eq 0 ]; then
            print_info "S3 gateway is healthy"
        else
            print_warning "S3 gateway may not be ready yet"
        fi
    fi
}

# Function to create default S3 bucket
create_default_bucket() {
    if [ -z "$S3_ACCESS_KEY" ] || [ -z "$S3_SECRET_KEY" ]; then
        print_warning "S3 credentials not provided, skipping bucket creation"
        return 0
    fi
    
    print_info "Creating default S3 bucket: $DEFAULT_BUCKET"
    
    if command -v aws &> /dev/null; then
        export AWS_ACCESS_KEY_ID=$S3_ACCESS_KEY
        export AWS_SECRET_ACCESS_KEY=$S3_SECRET_KEY
        export AWS_ENDPOINT_URL=$S3_ENDPOINT
        
        aws s3 mb s3://$DEFAULT_BUCKET --endpoint-url=$S3_ENDPOINT 2>/dev/null || print_warning "Bucket may already exist or creation failed"
        
        if [ $? -eq 0 ]; then
            print_info "Default bucket created successfully"
        else
            print_warning "Bucket creation may have failed (bucket may already exist)"
        fi
    elif command -v mc &> /dev/null; then
        mc alias set dht $S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY
        mc mb dht/$DEFAULT_BUCKET 2>/dev/null || print_warning "Bucket may already exist or creation failed"
        
        if [ $? -eq 0 ]; then
            print_info "Default bucket created successfully"
        else
            print_warning "Bucket creation may have failed (bucket may already exist)"
        fi
    else
        print_warning "Neither AWS CLI nor MinIO Client (mc) is available, skipping bucket creation"
        print_info "You can create the bucket manually using AWS CLI or mc"
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "SeaweedFS PostgreSQL Schema Initialization"
    echo "=========================================="
    echo ""
    
    # Wait for PostgreSQL
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if check_postgres; then
            break
        fi
        print_info "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "PostgreSQL not ready after $max_attempts attempts"
        exit 1
    fi
    
    echo ""
    
    # Create schema
    create_schema || exit 1
    echo ""
    
    # Grant permissions
    grant_permissions || exit 1
    echo ""
    
    # Verify schema
    verify_schema || exit 1
    echo ""
    
    # Check SeaweedFS health
    check_seaweedfs_health
    echo ""
    
    # Create default bucket
    create_default_bucket
    echo ""
    
    # Summary
    echo "=========================================="
    echo -e "${GREEN}Initialization Complete!${NC}"
    echo "=========================================="
    echo ""
    echo "Schema Information:"
    echo "  - Schema: $SEAWEDFS_SCHEMA"
    echo "  - Database: $POSTGRES_DB"
    echo "  - Host: $POSTGRES_HOST:$POSTGRES_PORT"
    echo ""
    echo "SeaweedFS Endpoints:"
    echo "  - Master: http://localhost:${SEAWEDFS_MASTER_PORT:-9333}"
    echo "  - Filer: http://localhost:${SEAWEDFS_FILER_PORT:-8888}"
    echo "  - S3 API: $S3_ENDPOINT"
    echo ""
    echo "Benefits of Separate Schema:"
    echo "  - Cleaner organization"
    echo "  - Easier backups/restore"
    echo "  - Better security"
    echo "  - No naming conflicts"
    echo ""
}

# Run main function
main "$@"
