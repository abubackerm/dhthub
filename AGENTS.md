# Learned Workspace Facts

- Use only global API version prefix set in `apps/api/src/main.ts` via `app.setGlobalPrefix('v1')`
- Controllers must never include version prefix in `@Controller()` decorators
- Incorrect: `@Controller('v1/pricing/variants')` results in `/v1/v1/pricing/variants`
- Correct: `@Controller('pricing/variants')` results in `/v1/pricing/variants`

- Always use `EventEmitter2` type instead of `any` for event emitter dependency injection
- Import: `import { EventEmitter2 } from '@nestjs/event-emitter'`
- Incorrect: `constructor(private readonly eventEmitter: any)` causes UnknownDependenciesException
- Correct: `constructor(private readonly eventEmitter: EventEmitter2)` resolves properly

- `DatabaseModule` exports only explicitly listed providers even with `@Global()` decorator
- PrismaService must be added to exports array to be injectable in other modules
- Default exports: `DatabaseProvider` and `'TransactionalExecutor'` token

- `DatabaseProvider` class requires explicit getter methods for each Prisma model
- Add getters like `get warehouse()`, `get inventoryLevel()`, `get inventoryMovement()` for new models
- Repositories access models via DatabaseProvider, not PrismaService directly

- Run `pnpm --filter api prisma generate` after Prisma schema changes to regenerate client types
- Failure to regenerate causes TypeScript errors for new models in repositories and services

- Use dependency injection order: Entity → Repository → Service → Controller
- Never generate controllers before services exist
- Never generate services before domain models exist

- Respect module boundaries in modular monolith architecture
- Modules must not access other module repositories or entities directly
- Business logic belongs only in services, not controllers

- Controllers must remain thin with only HTTP request/response handling
- All business logic belongs in services
- Use DTO validation for all controller inputs

- Next.js 16 uses `proxy.ts` instead of `middleware.ts` (middleware is deprecated)
- The proxy file lives at `apps/web/src/proxy.ts` and exports `default async function proxy(req)`
- Uses same API as middleware: `NextRequest`, `NextResponse`, `export const config = { matcher }`

- Auth route protection uses `AuthGuard` and `RolesGuard` from `apps/api/src/modules/auth/`
- `AuthGuard` attaches `request.session` and `request.user` from Better Auth session
- `RolesGuard` reads `request.user.role` and checks against `@Roles()` decorator metadata
- Admin-only controllers use `@UseGuards(AuthGuard, RolesGuard)` + `@Roles('admin', 'super_admin')`

- Auth pages use `(auth)` route group, so URLs are `/sign-in`, `/sign-up`, `/forgot-password` (no `/auth/` prefix)
- All internal links must use these routes without the `/auth/` prefix

- Use canonical Tailwind CSS variable syntax for project's DHT theme colors and variables
- Always use `text-(--dht-red)` instead of `text-[var(--dht-red)]`
- Always use `bg-(--dht-darker)` instead of `bg-[var(--dht-darker)]`
- Always use `hover:text-(--dht-red-hover)` instead of `hover:text-[var(--dht-red-hover)]`
- Data-slot selectors: `**:data-[slot=dialog-close]:text-white` instead of `[&_[data-slot=dialog-close]]:text-white`
- This pattern applies to all `--dht-*` custom CSS variables in the workspace

- Fix React hydration mismatches when server/client render differently based on auth state
- Use `useState` with initial value matching server render, then update in `useEffect`
- Example: `const [isAdmin, setIsAdmin] = useState(false)` + `useEffect(() => setIsAdmin(userRole === 'admin'), [userRole])`
- Ensures initial render matches server HTML, then updates client-side after hydration
- Required when using `authClient.useSession()` in client components with conditional rendering

- Use `authClient.useSession()` from `@/lib/auth-client` in client components for auth state
- Session data includes `session.user` object with optional properties like `role`
- Check authentication: `const isAuthenticated = !!session?.user`
- Access user data: `const userName = session?.user?.name || "Profile"`
- For role checks: `const userRole = (session?.user as { role?: string } | undefined)?.role`

- React Query `invalidateQueries` requires parent key for partial key matching
- Invalidating `cellKeys.lists()` (e.g., `['cells', 'list']`) doesn't match specific queries like `['cells', 'list', {categoryId: 'xxx'}]`
- Use parent key `cellKeys.all` (e.g., `['cells']`) to invalidate all child queries automatically
- This pattern applies when queries use derived keys that include parameters beyond the base key

- Dark/light mode theme is STRICTLY scoped to the dashboard — NEVER apply it globally
- `ThemeProvider` must ONLY live in `apps/web/src/app/(dashboard)/dashboard-client.tsx`, NEVER in root layout
- The root layout (`apps/web/src/app/layout.tsx`) must NOT import or render `ThemeProvider` or `SidebarConfigProvider`
- `ThemeProvider` renders a `<div data-dashboard-theme>` wrapper with `dark`/`light` class — it does NOT touch `document.documentElement`
- The Tailwind dark variant in `globals.css` is `@custom-variant dark (&:is([data-dashboard-theme].dark *));`
- The `.dark` CSS variable block in `globals.css` uses `[data-dashboard-theme].dark` selector, not bare `.dark`
- `useThemeManager` and `useCircularTransition` must use `document.querySelector('[data-dashboard-theme]')` instead of `document.documentElement`
- The theme-init script in `<head>` sets `data-dashboard-resolved-theme` attribute on `<html>`, NOT `dark`/`light` classes
- Public website pages (`(home)`, `about`, `products`, `(auth)`) always render in light mode with no theme switching

- NestJS `ImportProgressService` has `markFailed(jobId, error)` method with error parameter
- NestJS `ImportJobService` has `markAsFailed(jobId)` method with only jobId parameter
- Import job services have different method signatures: ProgressService accepts error, JobService does not
- Always verify method names and signatures when using services across different contexts

- Use `forwardRef()` to resolve circular dependencies between modules
- Circular dependency occurs when ModuleA imports ModuleB and ModuleB imports ModuleA
- Wrap module imports with `forwardRef(() => ModuleName)` in the imports array
- Both modules involved must use `forwardRef()` for consistent resolution
- Common pattern: ImportModule ↔ CatalogAttributesModule need forward references

- Export all services from modules that are needed by other modules
- `ImportModule.exports` determines what's available to importing modules
- Required services like `ImportProgressService`, `ZipExtractorService` must be explicitly exported
- Missing exports cause `UnknownDependenciesException` when services are injected but not available
- Services needed by multiple modules should be exported from their source module

- ZIP file imports use worker-based architecture with BullMQ for async processing
- Standalone workers live in `apps/workers/` directory (e.g., `catalog-import.worker.ts`)
- Workers consume from Redis queues and call API endpoints to process actual import
- Workers use internal controllers (no auth) as trusted callers from worker processes
- ZIP files are saved to `uploads/import/{year}/{month}/` with timestamp-based filenames
- Import flow: Frontend upload → Save file & create job → Emit event → Enqueue to BullMQ → Worker processes
- Workers enable resource-intensive operations (ZIP extraction, large CSV imports) without blocking API requests
- Worker controllers provide internal endpoints like `/v1/import/worker/process-catalog` for worker callbacks
- BullMQ queues configured with retry logic (3 attempts, exponential backoff) and job cleanup policies
- ZIP extraction uses `adm-zip` library for small files, `unzipper` for streaming large files
- Use `unzipper.Open.file()` with `for...of` loop for controlled async iteration — NOT `.on("entry", async ...)` which doesn't properly await streams
- Multiple CSV files can be bundled in ZIP: products.csv, variants.csv (required), attributes.csv, images.csv
- When multiple processors listen to the same event (e.g., `JOB_CREATED`), use a discriminator field like `importType` to filter relevant jobs
- Workers entry point (`apps/workers/index.ts` or package.json script) should start all workers, not just one specific worker

- The `importType` field in `ImportJob` is mandatory for proper job routing to processors
- `/v1/import/jobs` endpoint must pass `importType: ImportType.CATALOG` to `uploadZip()` call
- When `importType` is `null`, `CatalogImportProcessorService` skips the job (checks `event.importType !== 'CATALOG'`)
- Jobs with null `importType` never get enqueued to BullMQ queue
- Global CSS overrides in `globals.css` can take precedence over Tailwind utility classes
- Example: `.cell-product-table th` in `globals.css` overrides `TableHead` component styling
- When styles don't apply, check `globals.css` for existing global style that may override component-level styling

- SKU-based image storage uses hash-based paths with MD5 of full SKU (not first 3 chars)
- Preload SKU maps in-memory for O(1) lookups during batch imports (100x faster than per-item DB queries)
- Workers must listen to correct queue names (e.g., `image-processing` not `catalog-import`) to prevent infinite loops
- Always use `@@unique([variantId, position])` for primary image queries in Prisma schema
- Frontend should use `variant.images.find((img) => img.isPrimary)?.url` for primary image display
- Frontend should fall back to `product.images` if `variant.images` is empty for backward compatibility
- API server requires restart for TypeScript changes (doesn't hot-reload middleware or proxy)
- Workers require separate restart for queue configuration changes to take effect
- Always validate job status and implement idempotency checks before processing
- Use BullMQ's exponential backoff for retries with comprehensive logging prefixes like `[ImageImport]`
- SKU prefixes: Categories use `CG-{8 chars}`, Cells use `C-{8 chars}`, Products use `P-{8 chars}`
- Always convert `storagePath` to `url` in controllers/views for frontend compatibility

- Worker entry point must start all workers simultaneously (e.g., `tsx index.ts` or `pnpm --filter workers dev`)
- Running individual worker files directly bypasses the index that starts all workers, causing some workers to never run and leaving jobs stuck in PENDING
- Both CatalogImportWorker and AttributeImportWorker should be started together via the index, not run independently

- Import type specific file requirements in ZIP validation
- Catalog imports require `variants.csv` (or `variants_template.csv`) plus optional `attributes.csv` and `images.csv`
- Attribute imports only require `attributes.csv` and optionally `attribute-options.csv` - they do NOT need `variants.csv`
- ZIP validation must check `importType` discriminator and apply correct file requirements per import type
- Attribute import jobs failing with "variants.csv is required" when importType is ATTRIBUTES indicates validation logic error

- Authenticated endpoints can use optional DTOs with session-based defaults
- For `/v1/enquiries/from-cart`, create separate `CreateEnquiryFromCartDto` with all optional fields
- Service should fall back to authenticated user's name/email from session when DTO fields are not provided
- This allows frontend to send empty object `{}` while still populating required customer data

- Enquiry status values must match database enum exactly
- Database statuses: SUBMITTED, IN_PROGRESS, QUOTED, AWAITING_CONFIRMATION, CONFIRMED, PAYMENT_PENDING, PAID, PROCESSING, IN_TRANSIT, DELIVERED
- Local StatusTimeline components must use correct database values, not non-existent ones like "COMPLETED" or "CLOSED"
- Shared admin StatusTimeline component already has correct values

- Postgres MCP is invoked via `CallMcpTool` with server `user-postgres-mcp`, tool `execute_sql`, and argument `{ "sql": "..." }`
- Tool schema located at `mcps/user-postgres-mcp/tools/execute_sql.json`
- Database uses snake_case column names (e.g., `category_id`, `created_at`) even though Prisma maps to camelCase
- Example: `CallMcpTool({ server: "user-postgres-mcp", toolName: "execute_sql", arguments: { sql: "SELECT * FROM cells LIMIT 5;" } })`
- Tables are lowercase (e.g., `cells`, not `Cell`) — check `information_schema.tables` if unsure of table names

- This project uses Fastify (not Express) as the NestJS HTTP adapter
- Use `FastifyRequest` type from `fastify` instead of `Request` from `express`
- Access headers via `request.headers['header-name']` (plain object), NOT `request.headers.get('header-name')` (Headers API)
- Example: `const ip = request.headers['x-forwarded-for']` for Fastify vs `request.headers.get('x-forwarded-for')` for Express

- Escape curly braces in JSX text content to avoid parsing errors
- Use HTML entities: `{` → `&#123;` and `}` → `&#125;`
- Example: `P-&#123;8 chars&#125;` displays as "P-{8 chars}" without breaking JSX parsing
- Curly braces in JSX are interpreted as JavaScript expressions unless escaped

- All Lucide-react icons used in components must be explicitly imported
- Import pattern: `import { Info, Search, Upload } from 'lucide-react'`
- Using an icon without importing it causes ReferenceError at runtime

- ImportMode enum controls product/variant creation vs update behavior
- `CREATE_ONLY`: Creates new records only, errors if SKU exists
- `UPDATE_ONLY`: Updates existing records only, errors if SKU not found
- `UPSERT`: Updates existing or creates new (default for flexibility)

- Import uploads migrated from local filesystem to SeaweedFS via StorageService
- ImportService and ZipExtractorService use `StorageService.uploadFile()` instead of `fs.writeFileSync()`
- Files stored at keys like `imports/{year}/{month}/{timestamp}-{filename}`
- Extracted files stored at `imports/{year}/{month}/extracted/{timestamp}-{filename}`
- Cleanup methods delete from SeaweedFS instead of local filesystem

- Products without variants are invisible across ALL display layers (admin and public)
- Admin CellsPage CellSku/CellStock/CellPrice components compute values from variants only
- Public LeafCategoryPage and ConsolidatedLeafCategoryPage return null for products with 0 variants
- CSV import must create a default variant (via `ProductVariantRepository`) after creating each product
- Frontend components should fall back to product-level data when no variants exist

- `ProductService.create()` auto-generates SKU when null using `P-{8 chars}` format
- `ProductService.create()` accepts optional `status` parameter (defaults to `DRAFT`)
- CSV import passes `ProductStatus.ACTIVE` so imported products are immediately visible
- Default variant SKU format: `V-{8 hex chars}` with `isDefault: true` and empty `attributes: {}`

- `category_attributes` table must be populated for filter sidebar to work on category pages
- `processVariantBatch()` must auto-create `category_attributes` via upsert with `@@unique([categoryId, attributeId])`
- `category_attributes` table schema has only: id, category_id, attribute_id, created_at (no is_required, sort_order, or updated_at)
- Filter sidebar queries filter on `attribute: { isFilterable: true }` joined through `category_attributes`
- Categories missing `category_attributes` links will show empty filter sidebar even if attributes exist on variants

- VPS production deployment for www.verdeum.in on OVH VPS (Ubuntu 22.04, 4 CPU, 7.6GB RAM, 73GB disk)
- Infrastructure: Docker for Postgres 18.3, Redis 8.6.0, Meilisearch v1.8, SeaweedFS 4.16; PM2 for NestJS API, Next.js 16, BullMQ workers; Nginx reverse proxy with Certbot SSL
- Deploy files live in `deploy/` directory: docker-compose.infra.yml, ecosystem.config.js, nginx configs, setup-vps.sh, deploy.sh, .env.production
- Future deploys: `ssh ovh-dht && cd /opt/dynamic_hub && ./deploy/deploy.sh` (pulls code, installs deps, builds, migrates, restarts PM2)
- PM2 ecosystem config must load .env from project root and inject into all process envs (workers need REDIS_PASSWORD etc.)
- Shell script bin entries (node_modules/.bin/next, node_modules/.bin/tsx) cannot be used as PM2 script directly — use actual JS entry points (node_modules/next/dist/bin/next, node_modules/tsx/dist/cli.mjs) with `interpreter: 'node'`
- Redis for BullMQ must use `--maxmemory-policy noeviction` (not allkeys-lru) to prevent job data loss
- PowerShell on Windows mangles `$VARIABLE` and heredoc syntax when wrapping SSH commands — use single quotes to prevent local interpolation
- Certbot requires HTTP-only nginx config first, then SSL config after certs are obtained
- Prisma migrations may have gaps (tables created via db push but no migration files) — resolve by db push + migrate resolve --applied on fresh DB
