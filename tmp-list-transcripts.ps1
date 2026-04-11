Get-ChildItem 'C:\Users\abuca\.cursor\projects\d-Projects-Tekhive-dynamic-hub\agent-transcripts' -Directory | ForEach-Object {
  $f = Join-Path $_.FullName ($_.Name + '.jsonl')
  if (Test-Path $f) {
    $i = Get-Item $f
    Write-Output ($_.Name + '|' + $i.LastWriteTimeUtc.Ticks)
  }
}
