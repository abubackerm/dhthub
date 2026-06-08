# ===========================================
# SeaweedFS Configuration Validation Script (PowerShell)
# ===========================================

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SeaweedFS Configuration Validation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0

# Check if .env file exists
Write-Info "Checking .env file..."
if (-not (Test-Path .env)) {
    Write-Warning ".env file not found"
    Write-Info "Creating .env from .env.example..."
    Copy-Item .env.example .env
    Write-Success ".env file created from .env.example"
    Write-Warning "Please update .env with your actual values before starting services"
} else {
    Write-Success ".env file found"
}
Write-Host ""

# Check Docker
Write-Info "Checking Docker..."
try {
    $null = docker version 2>&1
    Write-Success "Docker is available and running"
} catch {
    Write-Error "Docker is not installed or not running"
    $errors++
}
Write-Host ""

# Check Docker Compose
Write-Info "Checking Docker Compose..."
$dockerComposeAvailable = $false
try {
    $null = docker-compose version 2>&1
    Write-Success "docker-compose is available"
    $dockerComposeAvailable = $true
} catch {
    try {
        $null = docker compose version 2>&1
        Write-Success "docker compose is available"
        $dockerComposeAvailable = $true
    } catch {
        Write-Error "Docker Compose is not installed"
        $errors++
    }
}
Write-Host ""

# Load environment variables
Write-Info "Loading environment variables..."
if (Test-Path .env) {
    Get-Content .env | Where-Object { $_ -match '^[A-Za-z_]+=.*' } | ForEach-Object {
        $name, $value = $_ -split '=', 2
        [Environment]::SetEnvironmentVariable($name, $value)
    }
    Write-Success "Environment variables loaded"
}
Write-Host ""

# Check required environment variables
Write-Info "Checking required environment variables..."
$missingVars = @()
$requiredVars = @('SEAWEDFS_S3_ACCESS_KEY', 'SEAWEDFS_S3_SECRET_KEY', 'SEAWEDFS_S3_PORT', 'SEAWEDFS_FILER_PORT', 'SEAWEDFS_MASTER_PORT', 'SEAWEDFS_PG_SCHEMA')
foreach ($var in $requiredVars) {
    $varValue = [Environment]::GetEnvironmentVariable($var)
    if ([string]::IsNullOrEmpty($varValue)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Error "Missing required environment variables:"
    foreach ($var in $missingVars) {
        Write-Host "  - $var"
    }
    $errors++
} else {
    Write-Success "All required environment variables are set"
}
Write-Host ""

# Check Docker network
Write-Info "Checking Docker network..."
try {
    $networks = docker network ls --format '{{.Name}}'
    if ($networks -match 'dht-hub-network') {
        Write-Success "dht-hub-network exists"
    } else {
        Write-Warning "dht-hub-network not found"
    }
} catch {
    Write-Error "Failed to check Docker network"
    $errors++
}
Write-Host ""

# Check Docker volumes
Write-Info "Checking Docker volumes..."
$volumes = @('dht-seaweedfs-master-data', 'dht-seaweedfs-volume-1-data', 'dht-seaweedfs-volume-2-data', 'dht-seaweedfs-volume-3-data')
$existingVolumes = docker volume ls --format '{{.Name}}'
$missingVolumes = @()

foreach ($volume in $volumes) {
    if ($existingVolumes -match $volume) {
        Write-Host "  ✓ $volume exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $volume missing" -ForegroundColor Red
        $missingVolumes += $volume
    }
}

if ($missingVolumes.Count -gt 0) {
    Write-Error "Missing Docker volumes:"
    foreach ($volume in $missingVolumes) {
        Write-Host "  - $volume"
    }
    $errors++
} else {
    Write-Success "All Docker volumes exist"
}
Write-Host ""

# Validate docker-compose.yml
Write-Info "Validating docker-compose configuration..."
$composeValid = $false
if ($dockerComposeAvailable) {
    try {
        $null = docker-compose -f dht-docker-compose.yml config 2>&1
        Write-Success "docker-compose.yml is valid"
        $composeValid = $true
    } catch {
        try {
            $null = docker compose -f dht-docker-compose.yml config 2>&1
            Write-Success "docker-compose.yml is valid"
            $composeValid = $true
        } catch {
            Write-Error "docker-compose.yml has syntax errors"
            $errors++
        }
    }
}
Write-Host ""

# Check running services
Write-Info "Checking for running SeaweedFS services..."
$services = @('dht-seaweedfs-master', 'dht-seaweedfs-volume-1', 'dht-seaweedfs-volume-2', 'dht-seaweedfs-volume-3', 'dht-seaweedfs-filer', 'dht-seaweedfs-s3')
$runningCount = 0
$existingContainers = docker ps --format '{{.Names}}'

foreach ($service in $services) {
    if ($existingContainers -match "^$service$") {
        Write-Host "  ✓ $service is running" -ForegroundColor Green
        $runningCount++
    } else {
        Write-Host "  - $service is not running"
    }
}

if ($runningCount -eq $services.Count) {
    Write-Success "All SeaweedFS services are running"
} elseif ($runningCount -gt 0) {
    Write-Warning "$runningCount/$($services.Count) SeaweedFS services are running"
} else {
    Write-Info "No SeaweedFS services are running"
}
Write-Host ""

# Print summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SeaweedFS Configuration Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$masterPort = [Environment]::GetEnvironmentVariable('SEAWEDFS_MASTER_PORT')
if ([string]::IsNullOrEmpty($masterPort)) { $masterPort = '9333' }

$filerPort = [Environment]::GetEnvironmentVariable('SEAWEDFS_FILER_PORT')
if ([string]::IsNullOrEmpty($filerPort)) { $filerPort = '8888' }

$s3Port = [Environment]::GetEnvironmentVariable('SEAWEDFS_S3_PORT')
if ([string]::IsNullOrEmpty($s3Port)) { $s3Port = '8333' }

$pgSchema = [Environment]::GetEnvironmentVariable('SEAWEDFS_PG_SCHEMA')
if ([string]::IsNullOrEmpty($pgSchema)) { $pgSchema = 'seaweedfs' }

$pgHost = [Environment]::GetEnvironmentVariable('SEAWEDFS_PG_HOST')
if ([string]::IsNullOrEmpty($pgHost)) { $pgHost = 'dht-postgres' }

$pgPort = [Environment]::GetEnvironmentVariable('SEAWEDFS_PG_PORT')
if ([string]::IsNullOrEmpty($pgPort)) { $pgPort = '5432' }

$pgDb = [Environment]::GetEnvironmentVariable('SEAWEDFS_PG_DB')
if ([string]::IsNullOrEmpty($pgDb)) { $pgDb = 'dht_hub' }

Write-Host "SeaweedFS Components:" -ForegroundColor Cyan
Write-Host "  - Master: http://localhost:$masterPort"
Write-Host "  - Volume 1: http://localhost:8080"
Write-Host "  - Volume 2: http://localhost:8081"
Write-Host "  - Volume 3: http://localhost:8082"
Write-Host "  - Filer: http://localhost:$filerPort"
Write-Host "  - S3 API: http://localhost:$s3Port"
Write-Host ""
Write-Host "PostgreSQL Configuration:" -ForegroundColor Cyan
Write-Host "  - Schema: $pgSchema"
Write-Host "  - Host: $pgHost"
Write-Host "  - Port: $pgPort"
Write-Host "  - Database: $pgDb"
Write-Host ""

# Final result
if ($errors -eq 0 -and $composeValid) {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "[SUCCESS] All Checks Passed!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now start SeaweedFS services:" -ForegroundColor Green
    Write-Host "  docker-compose -f dht-docker-compose.yml up -d" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After starting, initialize PostgreSQL schema:" -ForegroundColor Green
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\init-seaweedfs.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 0
} else {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "[ERROR] Validation Failed" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please fix errors above before deploying SeaweedFS." -ForegroundColor Red
    Write-Host ""
    exit 1
}
