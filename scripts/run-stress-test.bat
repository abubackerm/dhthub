@echo off
REM Simple wrapper to run stress test on Windows

echo ========================================
echo Dynamic Hub Stress Test
echo ========================================
echo.

REM Check if API is running
echo Checking if API is running...
curl -s http://localhost:3000/v1/catalog/products?limit=1 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: API not running at http://localhost:3000
    echo.
    echo Please start the API server first:
    echo   pnpm dev:api
    echo.
    pause
    exit /b 1
)

echo API is running!
echo.

REM Ask user for test parameters
set /p concurrent="Enter number of concurrent users (default 50): "
if "%concurrent%"=="" set concurrent=50

set /p requests="Enter requests per user (default 10): "
if "%requests%"=="" set requests=10

echo.
echo Starting stress test with %concurrent% users, %requests% requests each...
echo Total requests: %concurrent% * %requests% = %concurrent% * %requests%
echo.
pause

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0stress-test.ps1" -ConcurrentUsers %concurrent% -RequestsPerUser %requests%

echo.
echo ========================================
echo Stress Test Complete!
echo ========================================
echo.
pause
