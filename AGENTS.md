# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## Project

DashVu is a customizable personal dashboard (widgets for Spotify, galleries, calendars, and more).
The codebase is being rewritten from a single-app prototype into a **scalable CRUD application with
a real database for user configuration**. Work proceeds in phases; keep the app runnable at the end
of every change.

## Monorepo layout

```
apps/
  web/                 Next.js 14 (App Router) application
packages/
  config/              Shared tsconfig bases + Tailwind theme preset
  ui/                  Shared presentational components        (placeholder)
  validators/          Shared zod schemas                      (placeholder)
  core/                Framework-agnostic pure business logic  (placeholder)
  db/                  Neon + Drizzle schema + client
  api/                 tRPC routers + server-side Spotify proxy
```

## Tech stack

- **Package manager:** pnpm · **Build orchestration:** Turborepo
- **Language:** TypeScript (strict)
- **Framework:** Next.js 14 App Router, React 18
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Auth:** Auth.js v5 (`next-auth` beta) + `@auth/drizzle-adapter`, database sessions
- **Database:** Neon (serverless Postgres) + Drizzle ORM
- **Data fetching:** tRPC v11 + TanStack Query v5
- **Target:** Web/PWA only for now

## Commands (run from the repository root)

```bash
pnpm install        # install all workspace deps
pnpm dev            # run apps/web in dev
pnpm build          # build all packages via turbo
pnpm lint           # eslint all packages
pnpm typecheck      # tsc --noEmit all packages
pnpm format         # prettier --write
```

Run a single app with a filter, e.g. `pnpm --filter @dashvu/web dev`.

## Environment variables

- Real values live in a **git-ignored `.env` at the repository root**. Copy `.env.example` to start.
- Required: `AUTH_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SPOTIFY_ID`,
  `AUTH_SPOTIFY_SECRET`. Optional: `DATABASE_URL` (Neon; required at runtime for auth).
- Legacy names (`NEXTAUTH_*`, `GOOGLE_CLIENT_ID`, `SPOTIFY_CLIENT_ID`) still work as fallbacks in
  `apps/web/src/env.ts` while you migrate your local `.env`.
- `apps/web/next.config.js` loads the root `.env` explicitly (Next only reads env from the app dir).
- Env is validated at runtime in `apps/web/src/env.ts` (`@t3-oss/env-nextjs` + `zod`).
- **Local OAuth must use `http://127.0.0.1:3000`**, not `localhost` — Spotify rejects `http://localhost`
  redirect URIs as insecure. Register `.../api/auth/callback/spotify` and `.../api/auth/callback/google`.

## Security rules (must follow)

- Server-only modules **must** start with `import "server-only";` (e.g. `packages/api/src/spotify.ts`).
- Never send secrets or OAuth refresh tokens to the client. Never use `NEXT_PUBLIC_*` for secrets.
- Never commit `.env` or print token values in logs/toasts.
- Spotify tokens live in the `account` DB table. Refresh happens server-side in
  `packages/api/src/spotify.ts`; the client session exposes only `id`, `name`, `email`, `image` and
  `hasSpotify` (`apps/web/src/auth.ts`). Never add tokens to the session.

## Conventions

- Do not add comments unless they add real value.
- Client Components must declare `"use client"`.
- New widgets follow the `WidgetConfig` contract in `apps/web/src/types/widget.ts` and render through
  `apps/web/src/components/Widget.tsx`.
- Server data access goes through tRPC routers in `packages/api` (`appRouter`); the Next handler lives
  at `apps/web/src/app/api/trpc/[trpc]/route.ts` and the client hooks in
  `apps/web/src/lib/trpc/client.tsx`.
- When overriding `authorization` on a provider whose default is a **string** (e.g. Spotify:
  `authorization: "https://accounts.spotify.com/authorize?scope=..."`), you must re-specify `url`, or
  Auth.js's deep-merge replaces the string with `{}` and drops the endpoint (causes `TypeError: Invalid URL`
  in `getAuthorizationUrl`). Use `authorization: { url, params: { scope } }`.
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` is a **custom handler** — do not revert it to
  `export const { GET, POST } = handlers`. Next normalizes `127.0.0.1`/`[::1]` → `localhost` inside
  `NextRequest`/`NextURL`, which would make Auth.js emit `http://localhost:3000` redirect URIs
  (unacceptable: Spotify only allows loopback IP literals). The route instead rebuilds the request from
  `AUTH_URL` and calls `@auth/core`'s `Auth()` directly with the config exported from `src/auth.ts`.
- Database changes: edit `packages/db/src/schema.ts`, then run `pnpm --filter @dashvu/db db:generate`
  and commit the generated SQL in `packages/db/drizzle/`.
- Put pure logic in `@dashvu/core` and shared validation in `@dashvu/validators` rather than duplicating
  it in `apps/web`.

## Testing

No test framework is installed yet. Current phase: **manual smoke checklist** (app-wide). Future phases
add Vitest/Playwright with tests colocated next to source. When adding a test script, wire it into
`turbo.json` and CI.

## Commits

- Conventional Commits are enforced (commitlint + husky `commit-msg`).
- `pre-commit` runs lint-staged (Prettier on staged files).

## Known issues / TODO

- ~~Refresh token exposed in client session~~ — resolved: DB sessions; session exposes no tokens.
- ~~`spotify-web-api-node` bundled into the client~~ — resolved: Spotify calls now go through tRPC
  (`packages/api`) and the SDK stays server-side.
- `DATABASE_URL` must be present at runtime for auth; the app builds without it (placeholder
  connection string + `force-dynamic` layout). Run `pnpm --filter @dashvu/db db:migrate` once configured.
- `CalendarWidget` is an intentional placeholder.
- Unused/deprecated calendar deps (`react-big-calendar`, `react-google-calendar-api`, `moment`).
- `<img>` usage where `next/image` would be preferable; `apps/web/src/components/NavBar.tsx` has a
  `mx-screen-2xl` typo.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
