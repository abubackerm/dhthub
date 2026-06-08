$index = Get-Content 'D:\Projects\Tekhive\dynamic_hub\.cursor\hooks\state\continual-learning-index.json' | ConvertFrom-Json
$indexedIds = $index.transcripts.PSObject.Properties.Name

Get-ChildItem 'C:\Users\abuca\.cursor\projects\d-Projects-Tekhive-dynamic-hub\agent-transcripts' -Directory | ForEach-Object {
  $f = Join-Path $_.FullName ($_.Name + '.jsonl')
  if (Test-Path $f) {
    $id = $_.Name
    if ($indexedIds -notcontains $id) {
      $i = Get-Item $f
      Write-Output "NEW|$id|$($i.LastWriteTimeUtc.Ticks)"
    } else {
      $indexedMtime = $index.transcripts.$id.mtimeMs
      $i = Get-Item $f
      $currentMtime = $i.LastWriteTimeUtc.Ticks
      # Windows ticks are 100-nanosecond intervals, index mtimeMs needs conversion
      # Index stores mtimeMs as number, file ticks need /10000 to get ms
      if ($currentMtime -gt $indexedMtime) {
        Write-Output "UPDATED|$id|$currentMtime"
      }
    }
  }
}
