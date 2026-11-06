# Folio

A private reading and writing room on the web. Readers bring their EPUBs and PDFs; writers keep manuscripts, goals and streaks, and export chapters as EPUB or PDF to share however they like.

This repository is a pnpm + Turborepo monorepo:

| Path | What it is |
|---|---|
| `apps/web` | Next.js 16 website (port 3000). Forwards `/api/*` to the API, so the browser only talks to one origin. |
| `apps/api` | NestJS 12 API (port 4000) with Prisma 7 and PostgreSQL. |
| `packages/shared` | Zod schemas, limits and types used by both sides. |
| `packages/tokens` | The Folio colors and paper themes as CSS variables. |

## Requirements

- Node 22 (`.nvmrc`)
- pnpm 12.5.1, via corepack: `corepack enable`
- Docker (for the local PostgreSQL)

## Getting started

```bash
cp apps/api/.env.example apps/api/.env
pnpm install
pnpm services:up                         # PostgreSQL 17 on localhost:5433 (databases: folio, folio_test)
pnpm --filter @folio/api db:migrate      # apply migrations to the dev database
pnpm dev                                 # web on :3000, API on :4000
```

Then open http://localhost:3000 and create an account.

PostgreSQL is published on port **5433**, not 5432, so it doesn't clash with a Postgres already installed on your machine.

## URLs

| URL | What |
|---|---|
| http://localhost:3000 | The website |
| http://localhost:3000/api/health | API health through the website |
| http://localhost:4000/health | API health directly (`{"status":"ok","db":"ok"}`) |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Runs the web and the API in watch mode |
| `pnpm test` | Runs every package's tests (API tests need `pnpm services:up`) |
| `pnpm typecheck` | Type-checks every package |
| `pnpm build` | Builds every package |
| `pnpm format` | Formats the repository with Prettier |
| `pnpm services:up` / `services:down` | Starts / stops the local PostgreSQL |
| `pnpm --filter @folio/api db:migrate` | Creates and applies a migration after a schema change |
| `pnpm --filter @folio/api db:generate` | Regenerates the Prisma client |

## Design and plans

The product design lives in [`docs/superpowers/specs/2026-11-06-folio-platform-design.md`](docs/superpowers/specs/2026-11-06-folio-platform-design.md). Each phase gets its own plan under `docs/superpowers/plans/`.

1. **Foundation** — monorepo, local Postgres, API with health check and email/password auth, website with sign up, log in, log out and an empty Room. *(this phase)*
2. **Library and storage** — upload EPUB/PDF to object storage, covers, the shelf, delete.
3. **Reader** — the page-turning reader, with themes, contents, bookmarks and progress saved to the server.
4. **Writing** — manuscripts, goals, streaks, sprints, heatmap, badges, and export to EPUB and PDF.
5. **Mini apps** — quote card studio and ambience mixer.
6. **Hardening and launch** — security review, accessibility, backups, production hosting.

Later: daily tarot, paid mini apps, mobile apps.
