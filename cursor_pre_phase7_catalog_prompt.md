# Cursor AI Implementation Prompt --- Pre‑Phase 7 Catalog Upload

## Context

You are working inside a **NestJS modular monolith** using
**Domain‑Driven Design (DDD)** and **Clean Architecture**.

Backend stack: - NestJS - Fastify adapter - PostgreSQL - Prisma ORM -
EventEmitter2 - AsyncLocalStorage transactions - pnpm workspace

Architecture:

Controllers ↓ Services ↓ Repositories ↓ Infrastructure (Prisma)

Rules: - Controllers must remain thin - Business logic belongs in
services - Repositories contain persistence only - Entities must NEVER
be returned from controllers - Controllers return View DTOs - Services
already exist for the catalog domain - Do NOT modify the domain model

Current status:

Auth Domain ✅ Complete\
Catalog Domain ✅ Complete\
Catalog Services ✅ Complete\
Catalog API ❌ Not implemented\
Admin Upload ❌ Not implemented

Goal: Implement the **minimal Catalog API and manual product upload
flow** before Phase 7 (Attribute System).

------------------------------------------------------------------------

# Tasks

## 1. Fix Repository Version Increment

Ensure:

ProductVariantRepository.update()

increments the optimistic locking version column.

Example:

version = version + 1

------------------------------------------------------------------------

# 2. Create Catalog Controllers

Create folder:

apps/api/src/modules/catalog/controllers

Controllers:

product.controller.ts\
category.controller.ts

Routes must be versioned:

/v1/catalog/\*

------------------------------------------------------------------------

# 3. Product Controller Endpoints

Implement:

POST /v1/catalog/products\
POST /v1/catalog/products/:productId/variants\
GET /v1/catalog/products/:id\
GET /v1/catalog/products\
PATCH /v1/catalog/products/:id

Controllers must: - validate DTO input - call ProductService - return
View DTOs

No business logic allowed.

------------------------------------------------------------------------

# 4. Category Controller Endpoints

POST /v1/catalog/categories\
PATCH /v1/catalog/categories/:id\
GET /v1/catalog/categories/tree

Use existing CategoryService.

------------------------------------------------------------------------

# 5. DTO Layer

Create:

apps/api/src/modules/catalog/dto

Files:

create-product.dto.ts\
create-variant.dto.ts\
update-product.dto.ts\
create-category.dto.ts

Example:

CreateProductDto

name: string\
slug?: string\
description?: string\
categoryId: string\
type: 'simple' \| 'variable'

CreateVariantDto

sku: string\
name?: string\
price?: number\
quantity?: number\
isDefault?: boolean

------------------------------------------------------------------------

# 6. View DTOs

Create:

apps/api/src/modules/catalog/views

Files:

product.view.dto.ts\
variant.view.dto.ts\
category.view.dto.ts

Example ProductViewDto:

id\
name\
slug\
status\
categoryId\
createdAt\
updatedAt

------------------------------------------------------------------------

# 7. Pagination

Use existing shared DTOs:

PaginatedResponseDto\
ListResponseMeta

Endpoint:

GET /v1/catalog/products

Supports:

?page\
?pageSize

------------------------------------------------------------------------

# 8. Manual Product Upload Flow

Manual upload should be accessible from:

All Products → Add Product

Workflow:

Create Category\
↓\
Create Product\
↓\
Add Variants\
↓\
Retrieve Product

Example:

POST /v1/catalog/products

{ "name": "Hex Bolt", "slug": "hex-bolt", "categoryId": "fasteners",
"type": "variable" }

Add Variant:

POST /v1/catalog/products/{id}/variants

{ "sku": "HB-M10-50", "price": 12, "quantity": 100, "isDefault": true }

------------------------------------------------------------------------

# 9. Testing Flow

Verify:

POST /catalog/categories\
POST /catalog/products\
POST /catalog/products/:id/variants\
GET /catalog/products/:id\
GET /catalog/products\
GET /catalog/categories/tree

------------------------------------------------------------------------

# Do NOT Implement Yet

Do not add:

Attribute definitions\
Variant attribute values\
Units system\
Parametric filtering\
Pricing module\
Inventory module

These belong to **Phase 7 and later**.

------------------------------------------------------------------------

# Final Goal

Admin → All Products → Add Product → Add Variants → Retrieve Products

This confirms that the **Catalog domain services are properly connected
to the API layer** and the system is ready for **Phase 7: Attribute
System**.
