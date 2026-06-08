$connections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $connections) {
    if ($procId -ne 0) {
        Write-Output "Killing PID: $procId"
        Stop-Process -Id $procId -Force
    }
}
Write-Output "Done"
