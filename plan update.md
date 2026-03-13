1️⃣ Add Import Job Listing API

Right now the plan includes:

GET /import/jobs/:id

But admins also need to see all import jobs.

Add endpoint:

GET /import/jobs

Response example:

{
  "jobs":[
    {
      "id":"IMP-2026-0041",
      "fileName":"bolts.csv",
      "status":"RUNNING",
      "total":50000,
      "processed":31200,
      "successCount":30998,
      "errorCount":202,
      "createdAt":"..."
    }
  ]
}

This will allow building a Job History screen later.

2️⃣ Add Job Cancellation

When importing 100k rows, mistakes happen.

Add endpoint:

POST /import/jobs/:id/cancel

Worker behavior:

job status → CANCELLED
stop processing remaining rows

This prevents wasting CPU and DB writes.

3️⃣ Add File Size Protection

CSV uploads can easily reach 200–500MB.

Add validation:

maxFileSize = 200MB
maxRows = 500k

Return error:

CSV file too large

This prevents server crashes.

4️⃣ Store Original Uploaded File

Right now the plan only processes the CSV.

Also store it:

MinIO

Example path:

imports/2026/03/IMP-0041.csv

Benefits:

debug imports
re-run jobs
audit trail
5️⃣ Add Import Metrics Table

Instead of recalculating counts every time, store them in the job record.

Example table fields:

processed
successCount
errorCount
totalRows
startedAt
completedAt

This makes the progress endpoint much faster.

Final Recommended Backend Endpoints

Your import API should now look like this:

GET  /import/template
GET  /import/jobs
GET  /import/jobs/:id
GET  /import/jobs/:id/errors

POST /import/jobs
POST /import/jobs/:id/cancel