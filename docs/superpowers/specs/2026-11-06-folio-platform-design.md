# Folio Platform: Design

Date: 2026-11-06
Status: draft, to be reviewed by the owner

## Intent

Folio is today a single-page prototype (a claude.ai artifact) where one person, in one browser, can read EPUBs and PDFs with real page turns, write manuscripts with daily goals and streaks, make quote cards, play ambient room sounds and draw a daily tarot card. Everything lives in that browser's storage.

The owner wants to turn it into a real web platform: many people sign up, and each gets a private room for reading and writing that is stored on a server and follows them across devices. It starts as a website; native mobile or desktop apps come later, only if enough people use it.

## Who it serves

Readers and writers, first. About 10 users at launch.

## Goals

- Accounts with email and password. Each user's books, reading progress, manuscripts and settings live on the server.
- **Reader:** import EPUB and PDF files and read them with the prototype's page-turning reader, paper themes, fonts, contents drawer and bookmarks. Progress is saved per book.
- **Writing:** manuscripts with daily word goals, streaks, sprints, a writing heatmap and badges, as in the prototype.
- **Sharing by export:** a writer exports a chapter or a manuscript as an EPUB or PDF file and shares it outside Folio however they like.
- **Mini apps in the first version:** the quote card studio and the ambience mixer. (Owner's guess, confirmed only by omission: tarot was the only mini app moved out.)
- Free to use.

## Non-goals (for now)

- No social features: no public feed, no reading other users' work on the site, no comments or follows.
- No native mobile or desktop apps.
- No payments. Later, mini games and tarot may become paid.
- Daily tarot moves to a later phase.

## Anti-goals

- Losing a user's books or writing. Durability matters more than features.
- Users seeing each other's private books or manuscripts.
- Infrastructure out of proportion to about 10 users.

## Decided by the owner

- **One monorepo** holding web, API and shared code.
- **Stack (kept from the earlier scaffold):** Next.js website, NestJS API, PostgreSQL with Prisma, and S3-compatible book storage (MinIO locally, Cloudflare R2 in production).
- **Workflow:** the owner builds Folio together with Claude, and the owner runs all git commands; Claude only writes files and hands over git commands.

## Claude's calls (owner may override)

- **Tooling:** pnpm workspaces and Turborepo; TypeScript everywhere; Vitest for tests, written test-first.
- **Layout:** `apps/web`, `apps/api`, `packages/shared` (zod schemas and limits used by both sides), `packages/tokens` (the prototype's colors, fonts and paper themes as CSS variables).
- **Sessions:** server-side sessions with an opaque token in an httpOnly cookie, rather than JWTs. They can be revoked, and a mobile app can later send the same token as a bearer header.
- **Routing:** the website forwards `/api/*` to the API, so the browser only ever talks to one origin. That means no CORS setup and simple cookies.
- **Visual design:** the prototype's walnut reading room look (dark desk colors, brass accent, Cormorant Garamond and Instrument Sans) carries over.

## Phases (each gets its own implementation plan)

1. **Foundation:** monorepo, local Postgres, API with health check and email/password auth, website with sign up, log in, log out and an empty Room.
2. **Library and storage:** upload EPUB/PDF to object storage, covers, the shelf, delete.
3. **Reader:** port the page-turning reader, with themes, contents, bookmarks and progress saved to the server.
4. **Writing:** manuscripts, goals, streaks, sprints, heatmap, badges, and export to EPUB and PDF.
5. **Mini apps:** quote card studio and ambience mixer.
6. **Hardening and launch:** security review, accessibility, backups, production hosting (Cloudflare R2, a small server).

Later: daily tarot, paid mini apps, mobile apps.

## Open questions for the owner

- If the first version could only do one thing really well, is it reading or writing? This decides whether phase 3 or phase 4 comes first after the library.
