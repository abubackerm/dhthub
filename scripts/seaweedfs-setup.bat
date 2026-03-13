@echo off
REM ===========================================
REM SeaweedFS Setup for Windows
REM ===========================================
REM This script helps you set up SeaweedFS on Windows

echo ==========================================
echo SeaweedFS Setup for Windows
echo ==========================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [INFO] .env file not found
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env
    echo [SUCCESS] .env file created
    echo.
    echo [WARNING] Please update .env with your actual values before continuing!
    echo.
    pause
    exit /b 1
)

echo [SUCCESS] .env file found
echo.

echo ==========================================
echo Step 1: Validate Configuration
echo ==========================================
echo.

powershell -ExecutionPolicy Bypass -File scripts\validate-seaweedfs-config.ps1

if errorlevel 1 (
    echo.
    echo [ERROR] Validation failed. Please fix errors above.
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Step 2: Start SeaweedFS Services
echo ==========================================
echo.

echo Starting SeaweedFS services...
docker-compose -f dht-docker-compose.yml up -d

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start services.
    echo.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Services started
echo.
echo Waiting 10 seconds for services to initialize...
timeout /t 10 /nobreak

echo.
echo ==========================================
echo Step 3: Initialize PostgreSQL Schema
echo ==========================================
echo.

powershell -ExecutionPolicy Bypass -File scripts\init-seaweedfs.ps1

if errorlevel 1 (
    echo.
    echo [ERROR] Initialization failed.
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo SeaweedFS is now running and ready to use.
echo.
echo To verify the deployment:
echo   curl http://localhost:9333/cluster/status
echo   curl http://localhost:8333/healthz
echo.
echo For more information, see docs\seaweedfs-quick-reference.md
echo.
pause
