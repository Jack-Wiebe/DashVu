# DashVu

A customizable personal dashboard. This repository is a **pnpm + Turborepo monorepo** containing the
DashVu web application and its shared packages.

## Requirements

- Node.js >= 20
- pnpm >= 9 (via `corepack enable` recommended)

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in the values
pnpm dev               # http://127.0.0.1:3000
```

See [`.env.example`](./.env.example) for the required environment variables. Local OAuth redirect URIs
must use `http://127.0.0.1:3000` (Spotify rejects `http://localhost`).

## Workspace layout

| Path                  | Description                             |
| --------------------- | --------------------------------------- |
| `apps/web`            | Next.js 14 (App Router) application     |
| `packages/config`     | Shared tsconfig bases + Tailwind preset |
| `packages/ui`         | Shared presentational components        |
| `packages/validators` | Shared zod schemas                      |
| `packages/core`       | Framework-agnostic pure logic           |
| `packages/db`         | Neon + Drizzle data layer               |

## Scripts

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start `apps/web` in development |
| `pnpm build`     | Build all packages (Turborepo)  |
| `pnpm lint`      | Run ESLint across the workspace |
| `pnpm typecheck` | Type-check across the workspace |
| `pnpm format`    | Format with Prettier            |

## Documentation

- [`AGENTS.md`](./AGENTS.md) — contributor and AI-agent guide (conventions, security rules, roadmap).
- [`CLAUDE.md`](./CLAUDE.md) — quick reference for Claude Code.

## License

See [LICENSE](./LICENSE).
