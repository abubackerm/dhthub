# McMaster‑Carr Style Platform --- System Architecture (Verdeum Engineering Spec)

## Overview

This document defines the complete architecture required to build a
McMaster‑Carr--style industrial catalog and ordering platform using:

-   **NestJS**
-   **Better Auth**
-   **PostgreSQL**
-   **Redis**
-   **MinIO**
-   **OpenSearch**
-   **Commerce Engine Logic**
-   **Inventory & SKU Services**
-   **Notification System**
-   **CDN + Edge Caching**

The system is designed to start as a scalable modular monolith and
evolve into microservices.

------------------------------------------------------------------------

## 1. Core Infrastructure Stack

  Component     Purpose
  ------------- ------------------------------------------
  PostgreSQL    Primary relational database
  Redis         Cache, sessions, queues
  MinIO         Object storage (images, PDFs, CAD files)
  OpenSearch    Advanced product search & filtering
  CDN           Edge caching for static assets
  NestJS        Backend API framework
  Better Auth   Authentication & authorization

------------------------------------------------------------------------

## 2. High-Level Architecture

    Users
      |
    CDN / Edge Cache
      |
    Next.js Frontend
      |
    API Gateway (NestJS)
      |
    -------------------------------------------------
    | Catalog | Commerce | Inventory | Auth | Notify |
    -------------------------------------------------
      |
    PostgreSQL + Redis + OpenSearch + MinIO

------------------------------------------------------------------------

## 3. Backend Services (NestJS Modules)

### 3.1 Catalog Service

Handles product data and attributes.

Responsibilities: - Categories & taxonomy - Product specs - Variants -
Technical attributes - File associations

Database: - PostgreSQL (source of truth) - OpenSearch (indexed copy)

------------------------------------------------------------------------

### 3.2 Search Service (OpenSearch)

Capabilities: - Faceted filtering - Attribute-based search - Typo
tolerance - Part-number search - Instant suggestions

Indexing Flow:

    PostgreSQL → Queue → Worker → OpenSearch

------------------------------------------------------------------------

### 3.3 Commerce Engine

Core Logic: - Cart management - Checkout - GST calculations - Bulk
pricing - MOQ enforcement - Order lifecycle - Invoice generation

Entities: - Cart - Order - Payment - Shipment - Invoice

------------------------------------------------------------------------

### 3.4 Inventory & SKU Service

Separated from catalog for performance.

Handles: - Stock levels - Warehouse mapping - SKU availability -
Reservation system

Caching Strategy: - Redis for real-time availability.

------------------------------------------------------------------------

### 3.5 Authentication (Better Auth)

Features: - JWT sessions - Role-based access - Company accounts (B2B) -
Admin permissions

Roles: - Admin - Buyer - Viewer - Operations

------------------------------------------------------------------------

### 3.6 Notification System

Channels: - Email - SMS - Push notifications (optional)

Triggers: - Order placed - Shipment updates - Account alerts

Architecture:

    Service Event → Queue → Notification Worker

------------------------------------------------------------------------

## 4. Storage Layer

### PostgreSQL

Stores: - Users - Products - Orders - Pricing - Inventory metadata

### Redis

Used for: - Cache - Sessions - Rate limiting - Job queues

### MinIO

Stores: - Product images - Manuals - Datasheets - CAD files

------------------------------------------------------------------------

## 5. Background Job System

Queue: Redis (BullMQ)

Workers handle: - Search indexing - Email sending - Image processing -
Data imports - Inventory sync

------------------------------------------------------------------------

## 6. CDN + Edge Caching

Recommended: - Cloudflare / Bunny CDN

Cached Content: - Images - PDFs - Static frontend assets

Benefits: - Reduced server load - Faster global delivery

------------------------------------------------------------------------

## 7. API Gateway Responsibilities

-   Rate limiting
-   Authentication validation
-   Request routing
-   Logging
-   API versioning

------------------------------------------------------------------------

## 8. Admin Dashboard Requirements

Features: - Bulk product import (CSV) - Price management - Inventory
updates - Order management - Customer management

------------------------------------------------------------------------

## 9. Observability & Monitoring

  Tool         Purpose
  ------------ ----------------
  Prometheus   Metrics
  Grafana      Dashboards
  Loki / ELK   Logs
  Sentry       Error tracking

------------------------------------------------------------------------

## 10. Security Requirements

-   HTTPS everywhere
-   Role-based permissions
-   Audit logs
-   API throttling
-   Input validation
-   WAF via CDN

------------------------------------------------------------------------

## 11. Deployment Model (Initial)

Single VPS Layout:

    Docker Compose
     ├── NestJS API
     ├── Worker Service
     ├── PostgreSQL
     ├── Redis
     ├── OpenSearch
     ├── MinIO
     └── Reverse Proxy (Nginx)

Future Scaling: - Separate search cluster - Dedicated worker nodes -
Read replicas for PostgreSQL

------------------------------------------------------------------------

## 12. Data Flow Example (Product Search)

    User Search
     → API
     → OpenSearch query
     → Product IDs returned
     → PostgreSQL fetch
     → Response cached in Redis
     → Sent to frontend

------------------------------------------------------------------------

## 13. Recommended Development Order

1.  Auth + Users
2.  Catalog schema
3.  OpenSearch integration
4.  Admin importer
5.  Commerce engine
6.  Inventory service
7.  Notifications
8.  CDN integration
9.  Monitoring

------------------------------------------------------------------------

## 14. Design Principles

-   Modular monolith first
-   Event-driven internal communication
-   Cache aggressively
-   Separate static vs dynamic data
-   Search-first architecture

------------------------------------------------------------------------

## 15. Future Expansion

-   Multi-warehouse logistics
-   Vendor portal
-   AI product recommendations
-   Demand forecasting
-   ERP integration

------------------------------------------------------------------------

## End of Document
