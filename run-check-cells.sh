# Run this to check what cell slugs exist in your database
# Make sure you have psql installed and have DATABASE_URL set

psql $DATABASE_URL -f check-cells-for-images.sql

# OR if you want to check products too:
echo "SELECT id, slug FROM Product ORDER BY slug LIMIT 50;" | psql $DATABASE_URL
