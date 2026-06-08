DROP TABLE IF EXISTS _tmp_csv_names;
CREATE TEMP TABLE _tmp_csv_names (sku TEXT, name TEXT, cell TEXT);
\copy _tmp_csv_names(sku, name, cell) FROM '/tmp/check_categories_data.csv' WITH (FORMAT csv, HEADER true);

-- How many unique names in the CSV?
SELECT 'unique_csv_names' AS metric, COUNT(DISTINCT name) AS val FROM _tmp_csv_names
UNION ALL
SELECT 'total_csv_rows', COUNT(*) FROM _tmp_csv_names
UNION ALL
SELECT 'total_categories_in_db', (SELECT COUNT(*) FROM categories);

-- How many CSV names exist MORE THAN ONCE in the categories table?
-- (this proves global dedup is swallowing duplicates)
SELECT 'duplicate_db_matches' AS metric, COUNT(*) AS val
FROM (
  SELECT c.name
  FROM _tmp_csv_names t
  JOIN categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(t.name))
  GROUP BY c.name
  HAVING COUNT(*) > 1
) dupes;

-- Show the top duplicate names and their DB count
SELECT c.name, COUNT(*) AS times_matched_in_db, STRING_AGG(DISTINCT p.name, ', ') AS parent_categories
FROM _tmp_csv_names t
JOIN categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(t.name))
LEFT JOIN categories p ON c.parent_id = p.id
GROUP BY c.name
HAVING COUNT(*) > 1
ORDER BY times_matched_in_db DESC
LIMIT 30;

-- The key question: how many CSV rows map to the SAME slug?
SELECT 'csv_rows_mapping_to_same_slug' AS metric, COUNT(*) AS val
FROM (
  SELECT t.name, t.sku AS csv_parent_sku, c.id AS matched_category_id, c.parent_id AS actual_parent_id
  FROM _tmp_csv_names t
  JOIN categories c ON LOWER(TRIM(c.name)) = LOWER(TRIM(t.name))
  GROUP BY t.name, t.sku, c.id, c.parent_id
) mappings;

-- How many unique slugs would be created from the 753 rows?
SELECT 'unique_slugs_from_csv' AS metric, COUNT(DISTINCT slug) AS val
FROM (
  SELECT LOWER(REGEXP_REPLACE(REPLACE(REPLACE(name, ',', ''), ' ', '-', 'g'), '[^a-z0-9-]', '', 'g')) AS slug
  FROM _tmp_csv_names
) slugs;

DROP TABLE _tmp_csv_names;
