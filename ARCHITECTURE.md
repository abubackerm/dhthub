# ARCHITECTURE.md

## Modular Monolith Architecture Guide (NestJS)

This document defines the **mandatory architectural rules** for this
project. All generated code, refactors, and features MUST follow these
rules.

------------------------------------------------------------------------

# 1. Architecture Philosophy

The system is built as a **Modular Monolith**.

Meaning: - Single NestJS application - Single deployment unit -
Domain-separated internal modules - Designed for future microservice
extraction

Principle:

> Design like microservices. Deploy as a monolith.

------------------------------------------------------------------------

# 2. Core Goals

-   Fast development speed
-   Clean domain separation
-   Long-term scalability
-   Minimal refactoring when scaling
-   Predictable AI-generated code

------------------------------------------------------------------------

# 3. Tech Stack

Backend: - NestJS (TypeScript) - PostgreSQL - Redis - Better Auth

Planned Later: - OpenSearch (search engine) - MinIO (object storage) -
CDN + Edge caching

------------------------------------------------------------------------

# 4. Project Structure

    src/
     ├ core/
     ├ shared/
     ├ modules/
     │   ├ auth/
     │   ├ catalog/
     │   ├ inventory/
     │   ├ commerce/
     │   ├ notification/
     │   └ search/
     └ main.ts

------------------------------------------------------------------------

# 5. Module Rules (VERY IMPORTANT)

Each module is a **bounded context**.

A module MUST: - Own its entities - Own its repositories - Own its
business logic - Expose services only via interfaces

A module MUST NOT: - Access another module's database tables directly -
Import another module's entities - Contain unrelated business logic

------------------------------------------------------------------------

# 6. Internal Module Structure

Each module follows:

    module-name/
     ├ controllers/
     ├ services/
     ├ entities/
     ├ repositories/
     ├ dto/
     ├ interfaces/
     ├ events/
     └ module.ts

------------------------------------------------------------------------

# 7. Communication Between Modules

Allowed: - Service interfaces - Domain events (future) - Dependency
Injection

Not Allowed: - Direct repository usage across modules - Cross-module
entity imports

Example:

GOOD:

    CommerceService → CatalogService interface

BAD:

    CommerceService → CatalogRepository

------------------------------------------------------------------------

# 8. Database Ownership

Every table has an owner module.

Example:

  Table       Owner
  ----------- -----------
  users       auth
  products    catalog
  inventory   inventory
  orders      commerce

Only the owner module modifies its tables.

------------------------------------------------------------------------

# 9. Search Abstraction Rule

Search must always use an interface.

    interface ProductSearchProvider {
      search(query: SearchDto): Promise<Product[]>;
    }

Implementations: - PostgresSearchProvider (initial) - OpenSearchProvider
(future)

Business logic MUST NOT depend on OpenSearch directly.

------------------------------------------------------------------------

# 10. Storage Abstraction Rule

Files must use an interface.

    FileStorageProvider

Implementations: - LocalStorage (dev) - MinIO (future)

------------------------------------------------------------------------

# 11. Business Logic Placement

Controllers: - Handle HTTP only

Services: - Contain business logic

Repositories: - Handle database access only

Rule: \> No business logic inside controllers.

------------------------------------------------------------------------

# 12. Shared vs Core

## shared/

Reusable utilities: - helpers - decorators - guards - common DTOs

## core/

System-wide infrastructure: - database config - redis setup - logging -
interceptors

------------------------------------------------------------------------

# 13. Event-Ready Design

Modules should emit domain events:

Examples: - OrderPlaced - InventoryReserved - UserCreated

Initial implementation may be synchronous. Future version may use
queues.

------------------------------------------------------------------------

# 14. Background Jobs

All async work must go through queues.

Examples: - email sending - search indexing - imports

Redis queues recommended.

------------------------------------------------------------------------

# 15. Dependency Rules

Allowed dependency direction:

    controllers → services → repositories

Forbidden:

    repositories → services

------------------------------------------------------------------------

# 16. Naming Conventions

-   Modules: singular domain name
-   Services: `<Domain>Service`
-   Repositories: `<Entity>Repository`
-   DTOs: `<Action><Entity>Dto`

Example:

    CreateProductDto
    OrderService
    InventoryRepository

------------------------------------------------------------------------

# 17. API Design Rules

-   REST first
-   Versioned APIs (`/v1/...`)
-   DTO validation required
-   No raw entities returned

------------------------------------------------------------------------

# 18. API Contract Stability

Views (response DTOs) are **versioned contracts**.

Rules:

-   **Add fields only** - Never remove or rename existing fields
-   **Deprecate slowly** - Mark fields as deprecated before removal
-   **No breaking changes** - Existing clients must continue to work

Views represent the public API surface. Treat them as external-facing
contracts even if internal today.

Example evolution:

    // v1 - initial
    UserView { id, email, name }

    // v2 - additive (OK)
    UserView { id, email, name, avatarUrl }

    // v3 - deprecation (OK with notice)
    UserView { id, email, name, avatarUrl, displayName, @deprecated name }

    // NEVER - breaking change
    UserView { id, emailAddress } // renamed field breaks clients

------------------------------------------------------------------------

# 19. Testing Strategy

-   Unit test services
-   Mock repositories
-   Avoid database dependency in unit tests

------------------------------------------------------------------------

# 20. Scaling Path (Future)

Step 1: Modular Monolith

Step 2: Extract heavy modules: - search - inventory

Step 3: Independent services

No rewrite required if rules followed.

------------------------------------------------------------------------

# 21. AI Assistant Instructions

When generating code:

-   Follow modular monolith structure.
-   Never introduce microservices unless explicitly requested.
-   Respect module boundaries.
-   Use interfaces for integrations.
-   Keep logic inside services.
-   Avoid tight coupling.

------------------------------------------------------------------------

# END OF ARCHITECTURE GUIDE
