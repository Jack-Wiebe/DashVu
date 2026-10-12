# CLAUDE.md

See **[AGENTS.md](./AGENTS.md)** for the full project guide. Quick reference:

- **What:** DashVu — Next.js 14 dashboard, being rebuilt into a scalable CRUD app with a database.
- **Monorepo:** pnpm + Turborepo. `apps/web` (Next app) + `packages/{config,ui,validators,core,db,api}`.
- **Stack:** TypeScript strict · Tailwind + shadcn/ui · Auth.js v5 + Drizzle adapter (DB sessions) ·
  Neon + Drizzle · tRPC + TanStack Query.
- **Commands (repo root):** `pnpm install` · `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck`.
- **Env:** git-ignored `.env` at repo root (see `.env.example`); loaded by `apps/web/next.config.js`;
  validated in `apps/web/src/env.ts`. Local OAuth must use `http://127.0.0.1:3000`.
- **Never** expose secrets or refresh tokens to the client; server-only modules import `"server-only"`.
- Conventional Commits enforced; `pre-commit` runs Prettier via lint-staged.
