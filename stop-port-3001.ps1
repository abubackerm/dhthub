param([int]$Port=3001)
$procId = (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess
if ($procId) {
    Stop-Process -Id $procId -Force
    Write-Output "Stopped process (PID $procId) on port $Port"
} else {
    Write-Output "No process found on port $Port"
}
