# Smoke checklist

Manual verification run between commits while no automated E2E suite exists (see
[`testing.md`](./testing.md) for the Playwright plan). Run the **baseline** after every step;
steps add their own targeted checks on top.

Commands used: `pnpm typecheck && pnpm lint && pnpm format:check` (T1), `pnpm test` (T2),
`pnpm build` at phase gates (T3).

## Baseline (≈2 min)

1. `pnpm dev` → app loads at `http://127.0.0.1:3000`, no console errors.
2. Signed out → sign-in page renders; sign in with Google (or existing session).
3. Dashboard loads with default widgets (Spotify, Gallery, Calendar).
4. Tab strip: switch tabs, add a tab, rename, drag-reorder, three-dot menu opens.
5. Edit mode: toggle on → add widget, remove widget, drag-reorder, resize via handle, toggle off.
6. Settings drawer: gear on a widget → rename, switch instance, create instance; app panel →
   theme toggle (Light/Dark), reduce-motion toggle; Esc + outside click close it.
7. Reload → layout, active tab, theme all persisted.

## Per-step targeted checks

Steps in the quality-hardening plan append their targeted checks here (or reference them in the
plan) when they land. Keep this file truthful: remove checks that no longer apply.
