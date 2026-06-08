# McMaster-Carr Style Catalog — Full Development Blueprint (Updated)
> Master reference for Cursor AI sessions.
> Check off tasks with [x] as completed. Never skip a phase — each depends on the previous.
> Updated to account for: existing Next.js project, existing homepage, existing ShadcnStore admin dashboard with Phase 1 UI already built using mock data.

---

## YOUR CURRENT PROJECT STATE
Before starting, understand what already exists:

| What | Status |
|---|---|
| Next.js project | ✅ Already exists |
| Homepage (`/`) | ✅ Already exists — company info, do NOT touch |
| ShadcnStore admin dashboard | ✅ Already exists at `/admin` |
| Admin UI pages (categories, attributes, products, upload, review, users) | ✅ Built in Phase 1 UI blueprint — using mock data from `lib/mock-data.ts` |
| Database | ❌ Not set up yet |
| Prisma | ❌ Not set up yet |
| API routes | ❌ Not set up yet |
| Public product pages | ❌ Not set up yet |
| Auth / roles | ❌ Not set up yet |

---

## HOW TO USE WITH CURSOR AI

**Starting a new Cursor session — always paste this at the top:**
> *"I have an existing Next.js project with a ShadcnStore admin dashboard. The homepage at `/` already exists and must not be touched. All admin UI pages are already built at `/admin/...` using mock data from `lib/mock-data.ts`. I am now wiring up the backend. Follow [Phase X, Step Y] from the blueprint. Do not restructure existing files — only add what the blueprint specifies."*

**One phase at a time.** Never ask Cursor to do two phases in one session.
**Reference steps precisely:** e.g. "Follow Phase 3, Step 3.1 — Categories API Routes"

---

## ROUTING MAP — Lock this in, never change

```
/                            ← Homepage — ALREADY EXISTS, do not touch
/products                    ← Public catalog entry — browse top-level categories
/products/[...path]          ← Dynamic: resolves to branch, leaf, or product detail
/search                      ← Search results page
/cart                        ← Cart
/account                     ← Customer account

/admin                       ← Admin dashboard — ALREADY EXISTS
/admin/login                 ← NEW — admin login page
/admin/categories            ← UI BUILT — wire up in Phase 3
/admin/attributes            ← UI BUILT — wire up in Phase 4
/admin/products              ← UI BUILT — wire up in Phase 5
/admin/upload                ← UI BUILT — wire up in Phase 5
/admin/upload-history        ← UI BUILT — wire up in Phase 5
/admin/review                ← UI BUILT — wire up in Phase 6
/admin/schema-requests       ← UI BUILT — wire up in Phase 6
/admin/users                 ← UI BUILT — wire up in Phase 6
```

---

## TECH STACK

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL |
| ORM | Prisma |
| Admin Auth | NextAuth.js with credentials provider |
| File Storage | AWS S3 or Cloudflare R2 |
| Search | Typesense (self-hosted) or Algolia |
| UI Components | Shadcn/ui + Tailwind (already installed) |
| State Management | Zustand |
| Form Handling | React Hook Form + Zod (already installed) |
| Background Jobs | BullMQ + Redis |
| Caching | Redis |

---

## DATABASE SCHEMA — Read before writing any code

### Core Rules
1. Categories are **BRANCH** (navigation only, no products) or **LEAF** (holds products, has attribute schema)
2. Only LEAF categories have an attribute schema
3. Every product belongs to exactly one LEAF category
4. A product's data = values mapped to its category's attribute schema
5. Attribute schemas can only be extended once products exist — never destructively changed

### Full Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// USERS & ROLES
// ─────────────────────────────────────────────

enum UserRole {
  SUPER_ADMIN       // Full access
  CATEGORY_ADMIN    // Create/edit categories and attribute schemas
  DATA_ENTRY        // Upload products into existing leaf categories
  REVIEWER          // Approve/reject draft products
  CUSTOMER          // Public-facing customer account
}

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  name          String
  passwordHash  String
  role          UserRole      @default(DATA_ENTRY)
  isActive      Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  uploadBatches UploadBatch[]
  reviewActions ReviewAction[]
}

// ─────────────────────────────────────────────
// CATEGORY TREE
// ─────────────────────────────────────────────

enum CategoryType {
  BRANCH  // Navigation only — contains child categories, no products
  LEAF    // End node — contains products, no children, has attribute schema
}

model Category {
  id           String        @id @default(cuid())
  name         String
  slug         String        @unique   // URL-safe e.g. "hex-bolts"
  description  String?
  type         CategoryType  @default(BRANCH)
  parentId     String?
  parent       Category?     @relation("CategoryTree", fields: [parentId], references: [id])
  children     Category[]    @relation("CategoryTree")
  depth        Int           @default(0)   // 0 = top level
  pathSlugs    String[]      // ["fasteners","bolts","hex-bolts"] — builds the URL
  pathNames    String[]      // ["Fasteners","Bolts","Hex Bolts"] — builds breadcrumbs
  iconUrl      String?
  imageUrl     String?
  sortOrder    Int           @default(0)
  isActive     Boolean       @default(true)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  attributes   CategoryAttribute[]
  products     Product[]

  @@index([parentId])
  @@index([slug])
}

// ─────────────────────────────────────────────
// ATTRIBUTE SCHEMA (per Leaf Category)
// ─────────────────────────────────────────────

enum AttributeDataType {
  NUMBER        // Numeric — supports range filter
  SELECT        // One value from a controlled list
  MULTI_SELECT  // Multiple values from a controlled list
  BOOLEAN       // Yes/No
  TEXT          // Free text — use sparingly, cannot be range filtered
}

enum AttributeFilterType {
  RANGE         // Min/max slider (use with NUMBER)
  CHECKBOX_LIST // Multi-checkbox (use with SELECT/MULTI_SELECT)
  TOGGLE        // On/off (use with BOOLEAN)
  NONE          // Display only — not filterable
}

model CategoryAttribute {
  id               String              @id @default(cuid())
  categoryId       String
  category         Category            @relation(fields: [categoryId], references: [id])
  name             String              // "Thread Size"
  slug             String              // "thread_size" — column key in CSV and DB
  description      String?             // Help text shown to data entry people
  dataType         AttributeDataType
  filterType       AttributeFilterType
  unit             String?             // "in", "mm", "PSI"
  isRequired       Boolean             @default(false)
  isFilterable     Boolean             @default(true)
  isVisibleInTable Boolean             @default(true)
  isVisibleInSpec  Boolean             @default(true)
  sortOrder        Int                 @default(0)
  allowedValues    AllowedValue[]
  productValues    ProductAttribute[]
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  @@unique([categoryId, slug])
  @@index([categoryId])
}

model AllowedValue {
  id          String            @id @default(cuid())
  attributeId String
  attribute   CategoryAttribute @relation(fields: [attributeId], references: [id])
  value       String            // "1/4-20"
  label       String?
  sortOrder   Int               @default(0)

  @@unique([attributeId, value])
}

// ─────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────

enum ProductStatus {
  DRAFT        // Uploaded, not visible to public
  IN_REVIEW    // Submitted for reviewer approval
  PUBLISHED    // Live at /products/...
  REJECTED     // Failed review — sent back with comment
  ARCHIVED     // Discontinued — hidden from public
}

model Product {
  id            String           @id @default(cuid())
  sku           String           @unique
  name          String
  categoryId    String
  category      Category         @relation(fields: [categoryId], references: [id])
  status        ProductStatus    @default(DRAFT)
  basePrice     Decimal          @db.Decimal(10, 4)
  currency      String           @default("USD")
  inStock       Boolean          @default(true)
  stockQty      Int?
  minOrderQty   Int              @default(1)
  leadTimeDays  Int?
  weight        Float?
  imageUrls     String[]
  pdfSpecUrl    String?
  notes         String?
  attributes    ProductAttribute[]
  uploadBatchId String?
  uploadBatch   UploadBatch?     @relation(fields: [uploadBatchId], references: [id])
  reviewActions ReviewAction[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  publishedAt   DateTime?

  @@index([categoryId, status])
  @@index([sku])
}

model ProductAttribute {
  id           String            @id @default(cuid())
  productId    String
  product      Product           @relation(fields: [productId], references: [id], onDelete: Cascade)
  attributeId  String
  attribute    CategoryAttribute @relation(fields: [attributeId], references: [id])
  attrSlug     String            // Denormalized for fast lookup
  rawValue     String            // Always stored as string
  numericValue Float?            // Populated when dataType = NUMBER

  @@unique([productId, attributeId])
  @@index([attributeId, rawValue])
  @@index([attributeId, numericValue])
}

// ─────────────────────────────────────────────
// BULK UPLOAD SYSTEM
// ─────────────────────────────────────────────

enum BatchStatus {
  PENDING
  VALIDATING
  VALIDATION_FAILED
  PROCESSING
  COMPLETED
  COMPLETED_WITH_ERRORS
}

model UploadBatch {
  id               String      @id @default(cuid())
  categoryId       String
  uploadedById     String
  uploadedBy       User        @relation(fields: [uploadedById], references: [id])
  status           BatchStatus @default(PENDING)
  originalFilename String
  fileUrl          String
  totalRows        Int         @default(0)
  validRows        Int         @default(0)
  errorRows        Int         @default(0)
  errorFileUrl     String?
  errorLog         Json?
  products         Product[]
  createdAt        DateTime    @default(now())
  completedAt      DateTime?
}

// ─────────────────────────────────────────────
// REVIEW SYSTEM
// ─────────────────────────────────────────────

enum ReviewActionType {
  SUBMITTED
  APPROVED
  REJECTED
  CHANGE_REQUESTED
  REPUBLISHED
}

model ReviewAction {
  id         String           @id @default(cuid())
  productId  String
  product    Product          @relation(fields: [productId], references: [id])
  reviewerId String
  reviewer   User             @relation(fields: [reviewerId], references: [id])
  action     ReviewActionType
  comment    String?
  createdAt  DateTime         @default(now())
}

// ─────────────────────────────────────────────
// SCHEMA CHANGE REQUESTS
// ─────────────────────────────────────────────

enum SchemaChangeStatus {
  PENDING
  APPROVED
  REJECTED
}

enum SchemaChangeType {
  ADD_ATTRIBUTE
  MODIFY_ATTRIBUTE
  ADD_ALLOWED_VALUE
  REMOVE_ALLOWED_VALUE
  DEPRECATE_ATTRIBUTE
}

model SchemaChangeRequest {
  id            String             @id @default(cuid())
  categoryId    String
  requestedById String
  changeType    SchemaChangeType
  description   String
  proposedData  Json
  status        SchemaChangeStatus @default(PENDING)
  reviewNote    String?
  createdAt     DateTime           @default(now())
  resolvedAt    DateTime?
}
```

---

## FOLDER STRUCTURE — Additions only, do not restructure existing files

```
your-existing-project/
├── app/
│   ├── page.tsx                         ← EXISTS — homepage, do not touch
│   ├── layout.tsx                       ← EXISTS — root layout, do not touch
│   │
│   ├── products/                        ← NEW — public catalog
│   │   ├── page.tsx                     ← /products — top-level category browser
│   │   └── [...path]/
│   │       └── page.tsx                 ← handles /products/fasteners/bolts/hex-bolts AND /products/.../[sku]
│   │
│   ├── search/
│   │   └── page.tsx                     ← NEW
│   │
│   ├── cart/
│   │   └── page.tsx                     ← NEW
│   │
│   ├── admin/                           ← EXISTS — do not restructure
│   │   ├── login/
│   │   │   └── page.tsx                 ← NEW
│   │   ├── categories/page.tsx          ← EXISTS (mock) — wire up Phase 3
│   │   ├── attributes/page.tsx          ← EXISTS (mock) — wire up Phase 4
│   │   ├── products/page.tsx            ← EXISTS (mock) — wire up Phase 5
│   │   ├── upload/page.tsx              ← EXISTS (mock) — wire up Phase 5
│   │   ├── upload-history/page.tsx      ← EXISTS (mock) — wire up Phase 5
│   │   ├── review/page.tsx              ← EXISTS (mock) — wire up Phase 6
│   │   ├── schema-requests/page.tsx     ← EXISTS (mock) — wire up Phase 6
│   │   └── users/page.tsx              ← EXISTS (mock) — wire up Phase 6
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── categories/
│       │   ├── route.ts
│       │   └── [categoryId]/
│       │       ├── route.ts
│       │       ├── schema/
│       │       │   ├── route.ts
│       │       │   └── [attributeId]/
│       │       │       ├── route.ts
│       │       │       └── values/
│       │       │           ├── route.ts
│       │       │           └── [valueId]/route.ts
│       │       └── template/route.ts
│       ├── products/
│       │   ├── route.ts
│       │   └── [productId]/
│       │       ├── route.ts
│       │       ├── submit/route.ts
│       │       ├── approve/route.ts
│       │       ├── reject/route.ts
│       │       └── request-changes/route.ts
│       ├── upload/
│       │   ├── route.ts
│       │   └── [batchId]/route.ts
│       ├── schema-requests/
│       │   ├── route.ts
│       │   └── [requestId]/route.ts
│       ├── users/
│       │   ├── route.ts
│       │   └── [userId]/route.ts
│       ├── admin/stats/route.ts
│       └── search/route.ts
│
├── components/
│   ├── admin/                           ← EXISTS — do not touch
│   └── public/                          ← NEW
│       ├── CategoryTable/
│       │   ├── index.tsx
│       │   ├── FilterPanel.tsx
│       │   └── TableRow.tsx
│       ├── BranchCategory/
│       │   └── index.tsx
│       ├── ProductDetail/
│       │   ├── index.tsx
│       │   └── SpecTable.tsx
│       └── Search/
│           ├── SearchBar.tsx
│           └── SearchResults.tsx
│
├── lib/
│   ├── mock-data.ts                     ← EXISTS — replaced page by page
│   ├── prisma.ts                        ← NEW
│   ├── auth.ts                          ← NEW
│   ├── checkRole.ts                     ← NEW
│   ├── filterBuilder.ts                 ← NEW
│   ├── csvParser.ts                     ← NEW
│   ├── templateGenerator.ts            ← NEW
│   ├── searchIndexer.ts                ← NEW
│   └── redis.ts                        ← NEW
│
├── middleware.ts                        ← NEW
├── prisma/
│   ├── schema.prisma                    ← NEW
│   └── seed.ts                         ← NEW
└── workers/
    └── uploadWorker.ts                 ← NEW — BullMQ worker, runs as separate process
```

---

---

# PHASE 2 — Database & Auth Setup
> Start here. Phase 1 UI is already done.
> Do not touch any existing UI files in this phase — only set up infrastructure.

## Step 2.1 — Install New Dependencies
- [ ] Run:
  ```
  npm install prisma @prisma/client
  npm install next-auth bcryptjs @types/bcryptjs
  npm install bullmq ioredis
  npm install papaparse @types/papaparse
  npm install xlsx
  npm install slugify
  ```
- [ ] Add to `.env.local`:
  ```
  DATABASE_URL=
  NEXTAUTH_SECRET=
  NEXTAUTH_URL=http://localhost:3000
  S3_BUCKET=
  S3_REGION=
  AWS_ACCESS_KEY_ID=
  AWS_SECRET_ACCESS_KEY=
  REDIS_URL=
  ```

## Step 2.2 — Prisma Setup
- [ ] Run `npx prisma init`
- [ ] Copy the full schema above into `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name init`
- [ ] Run `npx prisma generate`
- [ ] Create `lib/prisma.ts` — Prisma client singleton:
  ```ts
  import { PrismaClient } from '@prisma/client'
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
  export const prisma = globalForPrisma.prisma || new PrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  ```
- [ ] Verify all tables created in DB GUI (TablePlus, pgAdmin, etc.)

## Step 2.3 — Seed File
- [ ] Create `prisma/seed.ts`
- [ ] Seed one SUPER_ADMIN user (email: admin@company.com, bcrypt-hashed password)
- [ ] Seed a category tree matching `mockCategories` from `lib/mock-data.ts` — same names, same structure
- [ ] Seed attribute schemas for each LEAF category matching `mockAttributes` from `lib/mock-data.ts`
- [ ] Seed 10–20 sample PUBLISHED products in at least one LEAF category matching `mockProducts`
- [ ] Add to `package.json`: `"prisma": { "seed": "ts-node prisma/seed.ts" }`
- [ ] Run `npx prisma db seed`
- [ ] Verify data appears in DB

## Step 2.4 — Authentication
- [ ] Create `lib/auth.ts` — NextAuth config:
  - Credentials provider (email + password)
  - Verify password with bcrypt
  - Session strategy: JWT
  - Include `id`, `role`, `name` in JWT token and session
- [ ] Create `app/api/auth/[...nextauth]/route.ts`
- [ ] Create `app/admin/login/page.tsx`:
  - Simple email + password form
  - Calls `signIn("credentials", { email, password, redirect: false })`
  - Redirects to `/admin` on success
  - Shows error message on failure
  - Does not use the existing ShadcnStore auth pages — this is a separate admin-only login
- [ ] Create `middleware.ts`:
  - Protect all routes matching `/admin/:path*` except `/admin/login`
  - Unauthenticated requests redirect to `/admin/login`
  - All `/products`, `/search`, `/cart` routes are public — no auth required
- [ ] Create `lib/checkRole.ts`:
  ```ts
  // Helper that reads the session and throws 403 if role doesn't match
  // Usage: await checkRole(req, ['SUPER_ADMIN', 'CATEGORY_ADMIN'])
  ```
- [ ] Test: log in as SUPER_ADMIN, verify redirect to `/admin`, verify `/admin/categories` loads

---

# PHASE 3 — Admin: Categories Backend
> Wire up the existing `/admin/categories` page to real data.
> The UI is already built — you are only adding API routes and replacing mock imports.

## Step 3.1 — Categories API Routes

### `GET /api/categories`
- [ ] Returns full category tree as nested JSON (recursive — each category includes its children)
- [ ] Cache in Redis with 5-minute TTL (key: `"category-tree"`)
- [ ] Bust cache on any category create/update/delete

### `POST /api/categories`
- [ ] Role check: CATEGORY_ADMIN or SUPER_ADMIN only
- [ ] Required body: `name`, `type` (BRANCH or LEAF), `parentId` (null = top level)
- [ ] Auto-generate `slug` from name using slugify — check uniqueness, append `-2`, `-3` if taken
- [ ] Auto-calculate `depth` from parent depth + 1 (0 if no parent)
- [ ] Auto-build `pathSlugs` by appending this slug to parent's `pathSlugs`
- [ ] Auto-build `pathNames` by appending this name to parent's `pathNames`
- [ ] Validate: parent must not be LEAF type (LEAF nodes cannot have children)
- [ ] On success: bust Redis cache, return new category

### `PATCH /api/categories/[categoryId]`
- [ ] Role check: CATEGORY_ADMIN or SUPER_ADMIN
- [ ] Allowed fields: `name`, `description`, `imageUrl`, `iconUrl`, `sortOrder`, `isActive`
- [ ] Block changing `type` LEAF → BRANCH if product count > 0: return 400 "Cannot convert to branch — this category has [N] products"
- [ ] Block changing `type` BRANCH → LEAF if child count > 0: return 400 "Cannot convert to leaf — remove child categories first"
- [ ] On success: bust Redis cache

### `DELETE /api/categories/[categoryId]`
- [ ] Role check: SUPER_ADMIN only
- [ ] Soft delete: set `isActive = false`
- [ ] Block if has active children: return 400 "Deactivate child categories first"
- [ ] Block if has published products: return 400 "Archive all products first"

## Step 3.2 — Wire Up Categories UI
- [ ] In `app/admin/categories/page.tsx`: remove `mockCategories` import, replace with `fetch('/api/categories')`
- [ ] Add/Edit slide-over Save button: calls `POST` or `PATCH /api/categories`
- [ ] On success: refetch tree and update state, close slide-over, show toast
- [ ] On error: show the API error message inside the form (not just a toast)
- [ ] Deactivate/Delete button: calls `DELETE /api/categories/[id]`, show blocked error message if returned

---

# PHASE 4 — Admin: Attribute Schema Backend
> Wire up the existing `/admin/attributes` page to real data.

## Step 4.1 — Attribute Schema API Routes

### `GET /api/categories/[categoryId]/schema`
- [ ] Returns all attributes for the category ordered by `sortOrder`
- [ ] Includes `allowedValues` nested in each attribute

### `POST /api/categories/[categoryId]/schema`
- [ ] Role check: CATEGORY_ADMIN or SUPER_ADMIN
- [ ] Validate: category is LEAF type
- [ ] Required body: `name`, `dataType`, `filterType`
- [ ] Auto-generate `slug` from name (lowercase, underscores)
- [ ] Validate slug unique within this category
- [ ] Validate compatible dataType + filterType pair:
  - NUMBER → RANGE or NONE only
  - SELECT/MULTI_SELECT → CHECKBOX_LIST or NONE only
  - BOOLEAN → TOGGLE or NONE only
  - TEXT → NONE only (reject any other filterType)
- [ ] If products already exist in this category: block setting `dataType = TEXT` (too late, breaks filtering)

### `PATCH /api/categories/[categoryId]/schema/[attributeId]`
- [ ] If category has 0 products: allow updating everything
- [ ] If category has products: only allow `name`, `description`, `filterType`, `isFilterable`, `isVisibleInTable`, `isVisibleInSpec`, `sortOrder`
- [ ] If client tries to change `dataType` or `slug` and products exist: return 400 with message "This field is locked because products exist. Submit a Schema Change Request instead."

### `POST /api/categories/[categoryId]/schema/[attributeId]/values`
- [ ] Adds an allowed value to a SELECT or MULTI_SELECT attribute
- [ ] Validate: attribute exists and is SELECT or MULTI_SELECT type
- [ ] Validate: value is unique within this attribute

### `DELETE /api/categories/[categoryId]/schema/[attributeId]/values/[valueId]`
- [ ] Block if any product uses this value — return 400 "This value is used by [N] products. Update those products before removing this value."

### Schema Change Requests

### `POST /api/schema-requests`
- [ ] Body: `categoryId`, `changeType`, `description`, `proposedData` (JSON of what to change)
- [ ] Status defaults to PENDING

### `GET /api/schema-requests`
- [ ] Role check: CATEGORY_ADMIN or SUPER_ADMIN
- [ ] Filterable by `status`

### `PATCH /api/schema-requests/[requestId]`
- [ ] Body: `action` (APPROVED or REJECTED), `reviewNote`
- [ ] On APPROVED: apply the change to the schema automatically
- [ ] On REJECTED: set status and store note

## Step 4.2 — Wire Up Attributes UI
- [ ] In `/admin/attributes`: fetch leaf categories from `GET /api/categories` (filter type = LEAF client-side)
- [ ] On category selection: fetch `GET /api/categories/[categoryId]/schema`
- [ ] Add Attribute: calls `POST /api/categories/[categoryId]/schema`
- [ ] Edit Attribute: calls `PATCH`
- [ ] Delete Attribute: calls `DELETE`
- [ ] Drag reorder: on drop, call `PATCH` for each affected row updating `sortOrder`
- [ ] Add/remove allowed values: wire to the allowed values endpoints
- [ ] If category has products: show locked-fields warning banner, disable `dataType` and `slug` inputs, show "Submit Schema Change Request" link instead
- [ ] Schema Requests page: wire to `GET /api/schema-requests`, approve/reject calls `PATCH /api/schema-requests/[id]`

---

# PHASE 5 — Admin: Product Upload Backend
> Wire up `/admin/products`, `/admin/upload`, `/admin/upload-history`.

## Step 5.1 — CSV Template Generator
- [ ] Create `lib/templateGenerator.ts`:
  - Takes a `categoryId`
  - Fetches category's attribute schema from DB
  - Builds CSV content:
    - Row 1: headers — fixed columns first (`sku`, `name`, `base_price`, `currency`, `in_stock`, `stock_qty`, `min_order_qty`, `lead_time_days`, `weight_lbs`, `notes`) then one column per attribute slug
    - Row 2: `#` comment row — describes each column: data type, unit, required Y/N, and for SELECT types the full list of allowed values
    - Row 3: example row with realistic sample values
  - Returns as CSV string
- [ ] `GET /api/categories/[categoryId]/template`:
  - Calls templateGenerator
  - Returns with header `Content-Disposition: attachment; filename="[category-slug]-template.csv"`
- [ ] Wire "Download Template" button in the upload UI to this endpoint

## Step 5.2 — Products API

### `GET /api/products`
- [ ] Filters: `status`, `categoryId`, `uploadedById`, `search` (matches SKU or name), `page` (default 1), `limit` (default 50)
- [ ] Admin requests: returns any status
- [ ] Include category `pathNames` in response for display

### `POST /api/products`
- [ ] Creates a single product
- [ ] Body: `categoryId`, `sku`, `name`, `basePrice`, `inStock`, plus `attributes` object `{ attrSlug: value }`
- [ ] Validate: category is LEAF, SKU is unique, all required attributes present
- [ ] Validate each attribute value against its schema (type, allowed values for SELECT)
- [ ] Save product as DRAFT
- [ ] For each attribute: save a `ProductAttribute` row. If `dataType = NUMBER`, parse and store `numericValue`

### `GET /api/products/[productId]`
- [ ] Returns product with all attributes and category info

### `PATCH /api/products/[productId]`
- [ ] Update product fields and/or attributes
- [ ] Re-validate attribute values on update

### `DELETE /api/products/[productId]`
- [ ] Soft delete: set status to ARCHIVED

### `POST /api/products/[productId]/submit`
- [ ] DRAFT → IN_REVIEW
- [ ] Creates ReviewAction with type SUBMITTED
- [ ] Role: DATA_ENTRY and above

### `POST /api/products/[productId]/approve`
- [ ] IN_REVIEW → PUBLISHED, sets `publishedAt`
- [ ] Creates ReviewAction with type APPROVED
- [ ] Triggers search indexer: `indexProduct(product)`
- [ ] Role: REVIEWER and above

### `POST /api/products/[productId]/reject`
- [ ] Body: `comment` (required)
- [ ] IN_REVIEW → REJECTED
- [ ] Creates ReviewAction with type REJECTED
- [ ] Role: REVIEWER and above

### `POST /api/products/[productId]/request-changes`
- [ ] Body: `comment` (required)
- [ ] Status stays IN_REVIEW
- [ ] Creates ReviewAction with type CHANGE_REQUESTED

## Step 5.3 — Bulk Upload API

### `POST /api/upload`
- [ ] Accepts multipart form: `file` (CSV or XLSX) + `categoryId`
- [ ] Saves file to S3 at path: `uploads/[batchId]/[originalFilename]`
- [ ] Creates `UploadBatch` record with status PENDING
- [ ] Enqueues BullMQ job: `processUploadBatch(batchId)`
- [ ] Returns `{ batchId }` immediately — do NOT wait for worker

### `GET /api/upload/[batchId]`
- [ ] Returns batch with: status, totalRows, validRows, errorRows, errorFileUrl
- [ ] UI polls this every 3 seconds while status is PENDING, VALIDATING, or PROCESSING

### `GET /api/upload`
- [ ] Returns all batches for current user (DATA_ENTRY sees own batches, SUPER_ADMIN sees all)
- [ ] Ordered by createdAt DESC

## Step 5.4 — BullMQ Upload Worker

- [ ] Create `workers/uploadWorker.ts` — runs as a separate process
- [ ] Job handler `processUploadBatch(batchId)`:
  1. Load batch from DB, get `categoryId`
  2. Load category attribute schema (cache it)
  3. Download CSV file from S3
  4. Parse with papaparse — skip the `#` comment row (rows starting with `#`)
  5. Update batch status to VALIDATING
  6. For each data row, validate:
     - SKU not blank and not already in DB
     - All required attribute columns present and not blank
     - NUMBER attributes: parse as float — fail if NaN
     - SELECT attributes: value must exactly match an AllowedValue (case-sensitive)
     - MULTI_SELECT: each value (comma-separated) must match an AllowedValue
     - BOOLEAN: accept TRUE/FALSE/Yes/No/1/0 case-insensitively, normalize to boolean
  7. Collect errors: `{ rowNumber, sku, column, message }` for each failure
  8. Update batch: `totalRows`, `validRows`, `errorRows`
  9. If `errorRows > 0`: generate error CSV (failed rows + added `error_message` column), upload to S3, set `errorFileUrl`
  10. If `errorRows === totalRows`: set status VALIDATION_FAILED, stop
  11. Bulk-insert valid rows as DRAFT Products + ProductAttributes in a single transaction
  12. Set status to COMPLETED or COMPLETED_WITH_ERRORS
- [ ] Add to `package.json` scripts: `"worker": "ts-node workers/uploadWorker.ts"`

## Step 5.5 — Wire Up Products UI
- [ ] `/admin/products`: replace `mockProducts` with `GET /api/products` — pass status from active tab
- [ ] Status tabs: each tab calls the API with matching status param
- [ ] Search input: calls API with `search` param, debounced 300ms
- [ ] Add Product slide-over: category dropdown from `GET /api/categories` (filter to LEAF), form submits to `POST /api/products`
- [ ] Product detail slide-over: `GET /api/products/[id]`
- [ ] Submit for Review button: `POST /api/products/[id]/submit`
- [ ] Delete: `DELETE /api/products/[id]`

## Step 5.6 — Wire Up Upload UI
- [ ] Category selector: `GET /api/categories` filtered to LEAF type
- [ ] Show category attribute list from `GET /api/categories/[id]/schema`
- [ ] Download Template: `GET /api/categories/[id]/template`
- [ ] Upload file: `POST /api/upload` as multipart form
- [ ] After upload: poll `GET /api/upload/[batchId]` every 3 seconds
- [ ] Update UI state from polled status (VALIDATING spinner → results)
- [ ] Download error report: link to `errorFileUrl` from batch response
- [ ] Remove the dev success/error toggle from the UI

## Step 5.7 — Wire Up Upload History UI
- [ ] `/admin/upload-history`: `GET /api/upload`
- [ ] Batch detail slide-over: `GET /api/upload/[batchId]`
- [ ] Download error report button: links to `errorFileUrl`

---

# PHASE 6 — Admin: Review & Users Backend
> Wire up `/admin/review`, `/admin/schema-requests`, `/admin/users`.

## Step 6.1 — Wire Up Review UI
- [ ] `/admin/review`: `GET /api/products?status=IN_REVIEW`
- [ ] Approve button: `POST /api/products/[id]/approve`
- [ ] Reject button: `POST /api/products/[id]/reject` with comment
- [ ] Request Changes: `POST /api/products/[id]/request-changes` with comment
- [ ] After any action: remove card from list, update count in subtitle

## Step 6.2 — Wire Up Schema Requests UI
- [ ] `/admin/schema-requests`: `GET /api/schema-requests`
- [ ] Status tabs filter the list
- [ ] Approve/Reject slide-over: `PATCH /api/schema-requests/[id]`

## Step 6.3 — Users API
- [ ] `GET /api/users`: all users — SUPER_ADMIN only
- [ ] `POST /api/users`: create user — SUPER_ADMIN only. Body: `name`, `email`, `role`, temporary password
- [ ] `PATCH /api/users/[userId]`: update `role` or `isActive` — SUPER_ADMIN only

## Step 6.4 — Wire Up Users UI
- [ ] `/admin/users`: `GET /api/users`
- [ ] Invite slide-over: `POST /api/users`, show toast with temp password
- [ ] Edit Role popover: `PATCH /api/users/[id]`
- [ ] Deactivate/Reactivate toggle: `PATCH /api/users/[id]` with `isActive`

## Step 6.5 — Wire Up Dashboard Stats
- [ ] `GET /api/admin/stats`:
  - Total published products
  - Products awaiting review
  - Products in draft
  - Categories with zero products (incomplete setup)
  - Last 5 upload batches
- [ ] Replace any hardcoded numbers on admin dashboard overview with real stats

---

# PHASE 7 — Public Catalog: /products Routes
> Build the customer-facing catalog. Homepage at `/` is untouched.
> All catalog browsing starts at `/products`.

## Step 7.1 — /products Entry Page
- [ ] `app/products/page.tsx`
- [ ] Fetches all top-level categories: `depth = 0`, `isActive = true`, `type = BRANCH`
- [ ] Renders a grid of category cards
- [ ] Each card: category image (or placeholder icon), name, description, child count
- [ ] Clicking navigates to `/products/[slug]`
- [ ] `revalidate: 3600`

## Step 7.2 — Dynamic Route Resolution
- [ ] `app/products/[...path]/page.tsx`
- [ ] The `path` array = URL segments e.g. `["fasteners", "bolts", "hex-bolts"]`
- [ ] Resolution logic (run in this order):
  1. Find category where `pathSlugs` matches the full `path` array
  2. If found and type = BRANCH → render `<BranchCategoryPage category={category} />`
  3. If found and type = LEAF → render `<LeafCategoryPage category={category} searchParams={searchParams} />`
  4. If not found as a category: take all segments except the last, find category by that path, check if last segment is a product SKU in that category → render `<ProductDetailPage>`
  5. If still not found: `notFound()` → 404
- [ ] `generateStaticParams`: pre-generate paths for depth 0 and depth 1 categories
- [ ] `revalidate: 3600`

## Step 7.3 — Branch Category Page
- [ ] `components/public/BranchCategory/index.tsx`
- [ ] Breadcrumb at top — built from `pathNames` array, each segment links to its path
- [ ] Page heading = category name
- [ ] Description if set
- [ ] Grid of child category cards — same card design as the `/products` entry page
- [ ] LEAF children: show product count badge on card
- [ ] BRANCH children: show subcategory count badge

## Step 7.4 — Leaf Category Page — The Core McMaster Feature
- [ ] `components/public/CategoryTable/index.tsx`
- [ ] Server component reads filter values from URL `searchParams`
- [ ] Fetch category's attribute schema
- [ ] Build Prisma WHERE clause using `lib/filterBuilder.ts`:
  - Always: `status = PUBLISHED`, `categoryId = [this category]`
  - RANGE attribute: `?length_min=1&length_max=3` → `numericValue >= 1 AND numericValue <= 3`
  - CHECKBOX_LIST attribute: `?material=steel&material=aluminum` → `rawValue IN ['steel','aluminum']`
  - TOGGLE: `?in_stock=true` → `inStock = true`
  - Combine all with AND
- [ ] Fetch paginated products with attributes: `?page=1&limit=50`

- [ ] **Table:**
  - Sticky header row
  - One column per attribute where `isVisibleInTable = true`, ordered by `sortOrder`
  - Column header: attribute name + unit in parens e.g. "Length (in)"
  - Clicking column header sorts by that column — add `?sort=length&dir=asc` to URL and re-render
  - Each product row shows the value for each attribute column
  - Final two columns: Price (right-aligned) | Add to Cart button
  - Alternating row background
  - Row hover highlight
  - Clicking a row navigates to product detail page

- [ ] **Filter Panel** (`components/public/CategoryTable/FilterPanel.tsx`):
  - Left sidebar, 260px wide, sticky on scroll
  - Collapsible on mobile — show active filter count badge on toggle button
  - Active filter chips at top with × to remove individual filters
  - "Clear All" button
  - One accordion section per attribute where `isFilterable = true`
  - RANGE: Min and Max number inputs + Apply button → updates URL params
  - CHECKBOX_LIST: checkboxes showing value + product count for each. Checking/unchecking immediately updates URL
  - TOGGLE: labeled switch, toggling updates URL

- [ ] **Pagination:**
  - "Showing 1–50 of 142 products" text
  - Previous / Next buttons
  - Updates `?page=` param in URL

## Step 7.5 — Product Detail Page
- [ ] `components/public/ProductDetail/index.tsx`
- [ ] URL example: `/products/fasteners/bolts/stainless-steel-hex-bolts/91257A123`
- [ ] Layout:
  - Breadcrumb — full category path from `pathNames` + product name at end
  - Product name (h1) and SKU (monospace, muted)
  - Image gallery — main image + thumbnail strip. Generic placeholder if no images
  - Right column:
    - Price (large)
    - Stock status — "In Stock" green or "Out of Stock" red
    - Lead time — "Ships in [N] business days" if `leadTimeDays` set
    - Quantity input (minimum = `minOrderQty`, step = 1)
    - Add to Cart button (full width)
    - Download Spec Sheet button — only if `pdfSpecUrl` set
  - Spec Table below (`components/public/ProductDetail/SpecTable.tsx`):
    - Two columns: Attribute Name | Value
    - Only show attributes where `isVisibleInSpec = true`
    - Append unit to value e.g. "1 in" or "25 mm"
    - Ordered by `sortOrder`
  - Related Products — 6 products from the same LEAF category, excluding this product

---

# PHASE 8 — Search

## Step 8.1 — Search Index Setup
- [ ] Set up Typesense (Docker for local, Typesense Cloud for production) or Algolia
- [ ] Index schema:
  - Fields: `id`, `sku`, `name`, `categoryId`, `categoryName`, `categoryPath`, `price`, `inStock` + one field per common attribute slug
  - Searchable: `name`, `sku`, attribute values
  - Filterable: `categoryId`, `inStock`, attribute values
- [ ] Create `lib/searchIndexer.ts`:
  - `indexProduct(product)` — upserts product into search index
  - `removeProduct(productId)` — removes from index
- [ ] Call `indexProduct` inside the approve API route
- [ ] Call `removeProduct` inside the archive route

## Step 8.2 — Search API
- [ ] `GET /api/search?q=hex+bolt&page=1&limit=20`
- [ ] Proxies to Typesense/Algolia
- [ ] Returns: array of `{ id, sku, name, categoryPath, price, firstImageUrl }`

## Step 8.3 — Search UI
- [ ] `SearchBar` component in the public site header (do not touch admin header)
- [ ] Instant dropdown: debounce 200ms, show top 5 results
- [ ] Each dropdown result: product name, SKU, category path, price
- [ ] Enter key or "See all results" → `/search?q=...`
- [ ] `/search` page: full results using same FilterPanel component as catalog
- [ ] Category facet list in sidebar: group results by category with counts, clicking filters by category

---

# PHASE 9 — Testing & Quality Assurance

## Step 9.1 — API Tests
- [ ] Category CRUD: test blocking LEAF→BRANCH when products exist, BRANCH→LEAF when children exist
- [ ] Attributes: test all dataType/filterType combos, test locked fields when products exist
- [ ] Product create: required attributes, number parsing, SELECT value validation
- [ ] CSV upload: all valid rows → COMPLETED, mixed → COMPLETED_WITH_ERRORS, all invalid → VALIDATION_FAILED
- [ ] Filter builder: test RANGE + CHECKBOX_LIST + TOGGLE all combined
- [ ] Review workflow: DRAFT → IN_REVIEW → PUBLISHED end-to-end
- [ ] Review workflow: REJECTED → edit → republish end-to-end

## Step 9.2 — UI Tests
- [ ] Admin category tree: expand/collapse, add, edit, deactivate
- [ ] Schema builder: add/edit/reorder/delete, locked fields behave correctly
- [ ] Upload flow: success path and error path, polling updates correctly
- [ ] Public filter panel: URL updates on every filter type, clear all works
- [ ] Route resolution: branch, leaf, and product detail all resolve from correct URLs
- [ ] Product detail: correct spec table columns for the right category

## Step 9.3 — Data Integrity
- [ ] No BRANCH category has products
- [ ] No LEAF category has child categories
- [ ] No product has an attribute referencing a deleted CategoryAttribute
- [ ] All PUBLISHED products have all required attributes filled
- [ ] All attribute slugs within a category are unique

---

# PHASE 10 — Deployment

## Step 10.1 — Provision Services
- [ ] PostgreSQL: Railway, Neon, Supabase, or AWS RDS
- [ ] Redis: Upstash or Redis Cloud
- [ ] S3 or Cloudflare R2 — configure CORS for your domain
- [ ] Typesense Cloud or Algolia account

## Step 10.2 — Deploy Application
- [ ] Deploy Next.js to Vercel or Railway
- [ ] Deploy BullMQ worker as a separate background service (Railway worker or AWS ECS)
- [ ] Set all environment variables in deployment dashboard
- [ ] Run `npx prisma migrate deploy` against production DB
- [ ] Seed only the SUPER_ADMIN user in production — no sample data

## Step 10.3 — Post-Deploy Checklist
- [ ] Homepage at `/` is completely untouched and renders correctly
- [ ] Admin login at `/admin/login` works
- [ ] Create category → add schema → upload CSV → review → publish full flow works
- [ ] Published product appears at `/products/[path]/[sku]`
- [ ] Filter panel filters correctly on live data
- [ ] Search returns results
- [ ] Worker processes uploads in the background

---

# CURSOR AI SESSION RULES — Paste at the start of every session

1. **Existing project.** Next.js already exists. Homepage at `/` must not be touched. Admin UI at `/admin/...` already built with mock data.

2. **Products live at `/products`, not `/`.** Homepage is company info. The catalog starts at `/products`. Product URLs are `/products/[category-path]/[sku]`.

3. **BRANCH vs LEAF.** Categories are BRANCH (navigation, no products) or LEAF (holds products, has attribute schema). Never allow products in a BRANCH. Never allow child categories under a LEAF.

4. **Attribute schemas are per-category.** The product upload form and CSV template are dynamically generated from whichever LEAF category is selected. There is no single global product form.

5. **Products start as DRAFT.** They go DRAFT → IN_REVIEW → PUBLISHED before appearing on the public site. Never show non-PUBLISHED products to customers.

6. **CSV uploads are async.** The upload endpoint accepts the file and returns a batchId immediately. All processing happens in the BullMQ worker. The UI polls `/api/upload/[batchId]` for status.

7. **Filters are URL-driven.** All active filters live in URL search params. Server reads params, builds Prisma WHERE clause, renders filtered results. No filter state stored in client memory.

8. **Schema changes are protected.** Once products exist in a category, `dataType` and `slug` on attributes are locked. Changes go through SchemaChangeRequest workflow, not direct edits.

9. **Slugs are permanent.** Category slugs and attribute slugs are used in URLs and as data keys. Once in use, never change without a migration.

10. **Add, don't restructure.** Only add new files and API routes. Replace mock data imports one page at a time. Do not rewrite existing components.
