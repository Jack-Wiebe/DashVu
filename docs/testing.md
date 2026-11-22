# Playwright E2E testing plan

**Status: planned, not yet implemented.** Vitest unit tests are the current automated safety net
(see [smoke-checklist.md](./smoke-checklist.md) for manual verification). This document records the
decisions for browser-level end-to-end coverage so it can be picked up later without
rediscovering them.

## Goal & scope

Automate the full-stack flows that unit tests cannot reach — real UI, real tRPC, real database:

- **Auth:** sign-in page renders, session bootstraps the dashboard layout, signed-out redirect.
- **Dashboard CRUD:** tab switch / add / rename / delete / drag-reorder; active tab persists
  across reload.
- **Widget lifecycle:** add, remove, drag-reorder, resize, edit-mode toggle; optimistic save
  followed by reload verification.
- **Settings:** drawer open/close (Esc + outside click), instance switch/create/rename, theme and
  reduce-motion persistence.
- **Map:** search + select, click-to-add, pin toggle, optimize, saved locations (all
  route-mocked).
- **Gallery:** upload flow (mocked storage), filter application, current-image persistence.
- **Calendar:** month/week/day render, event modal, `+N more` day agenda, task links.

Everything requiring real third-party consent or physical devices stays manual (see
"Manual forever" below).

## Harness plan

### Test database

- **Option A:** a dedicated Neon **branch** per CI run — instant, disposable, matches production
  Postgres exactly.
- **Option B:** containerized Postgres (e.g. `postgres:16`) for local runs — free and offline,
  with minor dialect risk versus Neon.

Decide at implementation time. Either way, setup runs migrations
(`pnpm --filter @dashvu/db db:migrate`) and seeds a known user before the suite.

### Authentication

Production uses Google OAuth + database sessions; E2E must not depend on Google. Planned
approach: a **test-only sign-in path** active only when an `E2E` env flag is set — either a
credentials provider enabled in test mode, or direct session-row injection into the test DB
before the run.

- Credentials provider (recommended for M1): covers the sign-in form itself.
- Session injection: faster, but skips the sign-in UI.

### Third-party APIs

Spotify, Google Calendar/Tasks, weather, news, and map engines are intercepted with Playwright
**route mocking** (`page.route`) serving recorded fixtures. No live third-party calls in CI —
deterministic, fast, and free.

### Isolation

Parallel runs must not share state: one seeded user (or schema) per worker, so tests stay
independent.

## Structure

- `playwright.config.ts` at the repo root with `webServer: pnpm dev` reusing
  `http://127.0.0.1:3000`.
- Tests in `e2e/`, one file per flow (`dashboard.spec.ts`, `map.spec.ts`, …).
- Page objects in `e2e/pages/` for repeated regions (NavBar, SettingsDrawer, widget chrome).
- Route-mock payloads in `e2e/fixtures/`.
- `@playwright/test` as a root devDependency; browsers installed via
  `npx playwright install --with-deps chromium`.
- Start with **chromium only**; add Firefox/WebKit once the suite is stable.

## CI

- Separate workflow job initially (e.g. `.github/workflows/e2e.yml`) — independent browser
  cache and failure artifacts (trace + screenshot).
- Depends on the main build job; runs on PRs once M1 is green (or nightly until flaky-free).
- Never touches production services: test DB only, all third-party traffic mocked.

## Milestones

| #   | Scope                  | Notes                                                                                     |
| --- | ---------------------- | ----------------------------------------------------------------------------------------- |
| M1  | Auth + dashboard smoke | Automates the baseline smoke checklist; ships the harness (config, test DB, sign-in path) |
| M2  | Widget lifecycle       | Add/remove/drag/resize, settings drawer, instances, theme                                 |
| M3  | Map + gallery          | Route-mocked search/pin/optimize/saved locations; upload + filters                        |
| M4  | Calendar               | Views render, event modal, `+N more` agenda, task links                                   |

Each milestone lands in its own commit; M1 includes the harness.

Once the harness exists, also cover **cross-user ownership** (e.g. `saveLayout` group
kind-mismatch, gallery/map/fun-pack ownership checks) with two seeded users — today those paths
are covered by code review only.

## Manual forever

These stay manual and belong in [smoke-checklist.md](./smoke-checklist.md):

- Real Google OAuth consent screens and scope re-consent (Calendar/Tasks).
- Spotify device transfer and playback on physical devices.
- Browser-native geolocation permission prompts.
- Visual polish judgments (animations, theme transitions).

## References

- Baseline manual checklist: [smoke-checklist.md](./smoke-checklist.md)
- Unit test conventions: [`AGENTS.md`](../AGENTS.md) → Testing
