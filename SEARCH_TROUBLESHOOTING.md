# Search Troubleshooting Guide

## Problem
When searching for "marking fluid" on the mockup homepage, no results appear even if products exist in the database.

## Root Causes

### 1. **Matching Strategy Too Restrictive** (FIXED ✅)
The search was using `matchingStrategy: 'all'` which requires ALL words in the search query to match. This is too strict for multi-word searches.

**Solution:** Changed to `matchingStrategy: 'last'` with fallback strategies:
- First tries with `'last'` (matches last word)
- Falls back to `'all'` for exact phrase matches
- Finally tries OR logic (`word1 | word2`) if still no results

### 2. **Empty Meilisearch Index** (LIKELY ISSUE)
The Meilisearch index might not have any data indexed yet. Products/variants need to be explicitly indexed for search to work.

**How to Check:**
```bash
# Check search index stats
curl http://localhost:7700/indexes/variants/stats

# Or use the new API endpoint
curl http://localhost:3001/api/v1/search/stats
```

**Expected Response:**
```json
{
  "indexName": "variants",
  "documentCount": 0,  // ← If 0, index is empty!
  "isIndexing": false,
  "hasData": false
}
```

### 3. **Meilisearch Not Running**
If Meilisearch server is not running, search will fail silently.

**How to Check:**
```bash
# Check if Meilisearch is running
curl http://localhost:7700/health

# Check Docker container
docker ps | grep meilisearch
```

## Solutions

### Quick Fix: Rebuild Search Index

Run this command to rebuild the entire search index:

```bash
pnpm --filter api reindex-search
```

This will:
1. Connect to the database
2. Fetch all product variants
3. Build search documents
4. Index them in Meilisearch

### Manual Index Check via API

```bash
# Check index health
curl http://localhost:3001/api/v1/search/health

# Check index stats
curl http://localhost:3001/api/v1/search/stats

# Trigger reindex (admin only)
curl -X POST http://localhost:3001/api/v1/search/reindex \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Verify Meilisearch is Running

If using Docker:
```bash
# Start infrastructure
docker-compose -f deploy/docker-compose.infra.yml up -d dht-meilisearch

# Check logs
docker logs dht-meilisearch
```

### Check Event Listeners

Search index should automatically update when variants are created/updated via event listeners. If automatic indexing isn't working:

1. Check if events are being emitted (check API logs)
2. Verify event listeners are registered (check startup logs)
3. Manually trigger reindex using the command above

## Testing Search

After rebuilding the index, test search:

1. Go to homepage
2. Type "marking fluid" in search box
3. Check browser console for debug logs
4. Should see results if products exist

### Debug Logs in Browser Console

Open browser DevTools → Console and search for:
- `🔍 Search returned no results` - indicates empty results
- `💡 Tip: Try checking /api/v1/search/stats` - suggests next step

## Architecture

```
Database (PostgreSQL)
    ↓ (events)
Event Listeners
    ↓ (index)
Meilisearch
    ↓ (query)
Search API (/api/v1/search)
    ↓ (fetch)
Frontend Search Input
```

## Files Modified

1. `apps/api/src/modules/search/services/search.service.ts` - Improved matching strategy
2. `apps/api/src/modules/search/controllers/search.controller.ts` - Added /stats endpoint
3. `apps/api/src/scripts/reindex-search.ts` - New reindex script
4. `apps/api/package.json` - Added reindex-search command
5. `apps/web/src/app/(home)/components/mockup-homepage.tsx` - Better error handling

## Next Steps

1. ✅ Run `pnpm --filter api reindex-search` to populate the index
2. ✅ Test search for "marking fluid"
3. ✅ Check `/api/v1/search/stats` to verify document count
4. ✅ If still no results, verify product names actually contain "marking fluid"
