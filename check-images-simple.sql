-- Check if SKU 91578A204 exists
SELECT id, sku, name, product_id
FROM product_variants
WHERE sku = '91578A204';

-- Check all variant images
SELECT id, sku, variant_id, position, is_primary, storage_path, created_at
FROM variant_images
ORDER BY created_at DESC
LIMIT 20;

-- Check images for SKU 91578A204 specifically
SELECT id, sku, variant_id, position, is_primary, storage_path, created_at
FROM variant_images
WHERE sku = '91578A204'
ORDER BY position;
