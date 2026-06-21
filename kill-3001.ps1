$id = (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue).OwningProcess
if ($id) {
  Stop-Process -Id $id -Force | Out-Null
  Write-Output "Stopped process on port 3001 (PID: $id)"
} else {
  Write-Output "Nothing running on port 3001"
}
