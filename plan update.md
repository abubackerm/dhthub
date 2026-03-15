Minor things to add/fix:
1. Phase 6 (Data Migration) — make it mandatory, not optional

Your products currently have categoryId
Even in dev, you need the migration script to avoid breaking existing data
Move it to Phase 1.7 right after the Prisma migration

2. Cell slug auto-generation

Plan doesn't mention who generates the slug
Should be auto-generated from name in the service, with manual override option in DTO
Add this to create-cell.dto.ts notes

3. isActive filter on public endpoints

Public endpoint GET /v1/catalog/categories/:slug/cells should only return active cells
Admin endpoint should return all (with isActive status shown)
Not explicitly mentioned in the plan

4. Attribute displayOrder on the Cell page

CellAttribute has displayOrder — this controls column order in the SKU table
Make sure the public Cell endpoint returns attributes sorted by displayOrder
Worth explicitly noting in Phase 3.2

5. Search module (Phase 4.2)

Currently indexes Category → Product
After change it needs to traverse Cell → Category → Product
Make sure Meilisearch document includes both cellId and categoryId for filtering