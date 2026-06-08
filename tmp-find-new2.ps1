$index = Get-Content 'D:\Projects\Tekhive\dynamic_hub\.cursor\hooks\state\continual-learning-index.json' | ConvertFrom-Json
$indexedIds = $index.transcripts.PSObject.Properties.Name

$newTranscripts = @()
Get-ChildItem 'C:\Users\abuca\.cursor\projects\d-Projects-Tekhive-dynamic-hub\agent-transcripts' -Directory | ForEach-Object {
  $f = Join-Path $_.FullName ($_.Name + '.jsonl')
  if (Test-Path $f) {
    $id = $_.Name
    if ($indexedIds -notcontains $id) {
      $i = Get-Item $f
      $newTranscripts += @{ Id = $id; Ticks = $i.LastWriteTimeUtc.Ticks; Path = $f }
    }
  }
}
$newTranscripts | Sort-Object Ticks -Descending | ForEach-Object { Write-Output "$($_.Id)|$($_.Ticks)|$($_.Path)" }
