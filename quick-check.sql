-- Quick check for variant_images
SELECT COUNT(*) as total_images FROM variant_images;

-- Check for SKU 91578A204 specifically
SELECT
  id,
  sku,
  position,
  is_primary,
  storage_path,
  created_at
FROM variant_images
WHERE sku = '91578A204'
ORDER BY position;

-- Check if SKU 91578A204 exists in product_variants
SELECT id, sku, product_id
FROM product_variants
WHERE sku = '91578A204';
