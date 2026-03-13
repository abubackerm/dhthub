# ===========================================
# SeaweedFS PostgreSQL Schema Initialization (PowerShell)
# ===========================================
# This script initializes SeaweedFS filer
# with a dedicated PostgreSQL schema for metadata
# storage.

param(
    [switch]$SkipSchema,
    [switch]$SkipBucket
)

$ErrorActionPreference = "Stop"

# Color output
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

# Load environment variables from .env file
function Load-EnvVariables {
    Write-Info "Loading environment variables from .env"
    
    if (Test-Path .env) {
        Get-Content .env | Where-Object { $_ -match '^[A-Za-z_]+=.*' } | ForEach-Object {
            $name, $value = $_ -split '=', 2
            [Environment]::SetEnvironmentVariable($name, $value)
        }
        Write-Success "Environment variables loaded"
    } else {
        Write-Error ".env file not found"
        Write-Warning "Please create .env file from .env.example"
        return $false
    }
    return $true
}

# Check if PostgreSQL is ready
function Test-PostgresReady {
    Write-Info "Checking PostgreSQL connection..."
    
    try {
        docker exec dht-postgres pg_isready -U $env:POSTGRES_USER -d $env:POSTGRES_DB 2>&1 | Out-Null
        Write-Success "PostgreSQL is ready"
        return $true
    } catch {
        Write-Error "PostgreSQL is not ready"
        return $false
    }
}

# Wait for PostgreSQL to be ready
function Wait-PostgresReady {
    Write-Info "Waiting for PostgreSQL to be ready..."
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        if (Test-PostgresReady) {
            return $true
        }
        Write-Info "Waiting for PostgreSQL... (attempt $attempt/$maxAttempts)"
        Start-Sleep -Seconds 2
        $attempt++
    }
    
    Write-Error "PostgreSQL not ready after $maxAttempts attempts"
    return $false
}

# Create SeaweedFS schema
function New-Schema {
    Write-Info "Creating SeaweedFS schema: $env:SEAWEDFS_PG_SCHEMA"
    
    try {
        $sql = "CREATE SCHEMA IF NOT EXISTS $env:SEAWEDFS_PG_SCHEMA;"
        docker exec dht-postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -c $sql 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Schema $env:SEAWEDFS_PG_SCHEMA created successfully"
            return $true
        } else {
            Write-Error "Failed to create schema $env:SEAWEDFS_PG_SCHEMA"
            return $false
        }
    } catch {
        Write-Error "Failed to create schema: $_"
        return $false
    }
}

# Grant permissions
function Grant-Permissions {
    Write-Info "Granting permissions on schema $env:SEAWEDFS_PG_SCHEMA"
    
    try {
        $sql1 = "GRANT ALL ON SCHEMA $env:SEAWEDFS_PG_SCHEMA TO $env:POSTGRES_USER;"
        $sql2 = "ALTER DEFAULT PRIVILEGES IN SCHEMA $env:SEAWEDFS_PG_SCHEMA GRANT ALL ON TABLES TO $env:POSTGRES_USER;"
        
        docker exec dht-postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -c $sql1 2>&1 | Out-Null
        docker exec dht-postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -c $sql2 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Permissions granted successfully"
            return $true
        } else {
            Write-Error "Failed to grant permissions"
            return $false
        }
    } catch {
        Write-Error "Failed to grant permissions: $_"
        return $false
    }
}

# Verify schema exists
function Test-Schema {
    Write-Info "Verifying schema $env:SEAWEDFS_PG_SCHEMA exists"
    
    try {
        $sql = "SELECT schema_name FROM information_schema.schemata WHERE schema_name = '$env:SEAWEDFS_PG_SCHEMA';"
        $result = docker exec dht-postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -t -c $sql 2>&1 | Out-String
        
        if ($result.Trim() -eq $env:SEAWEDFS_PG_SCHEMA) {
            Write-Success "Schema verification successful"
            return $true
        } else {
            Write-Error "Schema verification failed"
            return $false
        }
    } catch {
        Write-Error "Schema verification failed: $_"
        return $false
    }
}

# Check SeaweedFS cluster health
function Test-SeaweedfsHealth {
    Write-Info "Checking SeaweedFS cluster health..."
    
    # Check master
    try {
        $masterStatus = curl -s -f "http://localhost:$env:SEAWEDFS_MASTER_PORT/cluster/status" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Master server is healthy"
        } else {
            Write-Warning "Master server may not be fully ready yet"
        }
    } catch {
        Write-Warning "curl not available, skipping master health check"
    }
    
    # Check filer
    try {
        $null = curl -s -f "http://localhost:$env:SEAWEDFS_FILER_PORT/healthz" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Filer server is healthy"
        } else {
            Write-Warning "Filer server may not be ready yet"
        }
    } catch {
        Write-Warning "curl not available, skipping filer health check"
    }
    
    # Check S3 gateway
    try {
        $null = curl -s -f "http://localhost:$env:SEAWEDFS_S3_PORT/healthz" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "S3 gateway is healthy"
        } else {
            Write-Warning "S3 gateway may not be ready yet"
        }
    } catch {
        Write-Warning "curl not available, skipping S3 health check"
    }
}

# Create default S3 bucket
function New-DefaultBucket {
    $s3Endpoint = "http://localhost:$env:SEAWEDFS_S3_PORT"
    $defaultBucket = $env:SEAWEDFS_DEFAULT_BUCKET
    if ([string]::IsNullOrEmpty($defaultBucket)) {
        $defaultBucket = "dht-hub"
    }
    
    if ([string]::IsNullOrEmpty($env:SEAWEDFS_S3_ACCESS_KEY) -or 
        [string]::IsNullOrEmpty($env:SEAWEDFS_S3_SECRET_KEY)) {
        Write-Warning "S3 credentials not provided, skipping bucket creation"
        return
    }
    
    Write-Info "Creating default S3 bucket: $defaultBucket"
    
    # Check if AWS CLI is available
    $awsAvailable = Get-Command aws -ErrorAction SilentlyContinue
    $mcAvailable = Get-Command mc -ErrorAction SilentlyContinue
    
    if ($awsAvailable) {
        Write-Info "Using AWS CLI to create bucket..."
        
        $env:AWS_ACCESS_KEY_ID = $env:SEAWEDFS_S3_ACCESS_KEY
        $env:AWS_SECRET_ACCESS_KEY = $env:SEAWEDFS_S3_SECRET_KEY
        $env:AWS_DEFAULT_REGION = "us-east-1"
        $env:AWS_ENDPOINT_URL = $s3Endpoint
        
        aws s3 mb "s3://$defaultBucket" --endpoint-url=$s3Endpoint 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Default bucket created successfully"
        } else {
            Write-Warning "Bucket may already exist or creation failed"
        }
    } elseif ($mcAvailable) {
        Write-Info "Using MinIO Client (mc) to create bucket..."
        
        mc alias set dht $s3Endpoint $env:SEAWEDFS_S3_ACCESS_KEY $env:SEAWEDFS_S3_SECRET_KEY 2>&1 | Out-Null
        mc mb "dht/$defaultBucket" 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Default bucket created successfully"
        } else {
            Write-Warning "Bucket may already exist or creation failed"
        }
    } else {
        Write-Warning "Neither AWS CLI nor MinIO Client (mc) is available"
        Write-Info "You can create bucket manually using AWS CLI or mc"
    }
}

# Main execution
function Main {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "SeaweedFS PostgreSQL Schema Initialization" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Load environment variables
    if (-not (Load-EnvVariables)) {
        exit 1
    }
    
    # Wait for PostgreSQL
    if (-not (Wait-PostgresReady)) {
        exit 1
    }
    
    Write-Host ""
    
    # Create schema
    if (-not $SkipSchema) {
        if (-not (New-Schema)) { exit 1 }
        Write-Host ""
        
        # Grant permissions
        if (-not (Grant-Permissions)) { exit 1 }
        Write-Host ""
        
        # Verify schema
        if (-not (Test-Schema)) { exit 1 }
        Write-Host ""
    } else {
        Write-Warning "Skipping schema creation (SkipSchema flag set)"
        Write-Host ""
    }
    
    # Check SeaweedFS health
    Test-SeaweedfsHealth
    Write-Host ""
    
    # Create default bucket
    if (-not $SkipBucket) {
        New-DefaultBucket
        Write-Host ""
    } else {
        Write-Warning "Skipping bucket creation (SkipBucket flag set)"
        Write-Host ""
    }
    
    # Summary
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Success "Initialization Complete!"
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Schema Information:" -ForegroundColor Cyan
    Write-Host "  - Schema: $env:SEAWEDFS_PG_SCHEMA"
    Write-Host "  - Database: $env:SEAWEDFS_PG_DB"
    Write-Host "  - Host: $env:SEAWEDFS_PG_HOST`:$env:SEAWEDFS_PG_PORT"
    Write-Host ""
    Write-Host "SeaweedFS Endpoints:" -ForegroundColor Cyan
    Write-Host "  - Master: http://localhost:$env:SEAWEDFS_MASTER_PORT"
    Write-Host "  - Filer: http://localhost:$env:SEAWEDFS_FILER_PORT"
    Write-Host "  - S3 API: http://localhost:$env:SEAWEDFS_S3_PORT"
    Write-Host ""
    Write-Host "Benefits of Separate Schema:" -ForegroundColor Green
    Write-Host "  - Cleaner organization"
    Write-Host "  - Easier backups/restore"
    Write-Host "  - Better security"
    Write-Host "  - No naming conflicts"
    Write-Host ""
}

# Run main function
Main
