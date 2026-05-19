# Kamesh Kumar — Internship Project (1851)

NestJS + TypeORM + PostgreSQL backend for a multi-role content platform:
admins manage everything, brands publish articles, and authors write for the
brands they're approved for. A public feed surfaces only published articles.

## Stack

- **NestJS 10** (Express platform)
- **TypeScript 5**
- **PostgreSQL** + **TypeORM 0.3** (migrations-based)
- **Passport JWT** for auth
- **class-validator** + **class-transformer** for DTO validation
- **bcrypt** for password hashing
- **@nestjs-modules/mailer** (nodemailer) for transactional mail
- **Jest** + **supertest** for unit / e2e tests

## Quick start

```bash
npm install
cp .env.example .env             # then fill in DB + JWT + (optional) SMTP
npm run migration:run            # applies all migrations
npm run start:dev                # boots on http://localhost:3000
```

The first boot also seeds a default admin account (`admin@email.com` /
`admin`, configurable via env). Restart is idempotent — the seeder
short-circuits if the admin already exists.

## Configuration

All config is env-driven via `@nestjs/config`. Copy `.env.example` to `.env`
and fill in:

```env
PORT=3000

# Postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_NAME=

# Auth
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=1d

# Default admin seeded on first boot
ADMIN_EMAIL=admin@email.com
ADMIN_PASSWORD=admin

# SMTP (leave blank to disable real sending — emails are logged instead)
MAIL_HOST=
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=
MAIL_PASS=
MAIL_FROM=noreply@kamesh-1851.local
```

The mail service has a no-op fallback: if `MAIL_HOST` is blank,
`MailService.sendBrandWelcomeEmail` logs the rendered email and returns —
brand-user creation still succeeds. Useful for engineers who don't want to
wire SMTP locally.

## Database

### Requirements

- PostgreSQL 13+ (uses `gen_random_uuid()` / `uuid-ossp` and trusted enum
  ALTER patterns).
- A database the configured DB user owns (or has CREATE on `public`).
- `uuid-ossp` extension installed in that database
  (`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`).

### Migrations

The project uses managed migrations (no `synchronize: true`). All scripts go
through `typeorm-ts-node-commonjs`:

```bash
npm run migration:generate -- src/migrations/<Name>   # diff against entities
npm run migration:create   -- src/migrations/<Name>   # empty migration
npm run migration:run                                 # apply pending
npm run migration:revert                              # rollback last applied
npm run migration:show                                # list applied / pending
```

`AppModule` is configured with `migrationsRun: true`, so a clean
`npm run start:dev` will also apply any pending migrations on boot.

## Project layout

```
src/
  admin/         # admin-only endpoints + composed @AdminOnly() decorator
  articles/      # Article entity, CRUD, public feed, status flow
  auth/          # JwtStrategy, guards, decorators, login flow
  brands/        # Brand + BrandAuthor entities, CRUD, profile reads
  mail/          # MailerModule wrapper + welcome-email helper
  migrations/    # generated TypeORM migrations
  seeders/       # admin seeder (OnApplicationBootstrap)
  users/         # User entity, UsersService, Role enum
  app.module.ts  # composition root
  data-source.ts # CLI DataSource for the typeorm CLI
  main.ts        # bootstraps Nest + global ValidationPipe
```

## Authentication & roles

JWT auth via `Passport`. Three roles: `ADMIN`, `BRAND`, `AUTHOR`.

- Tokens carry `{ sub, email, role }` and are issued by `POST /auth/login`.
- Every authenticated request triggers `JwtStrategy.validate`, which
  re-fetches the user from the DB and attaches `{ id, email, role, brandId }`
  to `req.user`. Deleted or revoked users stop working without a token
  refresh.
- Per-route gating uses one of three patterns:
  - `@AdminOnly()` — composed decorator in `admin/`. Bundles `JwtAuthGuard`,
    `RolesGuard`, and `@Roles(Role.ADMIN)`.
  - `@UseGuards(JwtAuthGuard, BrandOwnerOrAdminGuard)` — `brands/` resource
    where the brand-user owning the row may also write.
  - `@UseGuards(JwtAuthGuard)` — endpoints open to any authenticated user;
    visibility filtering happens in the service.

## API surface

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | Returns `{ accessToken, user }` |
| POST | `/admin/users` | ADMIN | Creates ADMIN, BRAND, or AUTHOR user. BRAND creates trigger a welcome email |
| POST | `/admin/brands/:brandId/authors` | ADMIN | Approves an AUTHOR for a brand |
| POST | `/brands` | ADMIN | Creates a brand, atomically binding it to an unbound BRAND user |
| GET | `/brands` | any auth | Paginated. Non-admin sees only APPROVED |
| GET | `/brands/:id` | any auth | Profile + `publishedArticleCount`. 404 if DISAPPROVED and caller is not admin |
| GET | `/brands/:id/articles` | any auth | Paginated PUBLISHED articles. Brand visibility checked first |
| PATCH | `/brands/:id` | ADMIN or brand owner | Updates brand fields + bound user credentials (transactional) |
| PATCH | `/brands/:id/status` | ADMIN | Flip APPROVED / DISAPPROVED |
| DELETE | `/brands/:id` | ADMIN | |
| POST | `/articles` | ADMIN / BRAND (own brand) / AUTHOR (approved for brand) | |
| GET | `/articles` | ADMIN / BRAND / AUTHOR | Paginated, role-scoped, optional status / brandId filter |
| GET | `/articles/:id` | ADMIN / BRAND (own brand) / AUTHOR (own article) | |
| PATCH | `/articles/:id` | Same as read scope | |
| PATCH | `/articles/:id/status` | ADMIN | Flip DRAFT / PUBLISHED. Auto-sets `publishedAt` on first publish |
| DELETE | `/articles/:id` | Same as read scope | |
| GET | `/public/articles` | public | Paginated published articles. Query: `page, limit, sortBy, order, q, brandId` |
| GET | `/public/articles/:id` | public | 404 for DRAFT — opaque to outsiders |

### Common response shapes

```jsonc
// Paginated lists
{
  "data": [ /* ... */ ],
  "total": 42,
  "totalPages": 5,
  "currentPage": 1
}

// Brand profile
{
  "id": 1,
  "name": "Nike",
  "status": "APPROVED",
  "publishedArticleCount": 12,
  "createdBy": { "id": "...", "email": "admin@...", "role": "ADMIN" },
  /* ... */
}

// Article read
{
  "id": 1, "title": "...", "content": "...", "status": "PUBLISHED",
  "publishedAt": "2026-05-15T...",
  "brand": { /* ... */ },
  "author": { "id": "...", "email": "bob@...", "role": "AUTHOR" /* no password */ },
  /* ... */
}
```

## Security notes

- `User.password` is `{ select: false }`. The bcrypt hash is never returned
  on a default query — only the dedicated `findByEmailForAuth` opts in via
  `addSelect`.
- Public signup was deliberately removed: every user enters through
  `POST /admin/users`. This keeps the data invariant
  (`ADMIN+brandId=NULL`, `BRAND+valid brandId`, `AUTHOR+brandId=NULL`)
  enforceable in one place.
- DISAPPROVED brands are invisible to non-admins. They return 404 (same as
  a non-existent id) so DISAPPROVED ids can't be enumerated.
- DRAFT articles return 404 from the public endpoint for the same reason.

## Tests

```bash
npm test               # unit tests
npm run test:watch     # watch mode
npm run test:cov       # coverage
npm run test:e2e       # e2e (uses test/jest-e2e.json)
```

Unit tests sit beside source as `*.spec.ts`; e2e specs live in `test/` as
`*.e2e-spec.ts` (separate Jest config — putting them in the wrong directory
will silently be skipped by the other runner).

## Smoke testing the API

Use any HTTP client (curl, Postman, Hoppscotch). The flow is:

1. `POST /auth/login` with the seeded admin credentials
   (`admin@email.com` / `admin`) to get an `accessToken`.
2. Send subsequent requests with `Authorization: Bearer <accessToken>`.
3. To test brand- or author-scoped endpoints, first create those users
   via `POST /admin/users` as admin, then log in as them to get their
   tokens.

## Build

```bash
npm run build          # nest build → dist/
npm run start:prod     # node dist/main
```

`nest-cli.json` has `deleteOutDir: true`, so `npm run build` clears `dist/`
each run.

## Convenience scripts

```bash
npm run lint           # eslint --fix over src/apps/libs/test
npm run format         # prettier --write over src + test
```

## Useful TS-path note

`tsconfig.json` does not currently set a `@/*` alias — imports inside `src/`
use relative paths (`../auth/...`). Keep them relative for now.
