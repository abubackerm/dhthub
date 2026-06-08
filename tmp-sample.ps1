$transcripts = @(
  "ba4b7c13-0de5-4fc3-8ba5-eed7a01122c8",
  "e638f540-5497-4203-ac56-19e6fabc9368",
  "458c8b70-06c1-4650-85b9-6143bb48f1d5",
  "961c8b29-82e9-4054-9170-486c537bec05",
  "9153b567-59e9-4eb8-a4d5-fa9e4b65598c",
  "9658561e-0731-47bb-a4fe-5ee3136ada01",
  "44eaf46c-713c-4a38-b7c2-e0e466c1074f",
  "4ba3d8bf-72cb-45b4-b15c-4b7cf6bf969e",
  "4f7dc771-1294-4dfb-90ae-6eca3b9632d6",
  "012121fe-e414-479a-a29a-9460d2b44d3a",
  "253477d0-f8ed-4e4f-8944-4dc0fd28fdd7",
  "1214b965-3d55-47de-b1c6-60ac57e49774",
  "2cd05ad9-8361-48ea-92d1-9e7d6a1711d8",
  "1697873f-d13c-49c4-8731-23213f3168f2",
  "bef0e912-53ce-461f-9cce-2e63fb6e7643",
  "7d21d30e-b9ff-424a-8610-8da37355874d",
  "cc66de5b-dae7-49f1-8193-2e820e7a170a",
  "f91352b2-63f9-4451-b7ed-547472280dda",
  "99f23d4a-a437-42ef-ba77-4266793906a0",
  "d37d0e65-3277-40ee-b53c-bf18a401f34a",
  "d51a1ebe-860e-4db0-8641-536ba5559bc5",
  "3051d0ff-f499-45b0-a277-2dff569fcc86",
  "2c100d2e-693f-4918-8dfd-c9b1fb2d382a",
  "4ec6a77f-9483-47ca-886b-9907edffec91",
  "74dc8b01-cd3d-43b7-8d10-6d4a44a9fc22",
  "8d598556-d782-4763-b321-a28fb4982753"
)

foreach ($id in $transcripts) {
  $f = "C:\Users\abuca\.cursor\projects\d-Projects-Tekhive-dynamic-hub\agent-transcripts\$id\$id.jsonl"
  if (Test-Path $f) {
    $size = (Get-Item $f).Length
    # Read first line to get the initial user message
    $firstLine = Get-Content $f -TotalCount 1 -ErrorAction SilentlyContinue
    if ($firstLine) {
      # Try to extract a short summary from the first JSON line
      try {
        $json = $firstLine | ConvertFrom-Json
        $content = ""
        if ($json.content) {
          foreach ($part in $json.content) {
            if ($part.text) {
              $content += $part.text.Substring(0, [Math]::Min(200, $part.text.Length))
              break
            }
          }
        }
        Write-Output "=== $id ($size bytes) ==="
        Write-Output $content
        Write-Output ""
      } catch {
        Write-Output "=== $id ($size bytes) === (parse error)"
        Write-Output ""
      }
    }
  }
}
