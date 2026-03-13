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
