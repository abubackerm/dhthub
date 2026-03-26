-- Check cells data including SKU and imageUrl
SELECT
  id,
  name,
  slug,
  sku,
  image_url,
  category_id,
  is_active,
  sort_order
FROM cells
ORDER BY sort_order, name
LIMIT 10;

-- Check categories data including SKU and imageUrl
SELECT
  id,
  name,
  slug,
  sku,
  image_url,
  parent_id,
  is_active,
  sort_order
FROM categories
WHERE name = 'Hardware' OR parent_id IS NULL
ORDER BY sort_order, name
LIMIT 10;

-- Check cell images
SELECT
  id,
  cell_id,
  sku,
  storage_path,
  position,
  is_primary
FROM cell_images
LIMIT 10;
