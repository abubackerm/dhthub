-- Reset stuck image import job
UPDATE import_jobs
SET status = 'COMPLETED',
    finished_at = NOW(),
    processed_rows = 4,
    success_rows = 4,
    failed_rows = 0,
    locked_at = NULL,
    locked_by = NULL
WHERE id = '67e544ff-2cd5-427a-8474-eb154e41a90c';

-- Check result
SELECT id, status, processed_rows, success_rows, finished_at
FROM import_jobs
WHERE id = '67e544ff-2cd5-427a-8474-eb154e41a90c';
