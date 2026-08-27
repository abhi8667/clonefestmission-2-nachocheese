# Triarc — Implementation Plan

> Companion to `README.md` (product thesis, architecture, feature spec). This doc is the *build order* — what gets built when, by whom, and what "done" means at each checkpoint. If README.md changes a decision, this doc's task list follows it, not the other way around.

Owners per README §11: **B** = `packages/engine` (pure TS, no I/O) · **A** = `apps/web` · **C** = `apps/api`.

Six phases. Phase 0 is a hard sync point — nobody diverges until it's done. After that, phases run in parallel per owner with explicit hand-off points called out.

---

## Phase 0 — Freeze the seams (all three, together, first)

Everything downstream depends on these four contracts being written down, not just agreed verbally (README §11):

1. **`packages/shared-types`**: `Bug`, `Activity`, `Flag`, `FlagType`, `Relationship`, `Transition`, `WorkflowConfig`, `GitHubEvent` — the types every package imports, nobody redefines locally.
2. **Default workflow config** — check in the JSON from README §8 as `packages/engine/config/default-workflow.json`, v0. Changing it later is a one-file edit, not a refactor.
3. **REST surface** — write README §12's endpoint list as an OpenAPI stub (paths + request/response shapes, no implementation). A and C build against this, not against each other's WIP.
4. **Monorepo skeleton** — npm workspaces (`packages/*`, `apps/*`), shared `tsconfig`/eslint, root scripts (`dev`, `test`, `build`) that run all three.

**Definition of done:** `npm install` at root succeeds, all four workspaces compile with zero source, `shared-types` imports cleanly from both `apps/web` and `apps/api`.

---

## Phase 1 — Core vertical slice (parallel)

| Owner | Tasks |
|---|---|
| **B** | Transition validator against `WorkflowConfig`: role check, guard check (`requireComment`, `requireFields`), `"*"` wildcard `from`. Write the full §8 test list now, as real tests — not a placeholder. Zero dependency on Express/SQLite. |
| **C** | DB schema + migrations for `bugs`, `activity`, `relationships`, `flag_types`, `flags`, `groups`/`bug_group_map`/`user_group_map` (README §7 SQL, exact shape). `POST /api/bugs`, `GET /api/bugs`, `GET /api/bugs/:id`. JWT auth skeleton with role claims. |
| **A** | App shell, routing, bug list (table view first — it's the power-user default, card view second), bug detail page against real or mocked data via `shared-types`. Command palette skeleton (`⌘K`, no actions wired yet). |

**Hand-off:** C's API is live before A needs real data; B's engine has zero blockers and can finish early — if it does, B starts on Phase 2's flag lifecycle logic immediately rather than waiting.

**Definition of done:** a bug created via curl/Postman is visible, unstyled is fine, in the web list.

---

## Phase 2 — Wire the engine in; workflow becomes visible

| Owner | Tasks |
|---|---|
| **C** | Integrate B's `engine`: `PATCH /api/bugs/:id/transition` calls the validator, writes `activity` on success, returns the specific guard-failure reason on rejection (not a generic 400). Flags endpoints: `POST /api/bugs/:id/flags`, `PATCH /api/flags/:id`, `GET /api/inbox`. |
| **B** | Flag lifecycle logic: request created → `?`, resolved → `+`/`-`, requestee-only can resolve (setter cannot self-approve) — plus its test case from §8. |
| **A** | Status control driven by the *current* workflow config's valid transitions from this state — not a hardcoded dropdown. This is the moment "workflow-as-data" stops being a backend claim and becomes visibly true in the UI. Request Inbox UI per the §5 mockup, wired to `GET /api/inbox`, one-click resolve. |

**Definition of done:** a bug moves through its full lifecycle via the UI with a bad transition visibly rejected with a reason; a `review?` flag can be requested and resolved end-to-end from the Inbox.

---

## Phase 3 — The two headline features + duplicate radar (never-cut, do these before anything in Phase 4)

| Owner | Tasks |
|---|---|
| **B** | Flow-metrics derivation: time-in-state per stage computed once on the `activity` write that closes a state (§9 — incremental, not recomputed per read), cached on the bug row. |
| **C** | `GET /api/bugs/:id/timeline` — union `activity` rows with git events into one sorted lane (git events can be stubbed/empty until Phase 4). `bug_embeddings` table + `sqlite-vec` (or in-memory cosine per §14's open decision — start in-memory). `GET /api/bugs/:id/duplicates`, debounced 300ms client-side. |
| **A** | Per-bug flow timeline UI, stalled segment visually distinct (color + label, not just a longer bar — README §5 is explicit this is the one design decision that makes the thesis legible). Live Duplicate Radar UI in the new-bug form, similarity score shown inline. |

**Definition of done:** filing a near-duplicate of a seeded bug surfaces a scored match before submit; a bug with a stale open `review?` flag shows a labeled, visually distinct stalled segment on its timeline.

---

## Phase 4 — Git-native lifecycle, relationships, search, notifications (build in this order; first to drop per README §14 if behind)

| Owner | Tasks |
|---|---|
| **C** | GitHub webhook receiver, `X-Hub-Signature-256` verification (§10 — not optional, an unsigned endpoint that mutates bug state is a real hole). Octokit adapter normalizing commit/PR events into the *same* internal event shape manual UI actions already produce. `Fixes #123` regex → transition call. |
| **B** | Flow-metrics extended with the "branch started in git, went quiet while still In Progress" sleeper signal (§6.A). Relationship guard rules if any surface (e.g. no self-blocking). |
| **A** | Relationships as a force-directed graph (`react-force-graph`) reading the same `relationships` table the plain list already uses. Project-wide cumulative-flow diagram. If time allows past this: basic query AST for search (§6.G), notifications digest (§6.H) — in that order, per the cut-list priority. |

**Definition of done:** a replayed webhook payload auto-transitions a bug and its activity row shows `automated: true`.

---

## Phase 5 — Seed data, polish, rehearsal

- Fixture script: ~150 bugs, backdated `activity` timestamps across a simulated multi-week project (§13).
- Accessibility pass: keyboard nav, visible focus states, WCAG AA contrast (§5) — don't leave this to the last hour, it's cheap early and expensive late.
- Performance check against the §9 target (<150ms at ~10k seeded bugs) — measure it with a timer, don't just assert it.
- Run the §13 demo script start-to-finish at least twice before presenting.

**Definition of done:** the demo runs without narration gaps, and anything cut per §14 is *cleanly absent* — no half-built dead buttons left in the UI.

---

## Cross-phase rules

- Nobody touches a frozen seam (Phase 0 list) without flagging it to the other two first — that's the entire point of freezing it.
- Every automated action (engine, webhook, digest) writes to `activity` exactly like a human action would, from Phase 1 onward — don't defer this and try to retrofit it later.
- If a phase's Definition of Done isn't met, don't start the next phase's headline work on that owner's track — patch or descope first. The cut list (README §14) exists precisely so this is a pre-made decision, not a debate under time pressure.
