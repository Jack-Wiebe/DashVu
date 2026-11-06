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
  can't paint over modals/dropdowns. The Leaflet container is a dedicated child with a **stable
  className**; never put dynamic React classes or React children on it, or React will overwrite
  Leaflet's classes and blank the map. The widget's search box lives inside the active-point banner (rendered
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
  `calendar.getEvents` fans out over the user's **entire calendar list** (`calendarList.list` with
  `showHidden: true`, including shared/subscribed/hidden calendars; `freeBusyReader` entries are
  filtered out in code) with bounded concurrency + a 60s per-calendar cache; `calendar.listCalendars`
  backs the per-instance filter. `widgetGroup.settings.hiddenCalendarIds` is an **exclude list** (all
  calendars shown by default, new ones appear automatically), editable in the Settings drawer → Widget
  settings → Calendars. Events carry `color`/`foregroundColor` from their calendar (applied via
  `eventPropGetter`) and a compound `id` (`<calendarId>:<eventId>`) to avoid cross-calendar collisions.
  Two **synthetic** calendars are exposed alongside the real ones: `__birthdays__` ("Birthdays") is
  derived from Primary's `eventType: "birthday"` events (Primary is fetched even when hidden so
  Birthdays still works), and `__tasks__` ("Tasks") comes from the Google Tasks API via
  `getTasksClientForUser` — each dated task becomes an all-day event on its `due` date, and undated
  tasks appear on the client-local `today`. (`due` is the scheduled date; the newer Google Tasks UI
  "deadline" is not exposed by the API, so task events link to the task via `webViewLink` instead.)
  The client sends `timeMinDate`/`timeMaxDate`/`today` as
  `YYYY-MM-DD` to avoid UTC boundary bugs; tasks are fetched unfiltered and range-filtered server-side
  because the Tasks API drops undated tasks when `dueMin`/`dueMax` are set). Tasks require the
  `tasks.readonly` scope (`hasTasks` in the session); enabling the Google Tasks API + scope on the
  consent screen is a manual Cloud console step, then the user must re-connect Google once.
  `calendar.getEvents` returns `{ events, tasksError }` (`tasksError` is `"disabled" | "scope" |
"unknown" | null`) so the widget can show an inline hint (with a reconnect action for `scope`)
  instead of failing silently.
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

## Phased Roadmap

This roadmap captures the decisions made for the next DashVu phases. It supersedes the
"Phase 4 (in progress)" note above for upcoming work. Implement one phase at a time and keep the
app runnable after each change.

### Locked decisions

**Map**

- Optimize already works; keep it.
- Any point can be pinned. Start/end are fixed by default.
- Multiple pinned middle stops keep their exact positions; unpinned stops optimize around them.
- If routing optimization fails, use a local nearest-neighbor fallback.
- Saved locations are separate from trip pins: per-user reusable places, added from a route point,
  surfaced in a quick-add list.
- Adding a stop uses an always-visible search box plus a `+` button that unlocks click-to-add mode
  with a visible pin/cursor cue.
- `Use my location` moves into the search bar and adds a stop.
- New map instances start with current location as origin; denied geolocation falls back to last
  known; permission is requested once.

**Spotify**

- Playback bar uses local progress interpolation between polls and corrects on each poll.
- Add a device selector in the widget header.
- `NO_ACTIVE_DEVICE` shows available devices plus a hint to open Spotify on a device.
- Selecting a device transfers playback.

**Gallery**

- Use an S3-compatible storage adapter. Cloudflare R2 is the recommended free target: 10 GB
  storage, 1M writes, 10M reads, free egress. Provider remains swappable.
- Per-user image library; private signed URLs.
- Limits: 10 MB per image, 100 images per user.
- Presigned direct upload; server-generated thumbnails via a finalize endpoint using `sharp`.
- One upload at a time; JPEG/PNG/WebP.
- Thumbnail-grid library UI.
- Uploading keeps the current image; if none exists, use the newest upload.
- Existing local/Data-URL images have no real data, so remove that path.
- Persist filter, parameter, source, and current image per widget instance. Random images restore
  the filter but load a fresh image; uploaded images restore the exact image.

**Fun Pack**

- New packs: meditation, affirmations, learnings, vocabulary, history/news.
- Per-instance config; hide disabled packs and skip their fetches.
- Users can enable/disable, reorder, choose category, and choose item count.
- Text + links; manual shuffle only.
- APIs + local fallback.
- Sources: Human Concepts for meditation, affirmations.dev for affirmations, Wikipedia random for
  learnings, local word list + dictionaryapi.dev for vocabulary, existing Wikimedia On This Day for
  history/news.

**Calendar**

- Month view only.
- Clicking `+N more` opens a day agenda modal.
- Clicking an event inside expands details inline.
- Agenda content matches the existing event details modal.
- Mobile behavior stays a centered, scrollable modal for now.

**Topbar**

- Both the tab name and the three-dot button drag.
- A click on the dots still opens Rename/Delete.
- Keep the three-dot icon as the visual affordance.

### Phase 1 — Bugs and quick wins

#### 1. Spotify progress interpolation

Files: `apps/web/src/components/widgets/SpotifyWidget.tsx`,
`packages/api/src/routers/spotify.ts`.

- Track `progress_ms`, `is_playing`, and the response timestamp.
- Advance the displayed progress locally between polls.
- Reset interpolation on track change, pause, seek, skip, or new poll.
- Do not show progress past track duration.

Acceptance: progress moves smoothly during playback; pause/seek/skip resync correctly; the bar never
exceeds the track length.

#### 2. Spotify device selector

- Add a device control to the widget header.
- Fetch devices when the menu opens and refresh with playback state.
- Show `NO_ACTIVE_DEVICE` as a device list plus an "Open Spotify on a device" hint.
- Add/transfer playback support.
- Keep device errors scoped to the selector, not the whole widget.

Acceptance: users can see and choose available devices; selecting a device transfers playback; a new
device login no longer leaves the widget with no options; `NO_ACTIVE_DEVICE` is actionable, not just a
toast.

#### 3. Topbar drag via dots

Files: `apps/web/src/components/NavBar.tsx`.

- Attach dnd-kit listeners/attributes to the three-dot trigger as well as the tab name.
- Keep normal click opening the Rename/Delete menu.
- Use the existing activation distance so click vs drag is distinguishable.
- Keep reordering gated to edit mode.

Acceptance: dragging the dots reorders tabs; clicking the dots still opens the menu; tab name drag
still works; order persists after reload.

#### 4. Smoke-test resolved items

- Settings: outside click and Esc close app/widget drawers.
- Instancing: create/select/update instance persists without reload.
- Edit controls: settings/remove/resize still work after widget drag.

### Phase 2 — Map UX

#### 1. Extend map settings

Files: `packages/validators/src/map.ts`, `apps/web/src/components/widgets/MapWidget.tsx`,
`packages/db/src/schema.ts` if needed.

Add to per-instance settings: `pinnedIds: string[]` and
`lastKnownLocation?: { lat, lon, label? }`. Keep existing `mode`, `points`, `favourites`.

#### 2. Pinning and optimization

- Add a pin toggle on every stop row; keep start/end visually distinct as fixed endpoints.
- Default optimize constraints: first + last fixed.
- Pinned middle stops stay at their exact index.
- Optimize each segment between fixed anchors independently; concatenate results.
- Extend `map.optimize` input to accept fixed/pinned indices.
- Add local nearest-neighbor fallback if routing optimization fails.

Acceptance: Optimize reorders only allowed stops; start/end remain fixed by default; pinned middle
stops do not move; unpinned stops optimize around pins; engine failure still produces a usable order.

#### 3. Saved locations

New table `savedLocation` keyed to `user.id`: `id`, `userId`, `label`, `lat`, `lon`, `createdAt`.

Router: `map.listSavedLocations`, `map.createSavedLocation`, `map.renameSavedLocation`,
`map.removeSavedLocation`.

UI:

- Save an existing route point.
- Show saved locations only in the quick-add list.
- One-tap add to the current route.
- No map layer markers for saved locations.

Acceptance: saved locations are shared across map instances for the same user; adding one creates a
normal route point; deleting one does not remove it from existing trips; ownership is enforced
server-side.

#### 4. Add-location flow

- Keep the search bar always visible in the non-scrolling widget area.
- `+` toggles click-to-add mode, not an immediate add.
- In click-to-add mode, show a pin/crosshair cursor and add a point only on map click.
- Clicking `+` again exits the mode.
- Add `Use my location` inside the search bar; it adds a stop.
- Selecting a search result adds immediately and exits the mode.
- Keep the shared search pattern: outside click, Esc, `menuSurfaceClass`.

Acceptance: normal map navigation does not accidentally add points; click-to-add mode is obvious and
reversible; search is always available; `Use my location` is discoverable and adds a stop; Esc/outside
click closes results.

#### 5. New-instance current location

- On first map instance with no origin, request browser geolocation once.
- On success, add current location as origin.
- On denial/unavailable, use last known location if available; otherwise show the empty prompt.
- Persist the last known location for reuse.
- Do not repeatedly prompt after the user denies.

Acceptance: new instances start with current location as origin when allowed; denied permission
falls back gracefully; no repeated permission prompts on every load.

### Phase 3 — Gallery storage

#### 1. Storage adapter

Create a server-only S3-compatible adapter with `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Default target: Cloudflare R2; provider remains
swappable. Private bucket; short-lived signed URLs; configure bucket CORS for canvas filtering.

Acceptance: local/dev can point at R2, S3, B2, or MinIO via env; no storage secrets reach the client.

#### 2. Database schema

New table `galleryImage` keyed to `user.id`: `id`, `userId`, `storageKey`, `thumbnailKey`,
`filename`, `contentType`, `size`, `width`, `height`, `createdAt`.

Rules: cascade on user delete; per-user count/size limits enforced server-side; deleting an image
deletes both original and thumbnail objects.

#### 3. Router and upload flow

Add `gallery` router: `list`, `createUploadUrl`, `finalizeUpload`, `delete`, `signedUrl`,
`thumbnailUrl`.

Flow: client requests a presigned PUT; client uploads one file directly; client calls
`finalizeUpload`; server validates object type/size, generates a thumbnail with `sharp`, stores it,
and returns metadata. Reject unsupported types: only JPEG/PNG/WebP. Enforce 10 MB and 100 images/user.

Acceptance: upload succeeds without proxying the file through the API; thumbnail appears after
finalize; oversized/wrong-type files are rejected; users cannot read or delete another user's image.

#### 4. Gallery UI

- Add a thumbnail-grid library dialog.
- One-at-a-time upload with progress/error state.
- Delete from the library.
- Set current image explicitly.
- Keep the current image after a new upload; if none exists, select the newest.
- Apply existing canvas filters to uploaded images.
- Remove the Data-URL upload path.

Acceptance: users can upload, browse, select, and delete images; filters still work on uploaded
images; upload failures are visible and retryable; no local Data-URL persistence remains.

#### 5. Gallery state persistence

Store per instance in `widgetGroup.settings`: `filterId`, `filterParam`,
`source: "random" | "upload"`, `currentImageId`, optional `lastRandomUrl`.

Behavior: uploaded source restores the exact image; random source restores the filter but loads a
fresh image on reload; filter changes persist immediately; add a reset action if needed.

Acceptance: reload restores filter/parameter; uploaded image survives reload; random source does not
force the same image; state is per gallery instance.

### Phase 4 — Fun Pack expansion

#### 1. Source connectors

Add connectors/wrappers:

- `humanConcepts` for meditation quotes.
- `affirmationsDev` for affirmations.
- `wikipediaRandom` for learnings.
- Vocabulary uses the existing word list + `dictionaryApi`.
- History/news continues using `wikimediaOnThisDay`.

Fallback: every new pack has a small curated local fallback list. A failed source returns a per-pack
error/fallback indicator, not an empty widget.

#### 2. Per-instance settings

Add `funPackSettingsSchema` stored in `widgetGroup.settings`:
`packs: Array<{ id, enabled, order, category?, count }>`. Existing quote/joke/fact/on-this-day become
pack IDs. New pack IDs: `meditation`, `affirmations`, `learnings`, `vocabulary`, `history`.

UI: settings drawer list with switches, drag reorder, category selector where supported, count
stepper, and per-pack shuffle.

#### 3. Router behavior

- `funPack.getPack` accepts enabled packs and per-pack options.
- Skip fetches for disabled packs.
- Return text + optional link per item.
- Manual shuffle: refetch only the selected pack.
- No automatic daily rotation unless explicitly re-added later.

Acceptance: disabled packs are hidden and not fetched; order and count persist per instance; shuffle
changes only the requested pack; a failing API does not blank the whole widget; links open correctly.

### Phase 5 — Calendar day agenda

Files: `apps/web/src/components/widgets/CalendarViews.tsx`,
`apps/web/src/components/widgets/CalendarWidget.tsx`.

- Intercept `+N more` / `onShowMore` in month view.
- Open a custom day agenda modal styled like the event details modal.
- List all events for the day using the same detail information.
- Clicking an event expands its details inline within the agenda.
- Keep existing event-click details for non-agenda clicks.
- Keep tasks/event links working.
- Use a centered scrollable modal on mobile for now.

Acceptance: `+N more` opens the day agenda, not the default popup; agenda shows all events for the
day; inline expansion matches the detail modal content; week/day views are unchanged; Esc/overlay
close the agenda; task links still say "Open in Google Tasks."

### Cross-cutting work

- DB changes: edit `packages/db/src/schema.ts`, run `pnpm --filter @dashvu/db db:generate`, and commit
  the generated SQL in `packages/db/drizzle/`.
- Server-only modules: `import "server-only";` for storage/Spotify/Google.
- Validate ownership on every gallery/map/fun-pack procedure.
- No secrets or long-lived signed URLs sent to the client.
- Update `turbo.json` env declarations for new S3 variables.
- Update this file for new storage/Fun Pack/map rules.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm format`, plus manual smoke checklist.
- No git commit/push; maintainer handles all git operations.

### Open technical decisions

- R2 account/credentials and bucket provisioning are still needed before Phase 3 can ship. The S3
  adapter lets implementation start before the provider is finalized.
- Confirm `sharp` works in the deployment runtime; if not, move thumbnail generation to a worker.
- Calendar month-only agenda needs a quick mobile check after implementation.
- Fun Pack APIs are third-party and may change; local fallbacks are mandatory.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
