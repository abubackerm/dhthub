param(
    [int]$Interval = 5
)

Write-Host "=== Memory Monitor ===" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Cyan

while ($true) {
    $time = Get-Date -Format "HH:mm:ss"
    Write-Host "[$time] --- Node.js Processes ---" -ForegroundColor Yellow
    
    $procs = Get-Process node* -ErrorAction SilentlyContinue | 
        Select-Object Id, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB, 1)}}, @{N='CPU(s)';E={[math]::Round($_.TotalProcessorTime.TotalSeconds, 1)}}, StartTime |
        Sort-Object WorkingSet64 -Descending
    
    $total = 0
    foreach ($p in $procs) {
        $total += $p.MemMB
        $color = if ($p.MemMB -gt 500) { "Red" } elseif ($p.MemMB -gt 200) { "Yellow" } else { "Gray" }
        Write-Host "  PID $($p.Id): $($p.MemMB) MB (CPU: $($p.'CPU(s)')s)" -ForegroundColor $color
    }
    
    Write-Host "  ---" -ForegroundColor DarkGray
    Write-Host "  TOTAL Node memory: $total MB" -ForegroundColor Cyan
    
    $sys = Get-CimInstance Win32_OperatingSystem
    $avail = [math]::Round($sys.FreePhysicalMemory/1024, 1)
    $totalSys = [math]::Round($sys.TotalVisibleMemorySize/1024, 1)
    Write-Host "  System RAM: $avail GB free / $totalSys GB total" -ForegroundColor Magenta
    Write-Host ""
    
    Start-Sleep -Seconds $Interval
}
