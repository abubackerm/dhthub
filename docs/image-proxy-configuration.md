# Image Proxy Configuration Guide

This guide explains how to properly configure image serving for the Dynamic Hub application, including proxy setup, URL structure, and best practices.

## Architecture Overview

```
Browser → Next.js Proxy (port 3005) → SeaweedFS Filer (port 8888) → S3 Storage
```

The Next.js proxy acts as an intermediary that:
- Handles caching headers for optimal performance
- Manages authentication and security
- Provides clean URLs to the frontend
- Routes requests to SeaweedFS backend

## Public URL Structure

### Frontend Usage

Images should be accessed via relative paths through the Next.js proxy:

```
/product-images/{hash4}/{sku}-{position}.{ext}
```

**Example:**
```
/product-images/55c1/product-OWC-RK-SS-001-1.png
/product-images/4187/91578A204-1.png
```

### What NOT to Do

❌ **Never store or use full URLs in the database:**
```typescript
// WRONG - Don't do this
url: "http://localhost:8333/catalog/product-images/55c1/product-OWC-RK-SS-001-1.png"
url: "http://localhost:8888/buckets/catalog/product-images/..."
```

❌ **Never access SeaweedFS directly from the browser:**
```html
<!-- WRONG - Don't do this -->
<img src="http://localhost:8888/buckets/catalog/..." />
<img src="http://localhost:8333/catalog/..." />
```

## Database Storage Format

### Product Images Table

```sql
CREATE TABLE product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  url TEXT NOT NULL,  -- Store relative paths only
  alt_text TEXT,
  sort_order INTEGER,
  is_primary BOOLEAN DEFAULT false,
  ...
);
```

**Correct URL format:**
```sql
-- Correct: Relative path without protocol or port
url = '/product-images/55c1/product-OWC-RK-SS-001-1.png'

-- Incorrect: Full URL with protocol and port
url = 'http://localhost:8333/catalog/product-images/...'
```

### Variant Images Table

```sql
CREATE TABLE variant_images (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  storage_path TEXT NOT NULL,  -- Store relative paths only
  position INTEGER NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  ...
);
```

**Correct storage_path format:**
```sql
-- Correct: Relative path
storage_path = '/product-images/d668/OWC-RK-SS-10X16-1.png'

-- Incorrect: Full URL
storage_path = 'http://localhost:8888/buckets/catalog/...'
```

### Cell Images Table

```sql
CREATE TABLE cell_images (
  id TEXT PRIMARY KEY,
  cell_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  storage_path TEXT NOT NULL,  -- Store relative paths only
  position INTEGER NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  ...
);
```

**Correct storage_path format:**
```sql
-- Correct: Relative path
storage_path = '/product-images/6e73/cell-C-57344002-1.png'

-- Incorrect: Full URL
storage_path = 'http://localhost:8333/catalog/product-images/...'
```

### Category Images Table

```sql
CREATE TABLE category_images (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  storage_path TEXT NOT NULL,  -- Store relative paths only
  position INTEGER NOT NULL,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  ...
);
```

**Correct storage_path format:**
```sql
-- Correct: Relative path
storage_path = '/product-images/679b/category-CG-F047AD15-1.png'

-- Incorrect: Full URL
storage_path = 'http://localhost:8333/catalog/product-images/...'
```

## Next.js Proxy Configuration

### File: `apps/web/src/proxy.ts`

The proxy handles `/product-images/*` requests and forwards them to SeaweedFS:

```typescript
if (pathname.startsWith("/product-images/")) {
  const storageUrl = process.env.SEAWEDFS_FILER_URL || "http://localhost:8888";

  const objectKey = pathname.startsWith("/")
    ? pathname.slice(1)
    : pathname;

  // Construct SeaweedFS URL with bucket prefix
  const seaweedfsUrl = `${storageUrl}/buckets/catalog/${objectKey}`;

  const response = await fetch(seaweedfsUrl, {
    headers: {
      Accept: request.headers.get("accept") || "image/*",
    },
  });

  if (!response.ok) {
    return new Response("Image not found", { status: 404 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
```

### Key Proxy Features

1. **Content-Type Passthrough** - Ensures correct MIME types (PNG, JPEG, WebP)
2. **Cache Headers** - `public, max-age=31536000, immutable` (1 year cache)
3. **Accept Header** - Passes client's Accept header for format negotiation
4. **404 Fallback** - Returns clean "Image not found" response
5. **Bucket Routing** - Adds `/buckets/catalog` prefix for SeaweedFS compatibility

## Environment Variables

### Required Environment Variables

```bash
# apps/web/.env.local
SEAWEDFS_FILER_URL=http://localhost:8888

# apps/api/.env
SEAWEDFS_FILER_URL=http://localhost:8888
SEAWEDFS_S3_ENDPOINT=http://localhost:8333
```

### Port Configuration

| Service | Port | Purpose |
|----------|------|---------|
| Next.js Web | 3005 | Frontend application + proxy |
| API Server | 3001 | Backend API |
| SeaweedFS Filer | 8888 | HTTP file access |
| SeaweedFS S3 | 8333 | S3-compatible API |

## Frontend Usage Examples

### Displaying Images in Components

```tsx
// Correct: Use relative URLs directly from database
<img
  src={variant.images.find((img) => img.isPrimary)?.url}
  alt={product.name}
  className="w-full h-full object-cover"
/>
```

### Cell Images in Admin Panel

The cell management component displays cell thumbnails using the same pattern:

```tsx
// From: apps/web/src/app/(dashboard)/dhthub-admin/categories/components/cell-management-sheet.tsx

{cell.imageUrl ? (
  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
    <img
      src={cell.imageUrl} // Relative path from database
      alt={cell.name}
      className="w-full h-full object-cover"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  </div>
) : (
  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center flex-shrink-0">
    <ImageIcon className="h-5 w-5 text-muted-foreground mb-1" />
    <span className="text-[10px] text-muted-foreground">No image</span>
  </div>
)}
```

**Key points:**
- Use `cell.imageUrl` directly (not `/api/v1/storage${cell.imageUrl}`)
- Add "No image" placeholder when `cell.imageUrl` is null
- Handle image errors gracefully with `onError`

### Image Galleries

```tsx
{product.images.map((img) => (
  <img
    key={img.id}
    src={img.url} // Relative path from database
    alt={img.altText || product.name}
    className="thumbnail"
  />
))}
```

### Cell Product Tables

```tsx
{variant.images.find((img) => img.isPrimary)?.url ? (
  <img
    src={variant.images.find((img) => img.isPrimary)?.url}
    alt={variant.name}
    className="w-10 h-10 object-cover"
  />
) : (
  <Package className="w-5 h-5 text-muted-foreground/40" />
)}
```

## API Response Format

### Product View with Images

```json
{
  "id": "cmmt3034g0010bc7kknvdkjvu",
  "name": "Heavy-Duty One-Way Clutch",
  "sku": "OWC-RK-SS-001",
  "images": [
    {
      "id": "cmn1c7vnp0003ms7kxs2x11y",
      "url": "/product-images/55c1/product-OWC-RK-SS-001-1.png",
      "altText": null,
      "isPrimary": true
    }
  ],
  "variants": [
    {
      "id": "variant-123",
      "sku": "OWC-RK-SS-001",
      "images": [
        {
          "url": "/product-images/55c1/OWC-RK-SS-001-1.png",
          "altText": null,
          "isPrimary": true
        }
      ]
    }
  ]
}
```

## Storage Path Generation

### Hash-Based Directory Structure

Images are stored using MD5 hash of the SKU:

```typescript
import { createHash } from 'crypto';

function getStoragePath(sku: string, position: number, ext: string): string {
  const hash = createHash('md5').update(sku).digest('hex');
  const hash4 = hash.substring(0, 4); // First 4 characters
  const filename = `${sku}-${position}.${ext}`;
  return `/product-images/${hash4}/${filename}`;
}

// Example:
// sku: "OWC-RK-SS-001"
// hash: "a7f3c4d5..."
// hash4: "a7f3"
// result: "/product-images/a7f3/OWC-RK-SS-001-1.png"
```

### Actual Storage Location in SeaweedFS

```
catalog/product-images/{hash4}/{sku}-{position}.{ext}
```

Example:
```
catalog/product-images/a7f3/91578A103-1.jpg
catalog/product-images/55c1/OWC-RK-SS-001-1.png
```

## Troubleshooting

### Issue: Images Return 403 Forbidden

**Symptom:** Browser requests return 403 from SeaweedFS

**Cause:** Accessing SeaweedFS directly with wrong port or endpoint

**Solution:**
1. Ensure URLs in database are relative paths (no protocol/host)
2. Verify Next.js proxy is running on port 3005
3. Check SeaweedFS bucket is configured correctly

### Issue: Images Return 404

**Symptom:** Images not found through proxy

**Possible Causes:**
1. URL stored incorrectly in database
2. SeaweedFS bucket prefix issue
3. Image not uploaded to storage

**Solution:**
```sql
-- Check stored URLs
SELECT id, url FROM product_images WHERE id = 'image-id';

-- Should be relative path like:
-- /product-images/55c1/product-OWC-RK-SS-001-1.png
```

### Issue: Wrong Image Format

**Symptom:** PNG images render incorrectly or fail to load

**Cause:** Missing Content-Type passthrough

**Solution:** Verify proxy includes:
```typescript
"Content-Type": response.headers.get("content-type") || "image/jpeg"
```

### Issue: Images Not Caching

**Symptom:** Images reload on every page visit

**Solution:** Verify cache headers:
```typescript
"Cache-Control": "public, max-age=31536000, immutable"
```

## Testing Proxy Configuration

### Test Proxy with curl

```bash
# Test working image
curl -I http://localhost:3005/product-images/4187/91578A204-1.png

# Expected response:
# HTTP/1.1 200 OK
# content-type: image/png
# cache-control: public, max-age=31536000, immutable

# Test 404 handling
curl -I http://localhost:3005/product-images/invalid/path.jpg

# Expected response:
# HTTP/1.1 404 Not Found
```

### Test Direct SeaweedFS Access

```bash
# Test SeaweedFS directly (for debugging only)
curl -I http://localhost:8888/buckets/catalog/product-images/4187/91578A204-1.png
```

## Best Practices

### 1. Always Store Relative Paths

```typescript
// ✅ Correct
url: '/product-images/55c1/product-OWC-RK-SS-001-1.png'

// ❌ Incorrect
url: 'http://localhost:8333/catalog/product-images/...'
url: 'http://localhost:3005/product-images/...'
```

### 2. Use Next.js Proxy for All Image Requests

```tsx
// ✅ Correct - Goes through proxy
<img src="/product-images/55c1/..." />

// ❌ Incorrect - Bypasses proxy
<img src="http://localhost:8888/..." />
```

### 3. Leverage Browser Caching

The proxy sets `immutable` cache headers, meaning:
- Images are cached for 1 year
- Browser won't revalidate until cache expires
- Reduces server load and improves performance

### 4. Handle Missing Images Gracefully

```tsx
{variant.images.find((img) => img.isPrimary)?.url ? (
  <img src={variant.images.find((img) => img.isPrimary)?.url} />
) : (
  <Package className="placeholder-icon" />
)}
```

## Migration Notes

If you have existing full URLs in your database, update them:

```sql
-- Convert full URLs to relative paths
UPDATE product_images
SET url = REPLACE(
  url,
  'http://localhost:8333/catalog/',
  '/product-images/'
)
WHERE url LIKE 'http://localhost:8333/catalog/%';

-- Verify the changes
SELECT id, url FROM product_images LIMIT 10;

-- Convert full URLs to relative paths in cell_images
UPDATE cell_images
SET storage_path = REPLACE(
  storage_path,
  'http://localhost:8333/catalog/',
  '/product-images/')
WHERE storage_path LIKE 'http://localhost:8333/catalog/%';

-- Fix double path issue
UPDATE cell_images
SET storage_path = REPLACE(storage_path, '/product-images/product-images/', '/product-images/')
WHERE storage_path LIKE '/product-images/product-images/%';

-- Convert full URLs to relative paths in category_images
UPDATE category_images
SET storage_path = REPLACE(
  storage_path,
  'http://localhost:8333/catalog/',
  '/product-images/')
WHERE storage_path LIKE 'http://localhost:8333/catalog/%';

-- Fix double path issue in category_images
UPDATE category_images
SET storage_path = REPLACE(storage_path, '/product-images/product-images/', '/product-images/')
WHERE storage_path LIKE '/product-images/product-images/%';

-- Verify all changes
SELECT id, storage_path FROM cell_images LIMIT 10;
SELECT id, storage_path FROM category_images LIMIT 10;
SELECT id, storage_path FROM variant_images LIMIT 10;
```

### Database Query to Check for Full URLs

```sql
-- Check all image tables for remaining full URLs
SELECT 'cell_images' as table_name, COUNT(*) as full_url_count FROM cell_images WHERE storage_path LIKE 'http%'
UNION ALL
SELECT 'category_images' as table_name, COUNT(*) as full_url_count FROM category_images WHERE storage_path LIKE 'http%'
UNION ALL
SELECT 'product_images' as table_name, COUNT(*) as full_url_count FROM product_images WHERE url LIKE 'http%'
UNION ALL
SELECT 'variant_images' as table_name, COUNT(*) as full_url_count FROM variant_images WHERE storage_path LIKE 'http%';
```

## Summary

- ✅ Store relative paths only in database (`/product-images/...`)
- ✅ Access images through Next.js proxy (`http://localhost:3005/product-images/...`)
- ✅ Never store full URLs with ports in database
- ✅ Proxy adds `/buckets/catalog/` prefix for SeaweedFS
- ✅ Cache headers set to 1 year with `immutable` directive
- ✅ Content-Type forwarded from SeaweedFS response
- ✅ 404 handling for missing images

## References

- Proxy Implementation: `apps/web/src/proxy.ts`
- API Types: `apps/web/src/lib/api/catalog/types.ts`
- SeaweedFS Configuration: `docs/seaweedfs-setup.md`
