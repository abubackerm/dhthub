# Stress Test Script - 50 Concurrent Users
# Tests product catalog, search, and variant loading

param(
    [string]$ApiUrl = "http://localhost:3000/v1",
    [int]$ConcurrentUsers = 50,
    [int]$RequestsPerUser = 10
)

$TotalRequests = $ConcurrentUsers * $RequestsPerUser

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Stress Test Configuration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl"
Write-Host "Concurrent Users: $ConcurrentUsers"
Write-Host "Requests per User: $RequestsPerUser"
Write-Host "Total Requests: $TotalRequests"
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Function to run a single user session
function Run-UserSession {
    param(
        [int]$UserId
    )
    
    $ResultsPath = "$env:TEMP\stress_test_user_${UserId}.log"
    $UserStartTime = Get-Date
    
    "User $UserId starting session at $($UserStartTime)" | Out-File -FilePath $ResultsPath
    
    for ($i = 1; $i -le $RequestsPerUser; $i++) {
        $rand = Get-Random -Minimum 0 -Maximum 10
        $endpoint = ""
        $url = ""
        
        # Randomly choose endpoint to test (simulates real user behavior)
        switch ($rand) {
            {$_ -in 0,1,2} { # 30% - Browse products (paginated)
                $page = Get-Random -Minimum 1 -Maximum 101
                $endpoint = "GET /catalog/products?page=$page"
                $url = "${ApiUrl}/catalog/products?page=$page"
            }
            {$_ -in 3,4} { # 20% - View product details
                $productId = Get-Random -Minimum 1 -Maximum 10001
                $endpoint = "GET /catalog/products/$productId"
                $url = "${ApiUrl}/catalog/products/$productId"
            }
            5 { # 10% - Search products
                $searchTerms = @("phone", "laptop", "camera", "watch", "headphones", "tablet")
                $search = $searchTerms[(Get-Random -Maximum 6)]
                $endpoint = "GET /catalog/products?search=$search"
                $url = "${ApiUrl}/catalog/products?search=$search"
            }
            {$_ -in 6,7} { # 20% - Browse by category
                $categoryId = Get-Random -Minimum 1 -Maximum 51
                $endpoint = "GET /catalog/products?categoryId=$categoryId"
                $url = "${ApiUrl}/catalog/products?categoryId=$categoryId"
            }
            {$_ -in 8,9} { # 20% - Browse cells
                $endpoint = "GET /catalog/cells"
                $url = "${ApiUrl}/catalog/cells"
            }
        }
        
        # Make request with timing
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        try {
            $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -ErrorAction Stop
            $httpCode = $response.StatusCode
            $status = "SUCCESS"
            $color = "Green"
        }
        catch {
            $httpCode = $_.Exception.Response.StatusCode.value__
            $status = "FAILED"
            $color = "Red"
        }
        
        $stopwatch.Stop()
        $duration = $stopwatch.ElapsedMilliseconds
        
        # Log result
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        if ($status -eq "FAILED" -and $httpCode -ne 404) {
            Write-Host "User $UserId: $endpoint - $status (HTTP $httpCode) - ${duration}ms" -ForegroundColor Red
        }
        else {
            Write-Host "User $UserId: $endpoint - $status - ${duration}ms" -ForegroundColor Green
        }
        
        "$timestamp|$endpoint|$status|$httpCode|${duration}ms" | Out-File -FilePath $ResultsPath -Append
        
        # Small random delay between requests (simulates real user think time)
        Start-Sleep -Milliseconds (Get-Random -Minimum 100 -Maximum 500)
    }
    
    "User $UserId session completed at $(Get-Date)" | Out-File -FilePath $ResultsPath -Append
}

Write-Host "Starting stress test with $ConcurrentUsers concurrent users..."
Write-Host ""

# Create array to hold all jobs
$jobs = @()

# Start all user sessions in parallel
for ($i = 1; $i -le $ConcurrentUsers; $i++) {
    $job = Start-Job -ScriptBlock ${function:Run-UserSession} -ArgumentList $i
    $jobs += $job
}

Write-Host "All user sessions started. Waiting for completion..."
Write-Host ""

# Wait for all jobs to complete
$jobs | Wait-Job | Out-Null

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Stress Test Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Aggregate results
Write-Host "Aggregating results..." -ForegroundColor Yellow

$totalRequests = 0
$successRequests = 0
$failedRequests = 0
$totalTime = 0
$maxTime = 0
$minTime = [int]::MaxValue

for ($i = 1; $i -le $ConcurrentUsers; $i++) {
    $resultsPath = "$env:TEMP\stress_test_user_${i}.log"
    
    if (Test-Path $resultsPath) {
        $lines = Get-Content $resultsPath
        
        foreach ($line in $lines) {
            if ($line -match '\|') {
                $parts = $line -split '\|'
                
                if ($parts.Count -ge 5 -and $parts[2] -match '^(SUCCESS|FAILED)$') {
                    $totalRequests++
                    $status = $parts[2]
                    $httpCode = $parts[3]
                    $timeStr = $parts[4]
                    
                    # Extract time value
                    if ($timeStr -match '(\d+)') {
                        $timeMs = [int]$matches[1]
                        
                        if ($status -eq "SUCCESS") {
                            $successRequests++
                            $totalTime += $timeMs
                            
                            if ($timeMs -gt $maxTime) {
                                $maxTime = $timeMs
                            }
                            
                            if ($timeMs -lt $minTime) {
                                $minTime = $timeMs
                            }
                        }
                        else {
                            $failedRequests++
                        }
                    }
                }
            }
        }
    }
}

# Calculate averages
if ($successRequests -gt 0) {
    $avgTime = [math]::Round($totalTime / $successRequests, 2)
}
else {
    $avgTime = 0
}

$successRate = [math]::Round(($successRequests * 100.0 / $totalRequests), 2)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Total Requests: $totalRequests"
Write-Host "Successful: $successRequests"
Write-Host "Failed: $failedRequests"
Write-Host "Success Rate: ${successRate}%"
Write-Host ""
Write-Host "Response Times:"
Write-Host "  Average: ${avgTime}ms"
Write-Host "  Min: ${minTime}ms"
Write-Host "  Max: ${maxTime}ms"
Write-Host ""

# Check for SLA breaches
if ($successRate -lt 95) {
    Write-Host "❌ SLA BREACH: Success rate below 95%" -ForegroundColor Red
    Write-Host "Recommendations:"
    Write-Host "  1. Check database connection pool size"
    Write-Host "  2. Add database indexes for slow queries"
    Write-Host "  3. Consider caching frequently accessed data"
    Write-Host "  4. Scale up server resources"
}
else {
    Write-Host "✅ Success rate meets 95% SLA" -ForegroundColor Green
}

if ($avgTime -gt 1000) {
    Write-Host "⚠️  WARNING: Average response time > 1s" -ForegroundColor Yellow
    Write-Host "Recommendations:"
    Write-Host "  1. Profile slow database queries"
    Write-Host "  2. Add Redis caching for product listings"
    Write-Host "  3. Optimize database queries"
    Write-Host "  4. Consider CDN for static assets"
}
else {
    Write-Host "✅ Response time within acceptable range" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Cleanup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$cleanup = Read-Host "Remove temporary log files? (y/n)"

if ($cleanup -eq 'y') {
    Remove-Item -Path "$env:TEMP\stress_test_user_*.log" -Force
    Write-Host "Cleanup complete"
}

Write-Host ""
Write-Host "Detailed logs available in $env:TEMP\stress_test_user_*.log"

# Clean up jobs
$jobs | Remove-Job -Force
