# Folio Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running monorepo where a person can sign up with email and password, log in, see their (empty) Room, and log out, with the session stored server-side in Postgres.

**Architecture:** pnpm + Turborepo monorepo. `apps/api` is a NestJS API backed by Postgres through Prisma 7, using opaque session tokens in an httpOnly cookie. `apps/web` is a Next.js App Router site that forwards `/api/*` to the API, so the browser only talks to one origin. `packages/shared` holds the zod schemas and limits used by both sides, and `packages/tokens` holds the prototype's colors and fonts as CSS variables.

**Tech Stack:** Node 22, pnpm 12.5.1, Turborepo 2, TypeScript 6.0.3, NestJS 12, Prisma 7.10.1 with `@prisma/adapter-pg`, PostgreSQL 17 (Docker), argon2, Next.js 16, React 19, Tailwind CSS 4, zod 4, Vitest 5, Testing Library, supertest.

**Spec:** `docs/superpowers/specs/2026-11-06-folio-platform-design.md` (this plan is Phase 1, "Foundation").

## Global Constraints

- **No git from the executor.** The owner runs all git commands. Every "Commit" step means: stop and hand the owner the listed commands. Never run `git add`, `commit`, `checkout`, `reset` or similar.
- Node `>=22`; `"packageManager": "pnpm@12.5.1"` in the root `package.json`.
- Pin `prisma`, `@prisma/client` and `@prisma/adapter-pg` to `7.10.1`. npm's `latest` tag points at `8.0.0-rc.*`; do not use it.
- Pin `typescript` to `6.0.3` in every package. TypeScript 7 (the native compiler) is not used.
- Package names: `@folio/web`, `@folio/api`, `@folio/shared`, `@folio/tokens`.
- Ports: web `3000`, api `4000`, Postgres `5432`.
- Local database: user, password and database `folio`; the test database is `folio_test` in the same container.
- Session cookie name: `folio_session`, exported from `@folio/shared` as `SESSION_COOKIE_NAME`. Session lifetime: 30 days.
- Limits: email at most 254 characters; password 8 to 128 characters; display name 1 to 50 characters after trimming.
- All user-facing copy is exactly as written in this plan.
- Tests are written first and must fail before the implementation is written.
- Every API error response body has the shape `{ message: string, fields?: Record<string, string> }`.

## Review Focus

1. **The same email typed differently** (`" Ana@Example.COM "` at sign up, `ana@example.com` at login) must reach the same account. Pinned in Task 1 (schema normalization) and Task 5 (e2e login with a different case).
2. **Signing up twice with the same email,** including a different case, must return the 409 message, not a 500. Pinned in Task 5.
3. **A stale cookie** (the session is expired or was deleted while the browser still has the cookie) must land the person on `/login` once, without a redirect loop between `/` and `/login`. Pinned in Task 7 (the `routeDecision` tests plus the `/session-expired` route).
4. **A huge password** (10,000 characters) must be rejected with 400 before any hashing happens. Pinned in Task 1 (schema) and Task 5 (e2e).
5. **The API being unreachable** while the web app is used must show a friendly message, not a blank page or an unhandled error. Pinned in Task 6 (form network error) and Task 7 (`getCurrentUser` throws, and `error.tsx` renders).

---

## File Structure

```
folio/
├── package.json                 root scripts, packageManager, engines
├── pnpm-workspace.yaml          apps/*, packages/*
├── turbo.json                   build/dev/test/lint/typecheck pipeline
├── tsconfig.base.json           strict shared compiler options
├── .gitignore  .prettierrc  .nvmrc
├── docker-compose.dev.yml       Postgres 17
├── docker/postgres/init.sql     creates folio_test
├── README.md
├── packages/
│   ├── shared/                  zod schemas, limits, PublicUser, ApiError (built with tsup → dist, ESM + CJS)
│   │   └── src/{index.ts, auth.ts, auth.test.ts}
│   └── tokens/
│       └── folio.css            prototype CSS variables + paper themes
└── apps/
    ├── api/
    │   ├── prisma/schema.prisma  prisma.config.ts  .env.example
    │   ├── src/main.ts                 bootstrap
    │   ├── src/app.module.ts
    │   ├── src/app.setup.ts            configureApp(app): cookie parser, shutdown hooks
    │   ├── src/config/env.ts (+ env.spec.ts)
    │   ├── src/prisma/{prisma.module.ts, prisma.service.ts}
    │   ├── src/health/health.controller.ts
    │   ├── src/common/zod-validation.pipe.ts
    │   ├── src/auth/{auth.module.ts, auth.controller.ts, auth.service.ts, password.ts (+spec),
    │   │             session.service.ts (+spec), session.guard.ts, current-user.decorator.ts, public-user.ts}
    │   └── test/{setup-env.ts, global-setup.ts, reset-db.ts, create-app.ts, health.e2e-spec.ts, auth.e2e-spec.ts}
    └── web/
        ├── next.config.ts  postcss.config.mjs  vitest.config.ts  .env.example
        └── src/
            ├── proxy.ts                         route protection (Next 16 replacement for middleware.ts)
            ├── lib/{route-decision.ts (+test), api.ts (+test)}
            ├── components/{auth-form.tsx (+test), logout-button.tsx (+test)}
            └── app/{layout.tsx, globals.css, page.tsx, error.tsx,
                     login/page.tsx, signup/page.tsx, session-expired/route.ts}
```

---

### Task 1: Workspace root and `@folio/shared`

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.prettierrc`, `.nvmrc`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/tsup.config.ts`, `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/auth.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/auth.test.ts`

**Interfaces:**
- Produces (from `@folio/shared`):
  - `LIMITS = { emailMax: 254, passwordMin: 8, passwordMax: 128, displayNameMax: 50 } as const`
  - `SESSION_COOKIE_NAME = 'folio_session'`
  - `signupSchema`, which parses to `SignupInput = { email: string; password: string; displayName: string }`
  - `loginSchema`, which parses to `LoginInput = { email: string; password: string }`
  - `type PublicUser = { id: string; email: string; displayName: string; createdAt: string }` (`createdAt` is an ISO string)
  - `type ApiError = { message: string; fields?: Record<string, string> }`
  - `fieldErrors(error: z.ZodError): Record<string, string>`, which gives the first message per top-level field

- [ ] **Step 1: Create the workspace root.** Root `package.json`: `private: true`, `packageManager: "pnpm@12.5.1"`, `engines.node: ">=22"`, and scripts `dev`, `build`, `test`, `lint`, `typecheck` (each `turbo run <name>`), `format` (`prettier --write .`), `services:up` (`docker compose -f docker-compose.dev.yml up -d --wait`) and `services:down` (`docker compose -f docker-compose.dev.yml down`). `turbo.json`: `build` depends on `^build` and outputs `dist/**` and `.next/**` (excluding `.next/cache/**`); `test`, `typecheck` and `lint` depend on `^build`; `dev` is `persistent: true, cache: false` and depends on `^build`. `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `target ES2023`, `skipLibCheck`. `.gitignore` covers `node_modules`, `dist`, `.next`, `.turbo`, `.env`, `coverage` and `apps/api/src/generated`. `.nvmrc`: `22`. `.prettierrc`: `{ "singleQuote": true, "printWidth": 100 }`.

- [ ] **Step 2: Create the `@folio/shared` package shell.** Depends on `zod` 4; dev dependencies `tsup`, `vitest`, `typescript@6.0.3`. Scripts: `build` (`tsup`), `dev` (`tsup --watch`), `test` (`vitest run`), `typecheck` (`tsc --noEmit`). The tsup config emits ESM, CJS and `.d.ts` into `dist`. Set `package.json` `exports` with `import`, `require` and `types` conditions pointing at `dist`.

- [ ] **Step 3: Write the failing tests** in `packages/shared/src/auth.test.ts`:

```ts
describe('signupSchema', () => {
  it('trims and lowercases the email', () => {
    const r = signupSchema.parse({ email: '  Ana@Example.COM ', password: 'correct horse', displayName: ' Ana ' });
    expect(r.email).toBe('ana@example.com');
    expect(r.displayName).toBe('Ana');
  });
  it('keeps the password exactly as typed', () => {
    expect(signupSchema.parse({ email: 'a@b.co', password: '  pass word  ', displayName: 'A' }).password).toBe('  pass word  ');
  });
  it.each([
    [{ email: 'ana@example', password: 'longenough', displayName: 'A' }, 'email', 'Enter a valid email address.'],
    [{ email: 'a@b.co', password: 'short12', displayName: 'A' }, 'password', 'Password must be at least 8 characters.'],
    [{ email: 'a@b.co', password: 'x'.repeat(129), displayName: 'A' }, 'password', 'Password must be at most 128 characters.'],
    [{ email: 'a@b.co', password: 'x'.repeat(10_000), displayName: 'A' }, 'password', 'Password must be at most 128 characters.'],
    [{ email: 'a@b.co', password: 'longenough', displayName: '   ' }, 'displayName', 'Enter your name.'],
    [{ email: 'a@b.co', password: 'longenough', displayName: 'n'.repeat(51) }, 'displayName', 'Name must be at most 50 characters.'],
  ])('rejects %j on %s', (input, field, message) => {
    const r = signupSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!)[field]).toBe(message);
  });
  it('accepts an 8-character password', () => {
    expect(signupSchema.safeParse({ email: 'a@b.co', password: '12345678', displayName: 'A' }).success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('normalizes the email the same way as sign up', () => {
    expect(loginSchema.parse({ email: ' ANA@example.com', password: 'x' }).email).toBe('ana@example.com');
  });
  it('requires a password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.co', password: '' });
    expect(fieldErrors(r.error!).password).toBe('Enter your password.');
  });
  it('rejects passwords over 128 characters', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(129) }).success).toBe(false);
  });
});
```

- [ ] **Step 4: Install and confirm the tests fail.** Run `pnpm install && pnpm --filter @folio/shared test`. Expected: FAIL, because `signupSchema` and the rest are not defined yet.

- [ ] **Step 5: Implement `packages/shared/src/auth.ts`** with the exports listed under Interfaces and the messages from the tests. Normalize the email with `trim()` and then lowercase before the email check. Do not trim the password. Re-export everything from `src/index.ts`.

- [ ] **Step 6: Run the tests and the type check.** Run `pnpm --filter @folio/shared test && pnpm --filter @folio/shared typecheck && pnpm --filter @folio/shared build`. Expected: all pass, and `packages/shared/dist/` contains `index.js`, `index.cjs` and `index.d.ts`.

- [ ] **Step 7: Commit.** Hand the owner these commands:

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json .gitignore .prettierrc .nvmrc packages/shared docs
git commit -m "feat(shared): workspace root and auth schemas"
```

---

### Task 2: Local Postgres and API skeleton with config and health

**Files:**
- Create: `docker-compose.dev.yml`, `docker/postgres/init.sql`
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/nest-cli.json`, `apps/api/vitest.config.ts`, `apps/api/.env.example`
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/app.setup.ts`, `apps/api/src/config/env.ts`, `apps/api/src/health/health.controller.ts`
- Create: `apps/api/test/setup-env.ts`, `apps/api/test/create-app.ts`
- Test: `apps/api/src/config/env.spec.ts`, `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type Env = { NODE_ENV: 'development' | 'test' | 'production'; PORT: number; DATABASE_URL: string; SESSION_TTL_DAYS: number; COOKIE_SECURE: boolean }`
  - `loadEnv(source: Record<string, string | undefined>): Env`
  - `ENV`, the Nest injection token (a `Symbol('ENV')`), provided globally in `AppModule` as `loadEnv(process.env)`
  - `configureApp(app: INestApplication): INestApplication` in `src/app.setup.ts`
  - `createTestApp(overrides?: (b: TestingModuleBuilder) => TestingModuleBuilder): Promise<INestApplication>` in `test/create-app.ts`, which builds `AppModule`, applies overrides, calls `configureApp` and `init()`

- [ ] **Step 1: Add Postgres.** `docker-compose.dev.yml` runs one service `postgres` using image `postgres:17-alpine`, port `5432:5432`, env `POSTGRES_USER/PASSWORD/DB=folio`, a named volume `folio-pg`, `./docker/postgres/init.sql` mounted into `/docker-entrypoint-initdb.d/`, and a `pg_isready -U folio` healthcheck. `init.sql`: `CREATE DATABASE folio_test;`. Run `pnpm services:up`. Expected: the container is healthy, and `docker compose -f docker-compose.dev.yml exec postgres psql -U folio -lqt` lists both `folio` and `folio_test`.

- [ ] **Step 2: Scaffold `@folio/api`.** Dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` (12.x), `reflect-metadata`, `rxjs`, `@folio/shared` (`workspace:*`), `zod`. Dev dependencies: `@nestjs/cli`, `@nestjs/testing`, `typescript@6.0.3`, `vitest`, `unplugin-swc`, `@swc/core`, `supertest`, `@types/supertest`, `@types/node`. Scripts: `dev` (`nest start --watch`), `build` (`nest build`), `start` (`node dist/main.js`), `test` (`vitest run`), `typecheck` (`tsc --noEmit`), `lint` (`tsc --noEmit -p tsconfig.json`; a real linter comes in Phase 6). `tsconfig.json` extends `../../tsconfig.base.json` with `module: "nodenext"`, `experimentalDecorators` and `emitDecoratorMetadata`. Vitest config: the `unplugin-swc` plugin (decorator metadata needs it), includes `src/**/*.spec.ts` and `test/**/*.e2e-spec.ts`, `setupFiles: ['test/setup-env.ts']`, `fileParallelism: false` (tests share one database). `.env.example`: `DATABASE_URL=postgresql://folio:folio@localhost:5432/folio`, `PORT=4000`.

- [ ] **Step 3: Write the failing tests.** `test/setup-env.ts` sets `process.env.NODE_ENV = 'test'` and `process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://folio:folio@localhost:5432/folio_test'`.

`src/config/env.spec.ts`:

```ts
it('applies defaults', () => {
  expect(loadEnv({ DATABASE_URL: 'postgresql://u:p@h:5432/d' })).toEqual({
    NODE_ENV: 'development', PORT: 4000, DATABASE_URL: 'postgresql://u:p@h:5432/d', SESSION_TTL_DAYS: 30, COOKIE_SECURE: false,
  });
});
it('turns on secure cookies in production', () => {
  expect(loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@h/d' }).COOKIE_SECURE).toBe(true);
});
it('names every missing or invalid variable', () => {
  expect(() => loadEnv({ PORT: 'abc' })).toThrow(/DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/);
});
```

`test/health.e2e-spec.ts`: `GET /health` returns `200` with body `{ status: 'ok' }`, using `createTestApp()` and supertest.

- [ ] **Step 4: Run the tests and confirm they fail.** Run `pnpm --filter @folio/api test`. Expected: FAIL, because `loadEnv` and the app don't exist yet.

- [ ] **Step 5: Implement.** `loadEnv` uses a zod object with `z.coerce` for numbers. On failure it throws `Error('Invalid environment: ' + <comma-separated variable names>)`. `AppModule` registers the global `ENV` provider and `HealthController` (`@Get('health')`). `main.ts` calls `process.loadEnvFile()` when `apps/api/.env` exists, creates the app, runs `configureApp`, and listens on `env.PORT`. `configureApp` calls `enableShutdownHooks()` for now (cookie parsing arrives in Task 5).

- [ ] **Step 6: Run the tests and confirm they pass.** Run `pnpm --filter @folio/api test && pnpm --filter @folio/api typecheck`. Expected: PASS. Then `cp apps/api/.env.example apps/api/.env && pnpm --filter @folio/api dev`, and `curl localhost:4000/health` prints `{"status":"ok"}`. Stop the server.

- [ ] **Step 7: Commit.** Hand the owner these commands:

```bash
git add docker-compose.dev.yml docker apps/api pnpm-lock.yaml
git commit -m "feat(api): nest skeleton, env config, health check, local postgres"
```

---

### Task 3: Database with Prisma, and a health check that sees it

**Files:**
- Create: `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/prisma/migrations/*` (generated)
- Create: `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/test/global-setup.ts`, `apps/api/test/reset-db.ts`
- Modify: `apps/api/src/health/health.controller.ts`, `apps/api/src/app.module.ts`, `apps/api/vitest.config.ts` (add `globalSetup`), `apps/api/package.json`
- Test: `apps/api/test/health.e2e-spec.ts`

**Interfaces:**
- Consumes: `ENV`/`Env` and `createTestApp` from Task 2.
- Produces:
  - Prisma models `User { id String @id @default(uuid()); email String @unique; passwordHash String; displayName String; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; sessions Session[] }` and `Session { id String @id @default(uuid()); tokenHash String @unique; userId String; user User @relation(fields: [userId], references: [id], onDelete: Cascade); expiresAt DateTime; createdAt DateTime @default(now()); @@index([userId]) }`
  - The generated client lives at `apps/api/src/generated/prisma` (Prisma 7's `prisma-client` generator with `output`); import the `User` type from there.
  - `PrismaService extends PrismaClient`, built with `new PrismaPg({ connectionString: env.DATABASE_URL })`, exported from a `@Global()` `PrismaModule`
  - `resetDb(prisma: PrismaService): Promise<void>`, which deletes all sessions and then all users
  - `GET /health` returns `200 { status: 'ok', db: 'ok' }`, or `503 { status: 'error', db: 'down' }` when `SELECT 1` fails

- [ ] **Step 1: Write the failing tests.** Extend `test/health.e2e-spec.ts`:
  - `GET /health` returns `200 { status: 'ok', db: 'ok' }` against the real test database.
  - With `PrismaService` overridden so that `$queryRaw` rejects, `GET /health` returns `503 { status: 'error', db: 'down' }`.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm --filter @folio/api test`. Expected: FAIL, because the body has no `db` field.

- [ ] **Step 3: Add Prisma.** Add `prisma`, `@prisma/client` and `@prisma/adapter-pg` at `7.10.1`, plus `pg`. Write the schema and `prisma.config.ts` (the datasource URL comes from `DATABASE_URL`) following the Prisma 7 docs. Add scripts `db:migrate` (`prisma migrate dev`), `db:generate` (`prisma generate`) and `postinstall` (`prisma generate`). Run `pnpm --filter @folio/api exec prisma migrate dev --name init`. Expected: a migration folder is created and applied to `folio`.

- [ ] **Step 4: Wire it up.** Implement `PrismaService` (connect on module init, disconnect on destroy) and `PrismaModule`, plus the health check (`$queryRaw\`SELECT 1\``). `test/global-setup.ts` runs `prisma migrate deploy` with `DATABASE_URL` set to the test database, so the test database is always migrated. Add it as `globalSetup` in `vitest.config.ts`. Write `test/reset-db.ts`.

- [ ] **Step 5: Run the tests and confirm they pass.** Run `pnpm --filter @folio/api test && pnpm --filter @folio/api typecheck`. Expected: PASS.

- [ ] **Step 6: Commit.** Hand the owner these commands:

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): prisma schema for users and sessions, db health check"
```

---

### Task 4: Password hashing and sessions

**Files:**
- Create: `apps/api/src/auth/password.ts`, `apps/api/src/auth/session.service.ts`
- Test: `apps/api/src/auth/password.spec.ts`, `apps/api/src/auth/session.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `resetDb` (Task 3), `ENV`/`Env` (Task 2).
- Produces:
  - `hashPassword(plain: string): Promise<string>` (argon2id)
  - `verifyPassword(hash: string, plain: string): Promise<boolean>`, which returns `false` (does not throw) for a malformed hash
  - `DUMMY_PASSWORD_HASH: Promise<string>`, a hash computed once, verified against when the email is unknown so login timing does not reveal which emails exist
  - `hashToken(token: string): string` (sha256 hex)
  - `SessionService` with `create(userId: string): Promise<{ token: string; expiresAt: Date }>`, `findUser(token: string): Promise<User | null>` and `revoke(token: string): Promise<void>`

- [ ] **Step 1: Write the failing tests.**

`password.spec.ts`: the hash is not the plain text and starts with `$argon2id$`; `verifyPassword(hash, plain)` is `true`; a wrong password is `false`; `verifyPassword('not-a-hash', 'x')` resolves `false`.

`session.service.spec.ts` (uses the test database; builds `SessionService` with a real `PrismaService` and `SESSION_TTL_DAYS: 30`; `resetDb` before each test; creates a user directly with Prisma):

```ts
it('stores only the hash of the token', async () => {
  const { token } = await sessions.create(user.id);
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);           // 32 random bytes, base64url
  const row = await prisma.session.findFirstOrThrow();
  expect(row.tokenHash).toBe(hashToken(token));
  expect(row.tokenHash).not.toBe(token);
});
it('expires after 30 days', async () => {
  const { expiresAt } = await sessions.create(user.id);
  expect(Math.abs(expiresAt.getTime() - (Date.now() + 30 * 86_400_000))).toBeLessThan(5_000);
});
it('finds the user for a live token', async () => {
  const { token } = await sessions.create(user.id);
  expect((await sessions.findUser(token))?.id).toBe(user.id);
});
it('returns null for an expired token and deletes the row', async () => {
  const { token } = await sessions.create(user.id);
  await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
  expect(await sessions.findUser(token)).toBeNull();
  expect(await prisma.session.count()).toBe(0);
});
it('returns null for an unknown token', async () => {
  expect(await sessions.findUser('nope')).toBeNull();
});
it('revokes a token, and revoking twice is harmless', async () => {
  const { token } = await sessions.create(user.id);
  await sessions.revoke(token);
  await sessions.revoke(token);
  expect(await sessions.findUser(token)).toBeNull();
});
```

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm --filter @folio/api test -- src/auth`. Expected: FAIL, because the modules don't exist yet.

- [ ] **Step 3: Implement** `password.ts` (dependency `argon2`, with the library's argon2id defaults) and `session.service.ts` (token from `crypto.randomBytes(32).toString('base64url')`).

- [ ] **Step 4: Run the tests and confirm they pass.** Run `pnpm --filter @folio/api test && pnpm --filter @folio/api typecheck`. Expected: PASS.

- [ ] **Step 5: Commit.** Hand the owner these commands:

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): argon2 password hashing and server-side sessions"
```

---

### Task 5: Auth endpoints

**Files:**
- Create: `apps/api/src/common/zod-validation.pipe.ts`, `apps/api/src/auth/auth.module.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/session.guard.ts`, `apps/api/src/auth/current-user.decorator.ts`, `apps/api/src/auth/public-user.ts`
- Modify: `apps/api/src/app.module.ts`, `apps/api/src/app.setup.ts`
- Test: `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `signupSchema`, `loginSchema`, `fieldErrors`, `SESSION_COOKIE_NAME`, `PublicUser` (Task 1); `SessionService`, `hashPassword`, `verifyPassword`, `DUMMY_PASSWORD_HASH` (Task 4); `PrismaService` (Task 3); `createTestApp` and `ENV` (Task 2).
- Produces (the HTTP contract the web app relies on):

| Method and path | Body | Success | Errors |
|---|---|---|---|
| `POST /auth/signup` | `SignupInput` | `201 PublicUser` + `Set-Cookie` | `400 { message: 'Check the highlighted fields.', fields }`, `409 { message: 'An account with this email already exists.' }`, `429` |
| `POST /auth/login` | `LoginInput` | `200 PublicUser` + `Set-Cookie` | `400`, `401 { message: 'Email or password is incorrect.' }`, `429` |
| `POST /auth/logout` | none | `204`, session revoked and cookie cleared | none (204 even without a cookie) |
| `GET /auth/me` | none | `200 PublicUser` | `401 { message: 'Not signed in.' }` |

  - Cookie: `folio_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` when `env.COOKIE_SECURE`, `Expires` set to the session's `expiresAt`.
  - `429` body: `{ message: 'Too many attempts. Try again in a minute.' }`, with a limit of 10 requests per 60 seconds per IP, on signup and login only.
  - `ZodValidationPipe(schema)` throws `BadRequestException({ message: 'Check the highlighted fields.', fields: fieldErrors(err) })`.
  - `toPublicUser(user: User): PublicUser`
  - `SessionGuard` puts the user on `req.user`, and `@CurrentUser()` reads it.

- [ ] **Step 1: Write the failing e2e tests** in `test/auth.e2e-spec.ts`. A fresh `createTestApp()` and `resetDb` run before each test, so the throttle counters start at zero. Use a `request.agent` where cookies should carry over.
  1. Signing up `{ email: ' Ana@Example.com ', password: 'correct horse', displayName: 'Ana' }` returns `201`. The body has `id`, `email: 'ana@example.com'`, `displayName: 'Ana'` and an ISO `createdAt`, and the body has no `passwordHash` key. `set-cookie` has `folio_session=`, `HttpOnly` and `SameSite=Lax`.
  2. Signing up the same address as `ANA@example.com` returns `409` with the exact message.
  3. Signing up `{ email: 'nope', password: 'short', displayName: '' }` returns `400`, with `fields.email`, `fields.password` and `fields.displayName` all set.
  4. Signing up with a 10,000-character password returns `400` (`fields.password` is set), and no user row is created.
  5. Logging in with the wrong password returns `401 'Email or password is incorrect.'`. Logging in with an unknown email returns `401` with the identical body.
  6. Logging in with `ANA@EXAMPLE.COM` and the right password returns `200` and a cookie. `GET /auth/me` with that agent returns `200` and the same `id`.
  7. `GET /auth/me` with no cookie, or with `folio_session=garbage`, returns `401 'Not signed in.'`.
  8. Logging out returns `204` with a `set-cookie` that expires `folio_session`. After that, `GET /auth/me` with the old token, sent manually, returns `401`.
  9. Eleven quick bad login attempts: the first ten return `401` and the eleventh returns `429` with the exact message.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm --filter @folio/api test -- test/auth`. Expected: FAIL, with 404s.

- [ ] **Step 3: Implement.**
  - Add the dependencies `cookie-parser`, `@types/cookie-parser` and `@nestjs/throttler`. `configureApp` adds `cookieParser()`.
  - `AuthService.signup(input)` hashes the password and creates the user. Map Prisma error code `P2002` to the `409`.
  - `AuthService.login(input)` verifies against `DUMMY_PASSWORD_HASH` when the email is unknown, and throws the same `401` in both failure cases.
  - The controller creates the session and sets the cookie.
  - Throttling uses `ThrottlerModule` with the guard applied only to the signup and login handlers, and a custom 429 message.

- [ ] **Step 4: Run all API tests and confirm they pass.** Run `pnpm --filter @folio/api test && pnpm --filter @folio/api typecheck`. Expected: PASS.

- [ ] **Step 5: Commit.** Hand the owner these commands:

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): signup, login, logout and me endpoints with cookie sessions"
```

---

### Task 6: Web foundation and the sign-up and log-in pages

**Files:**
- Create: `packages/tokens/package.json`, `packages/tokens/folio.css`
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`, `apps/web/.env.example`
- Create: `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/signup/page.tsx`, `apps/web/src/components/auth-form.tsx`
- Test: `apps/web/src/components/auth-form.test.tsx`

**Interfaces:**
- Consumes: `signupSchema`, `loginSchema`, `fieldErrors`, `ApiError` (Task 1); the HTTP contract (Task 5), reached through `/api/*`.
- Produces:
  - `@folio/tokens/folio.css`, which defines on `:root` exactly these prototype values: `--desk:#1C1713; --desk-2:#251F19; --desk-3:#30281F; --line:#46392D; --text:#F0E8DA; --text-dim:#BBAE9A; --brass:#C9A45C; --brass-hi:#E3C68C; --brass-ink:#1C1713; --oxblood:#8E2F28; --leather:#5A3826; --leather-hi:#6F4630; --danger:#E5937A`, plus `color-scheme: dark`, and the four paper themes as `[data-paper="cream|white|sepia|night"]` blocks setting `--paper --ink --ink-dim --edge --edge-2 --spine --mark` with the prototype's values (copy them from the artifact's `.reader[data-paper=…]` rules).
  - Tailwind 4 `@theme` in `globals.css` maps those to the utilities `bg-desk`, `bg-desk-2`, `bg-desk-3`, `border-line`, `text-text`, `text-text-dim`, `bg-brass`, `text-brass`, `bg-brass-hi`, `text-danger`, and the fonts `font-display` (Cormorant Garamond 500/600 + italic 500) and `font-ui` (Instrument Sans 400–700), loaded with `next/font/google`.
  - `next.config.ts` rewrites `/api/:path*` to `${process.env.API_URL ?? 'http://localhost:4000'}/:path*`.
  - `<AuthForm mode: 'login' | 'signup' />`, a client component.

- [ ] **Step 1: Scaffold.** Create `@folio/tokens` (no build step; `exports: { "./folio.css": "./folio.css" }`). Create `@folio/web`: `next@16`, `react@19`, `react-dom@19`, `@folio/shared` and `@folio/tokens` (`workspace:*`), `zod`, `tailwindcss@4` and `@tailwindcss/postcss`. Dev dependencies: `typescript@6.0.3`, `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@types/react` and `@types/react-dom`. Scripts: `dev` (`next dev -p 3000`), `build`, `start`, `test` (`vitest run`), `typecheck` (`tsc --noEmit`), `lint` (`next lint`, or ESLint per the Next 16 docs). Vitest uses the `jsdom` environment with `vitest.setup.ts` importing jest-dom. `layout.tsx` imports `@folio/tokens/folio.css` and `globals.css`, sets the fonts, and sets `<body className="bg-desk text-text font-ui">`, with metadata title `Folio`.

- [ ] **Step 2: Write the failing tests** in `auth-form.test.tsx`. Mock `next/navigation`'s `useRouter` to return `{ replace, refresh }` spies, and stub `fetch` on `globalThis`.
  1. In signup mode, typing `ana@example` and `short` and submitting shows `Enter a valid email address.` and `Password must be at least 8 characters.`, and `fetch` is not called.
  2. In login mode, valid input sends `POST` `/api/auth/login` with a JSON body `{ email, password }` and header `content-type: application/json`. On a `200` response it calls `replace('/')` and then `refresh()`.
  3. A `401` response with `{ message: 'Email or password is incorrect.' }` makes `role="alert"` show that text.
  4. A `400` response with `fields: { email: 'Enter a valid email address.' }` shows that message under the email field.
  5. When `fetch` rejects, `role="alert"` shows `Can't reach Folio right now. Try again.`
  6. Double-clicking submit calls `fetch` once. The button reads `Signing in…` (login) or `Creating account…` (signup) and is disabled while pending.
  7. Each input has a visible label: `Email`, `Password`, and `Your name` (signup only).

- [ ] **Step 3: Run the tests and confirm they fail.** Run `pnpm --filter @folio/web test`. Expected: FAIL.

- [ ] **Step 4: Implement `AuthForm`** and the two pages.
  - `/login` heading: `Welcome back`. Button: `Sign in`. Link: `New to Folio? Create an account` → `/signup`.
  - `/signup` heading: `Open your room`. Button: `Create account`. Link: `Already have an account? Sign in` → `/login`.
  - Style the pages with the prototype's look: the `desk-2` card, brass primary pill button, `font-display` headings, and 44px minimum tap targets.

- [ ] **Step 5: Run the tests and the type check.** Run `pnpm --filter @folio/web test && pnpm --filter @folio/web typecheck`. Expected: PASS.

- [ ] **Step 6: Commit.** Hand the owner these commands:

```bash
git add packages/tokens apps/web pnpm-lock.yaml
git commit -m "feat(web): next app, folio tokens, sign up and log in pages"
```

---

### Task 7: The Room, route protection and log out

**Files:**
- Create: `apps/web/src/lib/route-decision.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/proxy.ts`
- Create: `apps/web/src/app/page.tsx`, `apps/web/src/app/error.tsx`, `apps/web/src/app/session-expired/route.ts`, `apps/web/src/components/logout-button.tsx`
- Create: `README.md`
- Test: `apps/web/src/lib/route-decision.test.ts`, `apps/web/src/lib/api.test.ts`, `apps/web/src/components/logout-button.test.tsx`

**Interfaces:**
- Consumes: `SESSION_COOKIE_NAME` and `PublicUser` (Task 1); `GET /auth/me` and `POST /auth/logout` (Task 5); `AuthForm`, the tokens and the rewrite (Task 6).
- Produces:
  - `routeDecision(pathname: string, hasSession: boolean): string | null`, which returns a redirect target or `null`
  - `getCurrentUser(): Promise<PublicUser | null>` (server-only)
  - `<LogoutButton />`

- [ ] **Step 1: Write the failing tests.**

`route-decision.test.ts`:

```ts
it.each([
  ['/', false, '/login?next=%2F'],
  ['/shelf/x', false, '/login?next=%2Fshelf%2Fx'],
  ['/login', false, null],
  ['/signup', false, null],
  ['/session-expired', false, null],
  ['/session-expired', true, null],   // must stay reachable with a stale cookie, or the loop returns
  ['/', true, null],
  ['/login', true, '/'],
  ['/signup', true, '/'],
])('%s with session=%s → %s', (path, has, expected) => {
  expect(routeDecision(path, has)).toBe(expected);
});
```

`api.test.ts`: mock `next/headers` so `cookies()` returns `folio_session=abc`, and stub `fetch`.
- A `200` response returns the user. The request went to `http://localhost:4000/auth/me` with the header `cookie: folio_session=abc` and `cache: 'no-store'`.
- A `401` response returns `null`.
- A `500` response throws.
- A rejected `fetch` throws.
- With no cookie, it returns `null` without calling `fetch`.

`logout-button.test.tsx`: clicking `Log out` sends `POST /api/auth/logout`, then calls `replace('/login')` and `refresh()`.

- [ ] **Step 2: Run the tests and confirm they fail.** Run `pnpm --filter @folio/web test`. Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **`proxy.ts`** reads whether the `folio_session` cookie exists and applies `routeDecision`. Its matcher excludes `/api`, `/_next` and static files.
  - **`getCurrentUser`** uses `process.env.API_URL ?? 'http://localhost:4000'`.
  - **Room (`app/page.tsx`):**
    - When `getCurrentUser()` returns `null`, `redirect('/session-expired')`.
    - Otherwise it shows the wordmark `Folio` in `font-display` with `Folio`'s second half italic brass as in the prototype, the line `Good to see you, {displayName}.`, a shelf heading `Your shelf`, the empty state `Your shelf is empty. Book uploads arrive in the next phase.`, and `<LogoutButton />`.
  - **`session-expired/route.ts`** (GET) deletes the `folio_session` cookie and redirects to `/login`.
  - **`error.tsx`** (client) shows `Folio can't reach its library right now.` with a `Try again` button that calls `reset()`.
  - **`README.md`** covers requirements (Node 22, pnpm 12.5.1 via corepack, Docker), getting started (`pnpm install`, `pnpm services:up`, `cp apps/api/.env.example apps/api/.env`, `pnpm --filter @folio/api db:migrate`, `pnpm dev`), the URLs table, the scripts table, a pointer to the spec, and the phase list from the spec.

- [ ] **Step 4: Run the whole suite.** Run `pnpm test && pnpm typecheck && pnpm build`. Expected: everything passes across all four packages.

- [ ] **Step 5: Try it by hand.** With `pnpm services:up` running and `pnpm dev` started, open `http://localhost:3000` and check each of these:
  1. `/` redirects to `/login?next=%2F`.
  2. Sign up as `Ana` lands in the Room showing `Good to see you, Ana.`
  3. Reloading keeps you signed in.
  4. Visiting `/login` while signed in goes back to `/`.
  5. `Log out` goes to `/login`, and `/` redirects to login again.
  6. Log in with `ANA@…` in capitals and you're back in the Room.
  7. To test a stale cookie, run `docker compose -f docker-compose.dev.yml exec postgres psql -U folio -c 'DELETE FROM "Session";'` and reload `/`. You land on `/login` once, with no loop, and can sign in again.
  8. Stop the API and reload `/`. The `error.tsx` message appears.

  Report each result to the owner.

- [ ] **Step 6: Commit.** Hand the owner these commands:

```bash
git add apps/web README.md pnpm-lock.yaml
git commit -m "feat(web): the room, route protection, log out, readme"
```
