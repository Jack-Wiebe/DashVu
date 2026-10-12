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
  db/                  Neon + Drizzle data layer               (placeholder)
```

## Tech stack

- **Package manager:** pnpm · **Build orchestration:** Turborepo
- **Language:** TypeScript (strict)
- **Framework:** Next.js 14 App Router, React 18
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Auth:** NextAuth v4 today, migrating to Auth.js v5 + Drizzle adapter
- **Database:** Neon (serverless Postgres) + Drizzle ORM
- **Data fetching (planned):** tRPC + TanStack Query
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
- Required: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`.
- `apps/web/next.config.js` loads the root `.env` explicitly (Next only reads env from the app dir).
- Env is validated at runtime in `apps/web/src/env.ts` (`@t3-oss/env-nextjs` + `zod`).
- **Local OAuth must use `http://127.0.0.1:3000`**, not `localhost` — Spotify rejects `http://localhost`
  redirect URIs as insecure. Register `.../api/auth/callback/spotify` and `.../api/auth/callback/google`.

## Security rules (must follow)

- Server-only modules **must** start with `import "server-only";` (e.g. `apps/web/src/lib/spotify.ts`).
- Never send secrets or OAuth refresh tokens to the client. Never use `NEXT_PUBLIC_*` for secrets.
- Never commit `.env` or print token values in logs/toasts.
- Spotify token refresh stays server-side. **Known issue:** the refresh token is currently copied into
  the client session (`src/lib/auth.ts` `session` callback) — do not build new features on it; it will
  be removed when auth moves to DB sessions.

## Conventions

- Do not add comments unless they add real value.
- Client Components must declare `"use client"`.
- New widgets follow the `WidgetConfig` contract in `apps/web/src/types/widget.ts` and render through
  `apps/web/src/components/Widget.tsx`.
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

- Refresh token exposed in client session (see Security rules) — fix with DB sessions.
- `spotify-web-api-node` (a Node SDK) is bundled into the client via the widget — replace with
  `@spotify/web-api-ts-sdk` or route calls through the server.
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
