-- Fix category_images: strip full URLs to relative paths
-- Before: http://localhost:8333/catalog/product-images/c472/...
-- After:  /product-images/c472/...
UPDATE "category_images"
SET "storage_path" = REGEXP_REPLACE("storage_path", '^https?://[^/]+/catalog', '')
WHERE "storage_path" LIKE 'http%';

-- Fix cell_images: strip full URLs to relative paths
UPDATE "cell_images"
SET "storage_path" = REGEXP_REPLACE("storage_path", '^https?://[^/]+/catalog', '')
WHERE "storage_path" LIKE 'http%';

-- Fix product_images: strip full URLs to relative paths
UPDATE "product_images"
SET url = REGEXP_REPLACE(url, '^https?://[^/]+/catalog', '')
WHERE url LIKE 'http%';
