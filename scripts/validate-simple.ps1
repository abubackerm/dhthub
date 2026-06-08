# Simple SeaweedFS Configuration Check
$envFile = ".env"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SeaweedFS Quick Validation" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] .env file found" -ForegroundColor Green

# Check required variables in .env
$envContent = Get-Content $envFile -Raw
$missingVars = @()
$requiredVars = @('SEAWEDFS_S3_ACCESS_KEY', 'SEAWEDFS_S3_SECRET_KEY', 'SEAWEDFS_S3_PORT', 'SEAWEDFS_FILER_PORT', 'SEAWEDFS_MASTER_PORT', 'SEAWEDFS_PG_SCHEMA')

foreach ($var in $requiredVars) {
    if ($envContent -notmatch "$var=") {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "[ERROR] Missing variables in .env:" -ForegroundColor Red
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "[SUCCESS] All required variables present in .env" -ForegroundColor Green
Write-Host ""

# Check Docker
try {
    $null = docker version 2>&1
    Write-Host "[SUCCESS] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running" -ForegroundColor Red
    exit 1
}

# Check Docker Compose
$dockerComposeAvailable = $false
try {
    $null = docker-compose version 2>&1
    $dockerComposeAvailable = $true
    Write-Host "[SUCCESS] docker-compose is available" -ForegroundColor Green
} catch {
    try {
        $null = docker compose version 2>&1
        $dockerComposeAvailable = $true
        Write-Host "[SUCCESS] docker compose is available" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Docker Compose not found" -ForegroundColor Red
        exit 1
    }
}

# Check docker-compose.yml
try {
    if ($dockerComposeAvailable) {
        $null = docker-compose -f dht-docker-compose.yml config 2>&1
        Write-Host "[SUCCESS] docker-compose.yml is valid" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] docker-compose.yml has errors" -ForegroundColor Red
    exit 1
}

# Check volumes
$volumes = @('dht-seaweedfs-master-data', 'dht-seaweedfs-volume-1-data', 'dht-seaweedfs-volume-2-data', 'dht-seaweedfs-volume-3-data')
$existingVolumes = docker volume ls --format '{{.Name}}'
$missingVolumes = @()

foreach ($volume in $volumes) {
    if ($existingVolumes -notmatch $volume) {
        $missingVolumes += $volume
    }
}

if ($missingVolumes.Count -gt 0) {
    Write-Host "[WARN] Some volumes missing (will be created automatically)" -ForegroundColor Yellow
    foreach ($volume in $missingVolumes) {
        docker volume create $volume
        Write-Host "  Created: $volume" -ForegroundColor Green
    }
} else {
    Write-Host "[SUCCESS] All volumes exist" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Validation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start SeaweedFS:" -ForegroundColor Green
Write-Host "  docker-compose -f dht-docker-compose.yml up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "After services start, initialize the schema:" -ForegroundColor Green
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\init-seaweedfs.ps1" -ForegroundColor Yellow
Write-Host ""
