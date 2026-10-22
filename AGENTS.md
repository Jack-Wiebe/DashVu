# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## Project

DashVu is a customizable personal dashboard (widgets for Spotify, galleries, calendars, and more).
The codebase is being rewritten from a single-app prototype into a **scalable CRUD application with
a real database for user configuration**. Work proceeds in phases; keep the app runnable at the end
of every change.

## Git workflow (read first)

- **Never run `git commit`, `git push`, `git amend`, or any other git-mutating command.** The
  maintainer performs all git operations manually. Make and verify changes in the working tree, then
  stop — do not stage, commit, or push.

## Monorepo layout

```
apps/
  web/                 Next.js 15 (App Router) application
packages/
  config/              Shared tsconfig bases + Tailwind theme preset
  ui/                  Shared presentational components        (placeholder)
  validators/          Shared zod schemas                      (placeholder)
  core/                Framework-agnostic pure business logic  (placeholder)
  db/                  Neon + Drizzle schema + client
  api/                 tRPC routers + server-side Spotify/Google proxies
```

## Tech stack

- **Package manager:** pnpm · **Build orchestration:** Turborepo
- **Language:** TypeScript (strict)
- **Framework:** Next.js 15 App Router, React 19
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
pnpm lint           # eslint all packages (apps/web runs the ESLint CLI; `next lint` is gone in Next 15)
pnpm typecheck      # tsc --noEmit all packages
pnpm format         # prettier --write
```

Run a single app with a filter, e.g. `pnpm --filter @dashvu/web dev`.

## Environment variables

- Real values live in a **git-ignored `.env` at the repository root**. Copy `.env.example` to start.
- Required: `AUTH_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SPOTIFY_ID`,
  `AUTH_SPOTIFY_SECRET`. Optional: `DATABASE_URL` (Neon; required at runtime for auth),
  `DASHVU_USER_AGENT` (outbound `User-Agent` for third-party APIs — see `packages/api/src/http.ts`).
- Legacy names (`NEXTAUTH_*`, `GOOGLE_CLIENT_ID`, `SPOTIFY_CLIENT_ID`) still work as fallbacks in
  `apps/web/src/env.ts` while you migrate your local `.env`.
- `apps/web/next.config.js` loads the root `.env` explicitly (Next only reads env from the app dir).
- Env is validated at runtime in `apps/web/src/env.ts` (`@t3-oss/env-nextjs` + `zod`).
- **Turborepo Strict Mode is the default (v2):** only env vars declared in `turbo.json` (`env`/
  `globalEnv`) are passed to tasks in CI — undeclared vars are stripped. The app's vars (`AUTH_*`,
  `NEXTAUTH_*`, `DATABASE_URL`, `GOOGLE_CLIENT_*`, `SPOTIFY_CLIENT_*`, `DASHVU_USER_AGENT`) are declared
  on the `build` and `dev` tasks. Add any new required var there too, or CI's `pnpm build` will fail env
  validation at page-data collection.
- **Local OAuth must use `http://127.0.0.1:3000`**, not `localhost` — Spotify rejects `http://localhost`
  redirect URIs as insecure. Register `.../api/auth/callback/spotify` and `.../api/auth/callback/google`.

## Security rules (must follow)

- Server-only modules **must** start with `import "server-only";` (e.g. `packages/api/src/spotify.ts`).
- Never send secrets or OAuth refresh tokens to the client. Never use `NEXT_PUBLIC_*` for secrets.
- Never commit `.env` or print token values in logs/toasts.
- Spotify tokens live in the `account` DB table. Refresh happens server-side in
  `packages/api/src/spotify.ts`; the client session exposes only `id`, `name`, `email`, `image` and
  `hasSpotify` (`apps/web/src/auth.ts`). Never add tokens to the session.
- Google tokens also live in the `account` table. Google Calendar is accessed server-side via
  `packages/api/src/google.ts` (server-only); the session additionally exposes `hasCalendar`, derived
  from the stored Google account scope. Never send Google tokens to the client.

## Conventions

- Do not add comments unless they add real value.
- Client Components must declare `"use client"`.
- New widgets follow the `WidgetConfig` contract in `apps/web/src/types/widget.ts` and render through
  `apps/web/src/components/Widget.tsx`. Every widget **must** be registered in
  `apps/web/src/lib/widget-registry.ts` (`WIDGET_REGISTRY`: kind → `{ Type, Icon, defaultTitle,
defaultSize }`); `Widget.tsx` resolves the component/icon from there. The `kind` enum lives in
  `@dashvu/validators` (`widgetKindSchema`). Widget `size` is a **grid token** (`WxH`, e.g. `1w1h`,
  `2w1h`, `2w2h`, `1w3h`; `widgetSizeSchema` allows width 1-3, height 1-6), mapped to Tailwind
  col/row-span classes by `widgetSizeClasses` — never store raw Tailwind class strings in the DB
  (Tailwind would purge them). The dashboard grid uses `auto-rows-[24rem]`, so `Nh` is N rows tall.
  Sizes are changed by dragging the bottom-right handle in edit mode or via the drawer steppers.
- Widget search UIs **must reuse the shared search pattern** rather than hand-rolling one: a `relative`
  wrapper with an `absolute top-full z-30` results list styled by `menuSurfaceClass`, dismissed via
  `useOnClickOutside` (`@/hooks/use-on-click-outside`) and the **Esc** key. The canonical implementation is
  the Weather location search (`WeatherWidget.tsx`); the `map` widget follows the same pattern. If a second
  widget needs it, extract a reusable `SearchCombobox` instead of copying. Render it in the widget's
  **non-scrolling** area — the widget `<section>` doesn't clip overflow, but an `overflow-y-auto` ancestor
  will, so never nest the search inside the scroll region. Dictionary-style lookups that replace the body
  (not a dropdown) are the exception.
- Users have **multiple dashboards (tabs)**. The server layout bootstraps them via
  `createCaller(...).dashboard.bootstrap()` (`apps/web/src/app/layout.tsx`), which returns
  `{ dashboards, activeId, active }`; the client store is `apps/web/src/components/DashboardsProvider.tsx`
  (wraps the tree inside `TRPCProvider`) and is consumed by both `NavBar` (tab strip + Edit layout / Add
  widget) and `page.tsx` → `Dashboard.tsx` (grid). `dashboard.get({ id })` loads one dashboard,
  `dashboard.list` lists tabs; `create`/`rename`/`remove`/`reorder`/`setActive` manage tabs, and
  `setActive` upserts `userPreferences.activeDashboardId` (FK → `dashboard.id`, `ON DELETE SET NULL`).
  The active tab is persisted in the DB; the first-ever (auto-created) dashboard seeds
  `DEFAULT_WIDGET_LAYOUT`, later ones start empty. Tab management (add/rename/delete/drag-reorder) is
  gated to edit mode; clicking a tab always switches.
- Dashboard layout is persisted per user: the client edits it and auto-saves with `dashboard.saveLayout`.
  `saveLayout` upserts by client-generated widget id scoped to the owner's dashboard and stores the
  **placement** only: `kind`, `size`, `position`, `groupId`. `widgetGroups` (see below) owns all state.
  It returns the resolved widgets (with `groupId`/`title`/`settings`) so the client can adopt the
  server-assigned group right after adding a widget; `Widget.tsx` renders a pending body (and skips
  mounting the widget component) until `widget.groupId` is known, so widget-scoped queries never race
  the not-yet-inserted placement row.
- **A `widgetGroup` is a widget _instance_** (per user, per `kind`): it owns the display `name`
  (title), `settings` (jsonb), and any content. A `widget` row is only a **placement** on a dashboard
  (position/size + `groupId`, `ON DELETE CASCADE`). Settings are **per-instance** (no per-placement or
  global-per-kind settings); size/position stay per-placement. `saveLayout` resolves the owner's default
  group per kind (`resolveGroupForKind` in `packages/api/src/groups.ts`, seeding the group name from the
  client's `instanceName`) unless the client supplies a `groupId` it owns — so instances are reused/shared
  across tabs by default. Instance management lives on `dashboard.listInstances`/`createInstance`/
  `updateInstance`; `get` returns each widget's `title`/`settings` from its group. Instances (and their
  content) persist after the last placement is deleted.
- Widgets that own **content** (not just config) get a dedicated table keyed to `widgetGroup.id` with
  `ON DELETE CASCADE`; the `planner` widget uses `widgetItem` + the `planner` router. Widget components
  receive `widgetId` via `WidgetComponentProps` and call tRPC directly — such procedures resolve the
  `widgetId → groupId` (verifying `widget → dashboard → userId`) and then scope rows by `groupId`; every
  item mutation verifies ownership by joining back to `widgetGroup.userId`. Return dates as ISO strings
  (no superjson transformer) and keep multi-step writes sequential.
- The DB client uses `drizzle-orm/neon-http`, which **does not support `db.transaction`** — write
  multi-step operations sequentially (see `packages/api/src/routers/dashboard.ts`).
- Server data access goes through tRPC routers in `packages/api` (`appRouter`); the Next handler lives
  at `apps/web/src/app/api/trpc/[trpc]/route.ts` and the client hooks in
  `apps/web/src/lib/trpc/client.tsx`.
- Keyless data widgets read through the connector registry (`packages/api/src/connectors/registry.ts`,
  `getConnector(id).invoke(...)`): one connector per source, registered in `CONNECTORS` and mirrored in
  `connectorIdSchema`. The `dictionary` widget composes the `dictionaryApi` connector
  (definitions/phonetics, dictionaryapi.dev) with `datamuse` (synonyms/antonyms) via the `dictionary`
  router; when `dictionaryApi` is slow/unavailable the router falls back to the reliable
  `wiktionary` connector (Wikimedia REST, definitions only), so lookups still resolve. Its Word of the
  Day is picked deterministically from `WORD_OF_THE_DAY` in `@dashvu/core`. Outbound requests via
  `fetchWithRetry` take an optional `timeoutMs` (AbortController) so a dead origin fails fast.
- The `map` widget (kind `map`) is a route planner: it composes the `photon` connector (geocode/reverse,
  Komoot), `osrm` (driving/cycling/walking routes + TSP via `trip`) and `transitous` (MOTIS public-transit
  itineraries) through the `map` router (`packages/api/src/routers/maps.ts`). A `valhalla` connector
  implements the same normalized `RouteResult` and can replace OSRM by switching `ROUTING_ENGINE` there.
  Per-instance state (`mode`/`points`/`favourites`, see `mapSettingsSchema`) is persisted in
  `widgetGroup.settings` via `onSettingsChange`; `points[0]` is the origin and the rest are stops (legacy
  `origin`/`stops` settings are migrated on load; the UI labels the list "Stops"). The Leaflet canvas
  (`MapCanvas.tsx`) is dynamic-`ssr:false` like `WeatherRadar.tsx` and uses `Marker` + `divIcon` (so markers
  are draggable) and `Polyline` (no marker-icon assets); it is `isolate`d so Leaflet's internal z-indexes
  can't paint over modals/dropdowns. The widget's search box lives inside the active-point banner (rendered
  only while adding/editing a point) and follows the shared search pattern above; the map is resizable
  (drag handle, session-persisted) and the stops list fills the remaining height.
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
- Auth.js does **not** refresh tokens/scope for an already-linked account on re-sign-in. To pick up new
  scopes (e.g. Calendar), the `signIn` callback in `apps/web/src/auth.ts` upserts the Google account's
  tokens/scope when the provider returns fresh credentials.

## Testing

No test framework is installed yet. Current phase: **manual smoke checklist** (app-wide). Future phases
add Vitest/Playwright with tests colocated next to source. When adding a test script, wire it into
`turbo.json` and CI.

## Commits

- **Never commit or push** (see Git workflow above) — the maintainer does all git operations manually.
- **Commit messages cover the entire working tree.** Never ask for or assume partial commits; all
  pending changes (modified + untracked) are one commit. Segmenting work is done with branches, not by
  splitting commits.
- Conventional Commits are enforced (commitlint + husky `commit-msg`); keep body lines ≤ 100 chars.
  Multi-line bodies must be passed via a message file (`git commit -F <file>`), since `git commit -m`
  does not wrap.
- `pre-commit` runs lint-staged (Prettier on staged files).

## Known issues / TODO

- `DATABASE_URL` must be present at runtime for auth; the app builds without it (placeholder
  connection string + `force-dynamic` layout). Run `pnpm --filter @dashvu/db db:migrate` once configured.
- Google Calendar uses `react-big-calendar` (month/week/day) + `moment`; the widget fetches events via
  `calendar.getEvents` and shows a reconnect prompt when `hasCalendar` is false. Enabling the Google
  Calendar API + consent-screen scope is a manual Cloud console step (see `.env.example`).
- Phase 4 (in progress): user config now persists (`dashboard`/`widget`). Stage 1 shipped the widget
  registry, `dashboard.saveLayout`, and an edit mode with add/remove/reorder + optimistic auto-save.
  Stage 2 replaced reorder buttons with drag-and-drop via `@dnd-kit` (sortable, `rectSortingStrategy`,
  handle-only drag + kept up/down buttons as fallback). Stage 3 added multiple dashboards (tabs) with
  DB-persisted active tab (`dashboard.bootstrap`/`list`/`get`/`create`/`rename`/`remove`/`reorder`/
  `setActive`, tab drag via `horizontalListSortingStrategy`, management gated to edit mode). Stage 4
  introduced `widgetGroup` as the widget _instance_ (name/settings/content; placements are per-dashboard)
  and a Settings drawer: `SettingsProvider`/`useSettings` (`SettingsDrawer.tsx`) exposes
  `openAppSettings`/`openWidgetSettings(id)`; the widget panel (gear in `SortableWidget`) edits the
  instance name/size and switches/creates instances, the app panel covers Account + Appearance.
  Theming is a Light/Dark registry (`lib/themes.ts`) applied on `<html>` by `PreferencesProvider`
  (theme + reduce-motion, persisted via `user.updatePreferences`). Still TODO: export/import layout,
  richer per-widget settings fields.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
