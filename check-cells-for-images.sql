-- Check all cells in database
-- This will show you what cell slugs exist so you can name your images correctly

SELECT
  id,
  slug,
  name,
  imageUrl
FROM "Cell"
ORDER BY slug
LIMIT 50;

-- Expected image filenames for cells (based on actual slugs from above):
-- images/cell/<actual-slug-here>-1.jpg
-- images/cell/<actual-slug-here>-1.png

-- Example:
-- If you have a cell with slug "men-t-shirts", your image should be:
-- images/cell/men-t-shirts-1.jpg
