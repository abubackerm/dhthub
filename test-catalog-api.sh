#!/bin/bash

# Test Catalog API Endpoints

# Base URL
BASE_URL="http://localhost:3001"

echo "=== Testing Catalog API ==="

# 1. Create a category
echo ""
echo "1. Creating a category..."
CATEGORY_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/catalog/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fasteners",
    "slug": "fasteners",
    "description": "Bolts, screws, nuts, and washers"
  }')

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.id')
echo "Created category with ID: $CATEGORY_ID"

# 2. Create a variable product
echo ""
echo "2. Creating a variable product..."
PRODUCT_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/catalog/products" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Hex Bolt\",
    \"type\": \"variable\",
    \"categoryId\": \"$CATEGORY_ID\",
    \"description\": \"Hexagonal head bolts in various sizes\"
  }")

PRODUCT_ID=$(echo $PRODUCT_RESPONSE | jq -r '.id')
PRODUCT_SLUG=$(echo $PRODUCT_RESPONSE | jq -r '.slug')
echo "Created product with ID: $PRODUCT_ID, slug: $PRODUCT_SLUG"

# 3. Add first variant (should auto-become default)
echo ""
echo "3. Adding first variant (should auto-become default)..."
VARIANT1_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/catalog/products/$PRODUCT_ID/variants" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "HB-M6-20",
    "name": "M6 x 20mm",
    "price": 150,
    "quantity": 100
  }')

VARIANT1_ID=$(echo $VARIANT1_RESPONSE | jq -r '.id')
echo "Created variant with ID: $VARIANT1_ID, isDefault: $(echo $VARIANT1_RESPONSE | jq -r '.isDefault')"

# 4. Add second variant
echo ""
echo "4. Adding second variant..."
VARIANT2_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/catalog/products/$PRODUCT_ID/variants" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "HB-M6-30",
    "name": "M6 x 30mm",
    "price": 180,
    "quantity": 100
  }')

VARIANT2_ID=$(echo $VARIANT2_RESPONSE | jq -r '.id')
echo "Created variant with ID: $VARIANT2_ID"

# 5. Get product with variants (should include variants array)
echo ""
echo "5. Getting product with variants..."
GET_PRODUCT_RESPONSE=$(curl -s "$BASE_URL/v1/catalog/products/$PRODUCT_ID")
echo "Product variants count: $(echo $GET_PRODUCT_RESPONSE | jq -r '.variants | length')
echo "First variant isDefault: $(echo $GET_PRODUCT_RESPONSE | jq -r '.variants[0].isDefault')

# 6. Find by variant SKU (should return parent product)
echo ""
echo "6. Finding product by variant SKU (HB-M6-20)..."
BY_SKU_RESPONSE=$(curl -s "$BASE_URL/v1/catalog/products/by-sku/HB-M6-20")
BY_SKU_PRODUCT_ID=$(echo $BY_SKU_RESPONSE | jq -r '.id')
echo "Found product by SKU, ID: $BY_SKU_PRODUCT_ID (should match: $PRODUCT_ID)"

if [ "$BY_SKU_PRODUCT_ID" = "$PRODUCT_ID" ]; then
  echo "SUCCESS: findBySku returns correct product"
else
  echo "FAIL: findBySku returned wrong product"
fi

echo ""
echo "7. Creating another product with same name (slug collision test)..."
PRODUCT2_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/catalog/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hex Bolt",
    "type": "simple",
    "categoryId": null
  }')

PRODUCT2_SLUG=$(echo $PRODUCT2_RESPONSE | jq -r '.slug')
echo "Created second product with slug: $PRODUCT2_SLUG (should be hex-bolt-2)"

if [ "$PRODUCT2_SLUG" = "hex-bolt-2" ]; then
  echo "SUCCESS: Slug collision handled correctly"
else
  echo "Created with slug: $PRODUCT2_SLUG"
fi

echo ""
echo "8. List products with search..."
SEARCH_RESPONSE=$(curl -s "$BASE_URL/v1/catalog/products?search=bolt&page=1&pageSize=10")
SEARCH_TOTAL=$(echo $SEARCH_RESPONSE | jq -r '.meta.total')
echo "Search for 'bolt' found $SEARCH_TOTAL products"

echo ""
echo "=== All tests completed ==="
