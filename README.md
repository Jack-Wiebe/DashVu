# DashVu

[![CI](https://github.com/Jack-Wiebe/DashVu/actions/workflows/ci.yml/badge.svg)](https://github.com/Jack-Wiebe/DashVu/actions/workflows/ci.yml)

A customizable personal dashboard. This repository is a **pnpm + Turborepo monorepo** containing the
DashVu web application and its shared packages.

## Features

- Sign in with Google and/or Spotify (Auth.js v5, database sessions).
- Per-user dashboard layout persisted in Postgres (Neon + Drizzle): edit mode with add/remove,
  drag-and-drop reorder, and resize.
- Widgets: Spotify player (playback controls + playlist switcher), Google Calendar, and an image
  Gallery.
- Integrations run server-side via tRPC — no OAuth tokens reach the browser.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS + shadcn/ui · Auth.js v5 · Neon +
Drizzle · tRPC v11 + TanStack Query · Turborepo.

## Requirements

- Node.js >= 20
- pnpm (via `corepack enable`; the repo pins `pnpm@12.4.2`)

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in the values
pnpm dev               # http://127.0.0.1:3000
```

See [`.env.example`](./.env.example) for the required environment variables. Local OAuth redirect URIs
must use `http://127.0.0.1:3000` (Spotify rejects `http://localhost`).

## Workspace layout

| Path                  | Description                               |
| --------------------- | ----------------------------------------- |
| `apps/web`            | Next.js 15 (App Router) application       |
| `packages/config`     | Shared tsconfig bases + Tailwind preset   |
| `packages/ui`         | Shared presentational components          |
| `packages/validators` | Shared zod schemas                        |
| `packages/core`       | Framework-agnostic pure logic             |
| `packages/db`         | Neon + Drizzle data layer                 |
| `packages/api`        | tRPC routers + server-side Spotify/Google |

## Scripts

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start `apps/web` in development |
| `pnpm build`     | Build all packages (Turborepo)  |
| `pnpm lint`      | Run ESLint across the workspace |
| `pnpm typecheck` | Type-check across the workspace |
| `pnpm format`    | Format with Prettier            |

## Status

Active development (Phase 4): user configuration persists per account. Upcoming work includes layout
export/import and per-widget settings panels. See [`AGENTS.md`](./AGENTS.md) for the detailed roadmap.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — contributor and AI-agent guide (conventions, security rules, roadmap).
- [`CLAUDE.md`](./CLAUDE.md) — quick reference for Claude Code.

## License

See [LICENSE](./LICENSE).
