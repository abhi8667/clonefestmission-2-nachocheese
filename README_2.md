# Triarc — Team Reference

> Placeholder name (*triage* + *arc*) — swap freely.
> Stack: React 18 + Vite + TS + Tailwind/shadcn + Express + SQLite (reused from Mission 1 / CipherDrop), organized as an npm-workspaces monorepo.
> Team: 3-way split — B owns `packages/engine`, A owns `apps/web`, C owns `apps/api`.

This is the single source of truth for the build. If a decision isn't written here, treat it as undecided — ask before assuming, and add the answer back to this doc so nobody re-derives it. Anything not covered by this doc should be resolvable by reading the code in `reference-bugzilla/`, not by guessing.

---

## 1. The thesis

Bugzilla's 1998 innovation was making bug tracking **structured, auditable, and collaborative** at scale. That core is still sound — keep it. What's dated is the *execution*: a hostile search form, a raw-table workflow editor, weak transition guards, email-per-event notifications, relationships buried as bug-ID lists, and a total disconnect from the code where bugs actually get fixed.

**One line:** *Bugzilla tracked where a bug is; Triarc tracks how fast it's moving and why it's stuck — by connecting the tracker to the code.*

Two features carry that thesis and should be treated as the core of the product, not add-ons:

1. **Flow visualization** — a per-bug unified timeline (reported → triaged → branched → PR → reviewed → merged → verified) and a project-wide cumulative-flow view, every delay measured. Only this system can build it, because only it holds both the bug data *and* the git data.
2. **The request/approval inbox** — Bugzilla's best and most-ignored idea (flags: `review?`, `needinfo?`, `approval+`), rebuilt as a personal inbox: "who's waiting on me, who I'm waiting on."

Live Duplicate Radar (semantic dedup on submit) is the strong third feature, plus a git-native lifecycle, a real authorization model, and a keyboard-first UI.

---

## 2. What we verified in the reference (don't re-derive this)

We cloned `github.com/bugzilla/bugzilla` (HEAD `5756ec6`) and read the source directly — `Schema.pm`, `Status.pm`, `Search.pm`, `Install.pm` — rather than working from memory or blog posts. It's still checked out at `reference-bugzilla/` in this repo if you need to verify anything below yourself; every claim here cites a file and line.

**Two myths this corrects — don't repeat them in write-ups or the demo:**

| Myth | What the code actually shows |
|---|---|
| "Bugzilla's workflow is rigid / hardcoded `NEW→ASSIGNED→RESOLVED→VERIFIED→CLOSED`" | **False.** The workflow is a database table `status_workflow(old_status, new_status, require_comment)`, queried live by `can_change_to` (`Bugzilla/Status.pm:139`), editable via `editworkflow.cgi`. The modern default is `UNCONFIRMED / CONFIRMED / IN_PROGRESS / RESOLVED / VERIFIED` (`Bugzilla/Install.pm:33`). |
| "Workflow-as-data would be an innovation" | It's the **reference's own design.** Our edge is a *visual* editor and *richer guards* — Bugzilla's only guard is `require_comment` (a boolean). |

**Ideas worth stealing, found reading the code:**

- **Flags** (`Bugzilla/DB/Schema.pm:624`) — `flagtypes` define typed, permissioned requests (`is_requestable`, `is_requesteeble`, `grant_group_id`, `request_group_id`); `flags` are instances with `status` ∈ `?`/`+`/`-`, a `setter_id`, and an optional `requestee_id`. A general request/approval primitive, underexploited by every modern tracker → our headline #2.
- **`bugs_activity`** (`Schema.pm:323`) — field-level audit log `(bug_id, who, bug_when, fieldid, removed, added, comment_id)`. Every field change is a row. This one table powers the activity feed, the diff view, **and** all flow analytics. (Limitation to fix: Bugzilla's `added`/`removed` are only `varchar(255)` — ours are `TEXT`.)
- **Custom fields as choice-tables** — every enum (`bug_status`, `priority`, `resolution`…) is generated from one `FIELD_TABLE_SCHEMA` with `value`/`sortkey`/`isactive`/`visibility_value_id`, so field visibility can be gated on another field's value. Worth emulating for extensibility.
- **Row-level security** — `bug_group_map` gates bug visibility; `group_control_map` (`Schema.pm:1194`) sets per-product-per-group `entry`/`canedit`/`editbugs`/`canconfirm`; comments/attachments carry `isprivate`.
- **`bug_see_also`** — cross-tracker link table; the natural precedent for our GitHub integration.
- **27 search operators** (`Bugzilla/Search.pm:137`) including the `changed*` family (`changedto`, `changedby`, `changedafter`) — powerful, but exposed through the infamous "boolean charts" form. Keep the power, replace the UI.

---

## 3. Capability checklist (must satisfy, in some form, before calling anything "done")

| Bugzilla concept | Underlying developer need |
|---|---|
| Product / Component / Version / Milestone | Taxonomy to route and scope bugs |
| Severity / Priority | Signal for what to work on first |
| Status / Resolution state machine | Shared "where is this bug right now" |
| CC list / Watchers | Stay informed without owning |
| Blocks / Depends-on / Duplicate-of | Model relationships between bugs |
| Whiteboard / Keywords | Free-form + structured metadata |
| Attachments | Evidence and fixes live with the report |
| Flags (`review?`/`+`/`-`) | Lightweight, role-gated sign-off |
| Groups (security bugs) | Restrict visibility for sensitive reports |
| Activity log | Full audit trail of every change |
| Saved searches / Advanced query | Power filtering over huge volumes |
| Notifications | Push updates to interested parties |
| Time tracking (est/actual) | Project-management signal |

The innovation is *how*, not *whether* — nothing on this list gets silently dropped; if something's descoped, it's a decision written into §11, not an accident.

---

## 4. Design philosophy

1. **Signal over noise** — features should reduce reading/triage burden, not add a field to fill in.
2. **The tracker should know things, not just store them** — dedup, auto-transitions, flow analytics.
3. **Measure momentum, not just status** — a bug stuck 11 days is different from one that just entered a state.
4. **Workflow is configuration** — teams differ; the state machine is data, and its guards are expressive.
5. **Respect the audit trail** — every automated action logs exactly like a human one, marked as automated.

---

## 5. UX — the two screens the thesis lives or dies on

**Bug detail — flow timeline:**

```
┌─────────────────────────────────────────────────────────────────┐
│ #412  Crash on save when offline           [Unconfirmed ▾] ⋯     │
├─────────────────────────────────────────────────────────────────┤
│ reported ──▶ triaged ──▶ branch ──▶ PR ──▶ review ──▶ merged      │
│    │           │           │        │        │          │        │
│   2d 4h       1d 2h       3h       6h     4d 1h ◀━━ stalled       │
│                                            waiting on review      │
│                                            (flag review? → @alex) │
├─────────────────────────────────────────────────────────────────┤
│ Comments · Relationships · Attachments · Activity log            │
└─────────────────────────────────────────────────────────────────┘
```

The stalled segment must be visually distinct (color + label), not just a longer bar — that's the one design decision that makes the thesis legible at a glance.

**Request Inbox:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Inbox                                    Incoming (3)  Outgoing (2)│
├─────────────────────────────────────────────────────────────────┤
│ ● review?     #412  Crash on save…        from @sam    2d ago    │
│   [ + Approve ]  [ - Request changes ]  [ Open bug ]              │
├─────────────────────────────────────────────────────────────────┤
│ ● needinfo?   #398  Login fails on…       from @priya   6h ago    │
│   [ Reply ]                                            [ Open ]   │
└─────────────────────────────────────────────────────────────────┘
```

One-click resolve from the inbox itself — no navigating to the bug first — is what makes this feel like an inbox and not a filtered bug list with extra clicks.

**Other UX rules to hold everyone to:**
- Two views, one data model: dense table (triage/power users) and card view (status overview), same filters drive both.
- Inline editing everywhere — no "edit mode" modal for a one-line field change.
- Command palette (`⌘K`) for navigation and actions.
- Accessibility from day one, not a pass at the end: semantic HTML, visible focus states, WCAG AA contrast, full keyboard nav.

---

## 6. Features

### A. Flow Visualization (thesis feature)
- **Per-bug unified timeline:** union `activity` rows with git events (branch-created, PR-opened, review-submitted, merged), sorted into one lane. Every gap is measured; the longest is called out ("stalled 4d — waiting on review").
- **Project cumulative-flow diagram:** stacked areas of how many bugs sit in each state over time, reconstructed from the activity log (Bugzilla approximates this on a cron via `series`/`series_data`; we derive it properly from the log).
- **Derived metrics:** time-in-state per stage, review latency, reopen rate, and the sleeper signal — **branches that started in git then went quiet** while the bug is still `In Progress`. Neither Bugzilla nor GitHub alone can see this.
- **Degrades gracefully:** if GitHub isn't connected, the timeline still renders from `activity` alone.

### B. Request Inbox (flags done right)
- Typed, role-gated requests attached to a bug or attachment: `review?`, `needinfo?`, `approval±`. A request has a setter and an optional requestee.
- A personal inbox: *Incoming* (asks awaiting your answer) and *Outgoing* (asks you're blocked on), each one-click resolvable.
- An open `review?` flag is exactly the "waiting on review" gap the timeline highlights — the two features are meant to reference each other in the UI.

### C. Live Duplicate Radar
- As a reporter types title/description, real-time semantic similarity against existing bugs (embeddings, not keywords) surfaces likely duplicates before submission, with a score.
- Local `all-MiniLM-L6-v2` via `transformers.js`/ONNX (no API key, no network dependency) + `sqlite-vec` or an in-memory cosine index. No Postgres/pgvector needed.
- Needs curated/seeded data to produce convincing matches — see §12.

### D. Git-native lifecycle
- `Fixes #123` in a commit or PR body auto-transitions the bug and writes an `automated: true` activity row.
- PR review state maps onto flags: an approved PR resolves a `review?` flag as `+`.
- Runs through a GitHub adapter (webhook ingest → internal domain event) so the rest of the system only ever sees the same event shape it already handles from manual UI actions — GitHub can be disconnected without touching anything downstream.

### E. Workflow engine
- The state machine is data (JSON, per project), not code. See §8 for the schema and guard model.
- Guards are expressive — required fields, actor role, side-effects — beyond Bugzilla's boolean-only `require_comment`.
- A visual builder over the JSON is a UI layer on top of an already-working engine, not a prerequisite for the engine working.

### F. Relationships
- Blocks / depends-on / duplicate-of as first-class rows (`relationships` table), not text ID lists.
- Rendered as an interactive graph (`react-force-graph`) on top of the same table a plain list view also reads from.

### G. Search
- A typed query language (`status:open assignee:me priority:high`) parsed into one query AST, replacing Bugzilla's "boolean charts" form while preserving its power — including the `changed*` family (`changedto`, `changedby`, `changedafter`).

### H. Notifications (fills the checklist, not a headline)
- SSE covers live updates for anyone actively in the app; the Inbox covers requests. Neither reaches a watcher who's offline, and §3 still requires "push updates to interested parties" in some form.
- Answer: a lightweight batched digest ("since you were away: 3 comments, 1 status change, 1 new `review?` on bugs you watch") rather than Bugzilla's per-event email flood — read straight off the `activity` log on login/poll, no new write path or queue needed.

---

## 7. Architecture

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Frontend (React + Vite, TS) │◄──SSE──│  Event stream (SSE over HTTP) │
│  Tailwind + shadcn/ui        │        │  live field updates (one-way) │
│  TanStack Query              │        └──────────────┬───────────────┘
└──────────────┬───────────────┘                       │
               │ REST                                   │
┌──────────────▼───────────────────────────────────────▼──────────────┐
│                  Backend API (Express + TypeScript)                   │
│  ┌──────────┐ ┌─────────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐ │
│  │ Bug CRUD │ │ engine      │ │ Flags /  │ │ Flow   │ │ Search /  │ │
│  │ + Authz  │ │ (§8)        │ │ Requests │ │ metrics│ │ dedup     │ │
│  └──────────┘ └─────────────┘ └──────────┘ └────────┘ └───────────┘ │
└──────────┬───────────────────────────────────────┬──────────────────┘
           │                                        │
   ┌───────▼────────┐                      ┌────────▼─────────┐
   │ SQLite          │                      │ GitHub adapter   │
   │ (better-sqlite3)│                      │ (webhook ingest, │
   │ bugs, activity, │                      │  Octokit)        │
   │ flags, relations│                      └──────────────────┘
   │ + vec index     │
   └────────────────┘
```

### Monorepo layout (npm workspaces)

Ownership boundaries are literal in the filesystem, not just described in prose:

```
triarc/
├─ packages/
│  ├─ engine/          # B: workflow state machine, guards, flag resolution,
│  │                    #    flow-metrics derivation, query AST — pure TS, zero I/O
│  └─ shared-types/     # frozen seam contracts (§10): Bug, Activity, Flag,
│                        #  Transition, WorkflowConfig, GitHubEvent
├─ apps/
│  ├─ api/              # C: Express routes, SQLite, authz, SSE, GitHub adapter
│  └─ web/               # A: React UI, timeline, inbox, dedup UI
└─ package.json          # workspaces: ["packages/*", "apps/*"]
```

`engine` and `shared-types` are versioned local packages consumed by `api` unchanged — the same shape that worked for the 3-way split on TiXPay (`packages/engine` owned independently of UI/integration). `engine` has no dependency on Express, SQLite, or HTTP at all, so it stays portable if the framework around it ever changes.

### Stack rationale

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TS + Vite + Tailwind + shadcn/ui | Already shipped on it; accessible components out of the box |
| Realtime | SSE for live field updates; a small heartbeat mechanism for presence | One-way push covers the actual need without a WebSocket server |
| Backend | Express + TS | Reused; thin HTTP wrapper over a pure-TS core |
| DB | SQLite (better-sqlite3) | Synchronous, fast, zero-setup. `sqlite-vec` for dedup |
| Embeddings | `transformers.js` `all-MiniLM-L6-v2` (ONNX, local) | No API key / network dependency, deterministic |
| Auth | JWT (short-lived) + refresh, role claims | Simple, RBAC-ready, no external dependency |
| Attachments | Local filesystem (object store later if needed) | No infra needed at this scale |
| Git | Octokit + webhook receiver, behind an adapter | Ingest normalizes to the same internal event the UI already handles |
| Deploy | Docker Compose (local/offline) + hosted (Vercel + Render) | Matches the CipherDrop deploy pattern |

**Presence, specified honestly:** SSE is server→client only, so "who's viewing this bug" isn't free from the event stream. It's a small separate mechanism: the client `POST /presence/heartbeat`s every ~10s while a bug detail view is open, the server keeps a short-TTL in-memory map (`bugId → [userId, lastSeen]`), and presence changes are pushed to viewers as another event on the same SSE channel.

### Core data model

```sql
-- bugs: normalized, unlike Bugzilla's varchar string-copies
bugs(id, title, description, status, severity, priority,
     component_id, reporter_id, assignee_id, created_at, updated_at)

-- every field change, human or automated (fixes Bugzilla's varchar(255) limit — this is TEXT)
activity(id, bug_id, actor_id NULL, field, old_value TEXT, new_value TEXT,
         automated BOOL, created_at)   -- actor_id NULL = system action

-- relationships as first-class rows (not text ID lists)
relationships(id, from_bug_id, to_bug_id, type)  -- BLOCKS|DEPENDS_ON|DUPLICATE_OF|RELATED_TO

-- flags: typed, permissioned requests
flag_types(id, name, target, is_requestable, is_requesteeble,
           grant_role, request_role)
flags(id, type_id, bug_id, attach_id NULL, status, setter_id,
      requestee_id NULL, created_at, resolved_at NULL)  -- status ∈ ?,+,-

-- dedup
bug_embeddings(bug_id, vector)          -- 384-dim, via sqlite-vec

-- git links (the bug_see_also idea, made structured)
git_links(id, bug_id, kind, ref, url, state, updated_at)  -- kind: BRANCH|PR|COMMIT

-- row-level security
groups(id, name); bug_group_map(bug_id, group_id); user_group_map(user_id, group_id)
```

---

## 8. Workflow engine — the contract everyone builds against

The state machine is a per-project JSON config, validated server-side on every transition. Guards are expressive (not just Bugzilla's boolean `require_comment`):

```json
{
  "projectId": "default",
  "states": ["Unconfirmed","Confirmed","In Progress","In Review","Resolved","Verified","Closed","Duplicate","WontFix"],
  "initial": "Unconfirmed",
  "transitions": [
    { "from": "Unconfirmed", "to": "Confirmed",   "roles": ["triager","admin"] },
    { "from": "Confirmed",   "to": "In Progress", "roles": ["developer","admin"] },
    { "from": "In Progress", "to": "In Review",   "roles": ["developer","admin"], "automatable": true },
    { "from": "In Review",   "to": "Resolved",    "roles": ["developer","admin"], "automatable": true,
      "guards": { "requireComment": true, "requireFields": ["resolution"] } },
    { "from": "Resolved",    "to": "Verified",    "roles": ["reporter","triager","admin"] },
    { "from": "*",           "to": "Duplicate",   "roles": ["triager","admin"],
      "guards": { "requireFields": ["duplicate_of"] } }
  ]
}
```

A transition is rejected if it isn't in the graph, the actor lacks the role, or a guard fails. Automated transitions (git webhook, dedup) set `automated: true` and still write to `activity` — the audit trail is never bypassed. Lives in `packages/engine` as pure TS (no I/O) — unit-testable and reusable server-side without dragging in Express or SQLite.

**Test list for `engine`** (write these as the actual test file, not just a design note):
- valid transition with satisfied role + guards → accepted, produces an `activity` row
- transition not in the graph → rejected, no row written
- correct role but failed guard (missing required field) → rejected with a specific reason
- wrong role, valid transition → rejected
- `"*"` wildcard `from` matches any current state
- automated transition sets `automated: true` on the resulting row
- flag lifecycle: request created → `?`; resolved → `+`/`-`; requestee-only can resolve, setter cannot self-approve

---

## 9. Performance

- **Indexes:** `activity(bug_id, created_at)` — the timeline and flow queries are the hottest path and both filter+sort on exactly this pair; `bugs(status, component_id)` for the default list view; `flags(requestee_id, status)` for the inbox.
- **Flow metrics are computed incrementally, not recomputed per read.** Time-in-state and stage latency are derived once per `activity` write (the transition that closes a state) and cached on the bug row. Full-log replay only runs for the project-wide cumulative-flow diagram, which isn't on the interactive path.
- **Duplicate-radar embedding calls are debounced** (~300ms after typing stops) and run against an index scoped to the active project, not a full-corpus scan.
- **Target:** bug list and bug detail render in <150ms server-side at ~10k seeded bugs on `better-sqlite3`. Verify this with a seed script and a timer once the endpoints exist — don't just assert it.
- SQLite's write-serialization is a real ceiling at production scale — Postgres is the natural next step past this build, not a flaw to hide.

---

## 10. Security model

- RBAC roles: `reporter`, `developer`, `triager`, `admin`, `security`.
- Per-bug security groups (Bugzilla-style): a `security`-flagged bug is invisible to non-members *everywhere* — list, search, and the duplicate radar's suggestions.
- Every field change (human or automated) writes to `activity`; nothing is silently mutated.
- Attachments scoped by the same bug-level visibility rules.
- Webhook signature verification on `X-Hub-Signature-256` — an unauthenticated endpoint that mutates bug state is a real hole, not a hypothetical one.
- JWT short-lived + refresh rotation; rate limiting on the public surface (reuse CipherDrop's `express-rate-limit` setup).

---

## 11. Team ownership & seams

| Owner | Module | Scope | Depends on |
|---|---|---|---|
| **B** | `packages/engine` (pure TS, no I/O) | Workflow state machine + guard validation, flags/request resolution logic, flow-metrics derivation from the activity log, query AST. Fully unit-tested. | nothing (pure functions) |
| **A** | `apps/web` | React UI: bug list (table+card), detail view, flow timeline + CFD, Request Inbox, dedup radar UI, `⌘K` palette, a11y. | engine types, API contract |
| **C** | `apps/api` | Express routes, authz middleware, SQLite persistence, SSE, embeddings service, GitHub adapter (webhook ingest → internal events). | engine, DB |

**Seam contracts — freeze these before diverging, they're what let three people build in parallel without merge hell:**
1. The `activity` row shape (everything else derives from it).
2. The REST surface (§12).
3. The workflow JSON schema (§8).
4. The internal event type the GitHub adapter emits — the same shape the UI already handles for manual actions, so the adapter is swappable/disable-able without touching anything downstream.

---

## 12. API surface

```
POST   /api/bugs                    create (triggers duplicate-radar check)
GET    /api/bugs?filter=...         list / search (typed query → AST)
GET    /api/bugs/:id                detail incl. relationships, activity, flags, git links
PATCH  /api/bugs/:id/transition     { toState, comment?, fields? } — validated by engine
POST   /api/bugs/:id/relate         { toBugId, type }
POST   /api/bugs/:id/comments
POST   /api/bugs/:id/attachments
GET    /api/bugs/:id/duplicates     live semantic similarity
GET    /api/bugs/:id/timeline       unified activity + git events
POST   /api/bugs/:id/flags          create a request (review?/needinfo?/approval)
PATCH  /api/flags/:id               resolve a request (+/-)
GET    /api/inbox                   incoming + outgoing requests for me
GET    /api/analytics/flow          cumulative-flow + stage latencies + stalled branches
POST   /api/webhooks/github         signed; commit/PR → internal event → transition
GET    /api/stream                  SSE: live field updates + presence
```

REST + OpenAPI over GraphQL — faster to scaffold and easier to spot-check with curl.

---

## 13. Demo

### Seed data

The flow diagram and duplicate radar both need history a fresh build won't have accrued organically. Write a fixture script that seeds ~150 bugs with backdated `activity` timestamps spanning a simulated multi-week project, rather than trying to generate real activity live. State this openly when demoing ("seeded project history, live interactions from here") — it costs nothing to be upfront about it and avoids ever being caught implying otherwise.

### Script (aim 4–5 min)

1. Bug list — table/card toggle, saved search, filters. Establishes the capability checklist (§3) is covered before anything else.
2. File a bug that's a near-duplicate of a seeded one — Live Duplicate Radar catches it mid-typing with a similarity score.
3. Open a bug with a stalled `In Review` segment on its flow timeline — the stalled bar is visually distinct, labeled "waiting on review," and links straight to the open `review?` flag behind it (§5, §6.B — the two features referencing each other is the point, not a coincidence).
4. Switch to the Request Inbox, resolve that same `review?` flag in one click, jump back to the bug and watch the timeline segment close out live.
5. Push a commit with `Fixes #<id>` (or replay a captured webhook payload) — the bug auto-transitions, and the activity row shows `automated: true`.
6. Close on the project-wide cumulative-flow diagram — the one view neither Bugzilla nor GitHub can produce alone, and say so explicitly.

---

## 14. Cut list under time pressure

Order to cut first if time runs short (top = first cut) — mapped to owners so whoever's blocked can be told directly, not left guessing. Ranked by actual dispensability, not by section order — the last two are deliberately kept longest because they're directly on the demo script, not just conceptually nice:

1. **Notifications digest (H)** — the newest, most speculative feature here; not part of the demo script at all. SSE + Inbox alone still satisfy §3's "push updates" checklist line for anyone actively using the app.
2. **Search AST (G)** — fall back to basic status/assignee/priority filters; the `changed*` operator family stays stretch-only regardless, and it isn't in the demo script either.
3. **Presence heartbeat (§7)** — already called decoration there; drop it early among the realtime work, keep the SSE field-update channel itself.
4. **Visual workflow builder UI (E)** — the JSON engine (§8) and the status dropdown driven by it already make "workflow is data" visibly true; the drag-and-drop editor on top is a cosmetic layer over something that already works.
5. **Cumulative-flow diagram (part of A)** — it's the demo script's closing beat (step 6); if it goes, the demo just ends one step earlier at the git-automation reveal and still lands. Keep the per-bug unified timeline regardless — that's the actual reveal moment (§5, script step 3), not this.
6. **Git-native automation (D)** — cut last of the six: it's demo script step 5 *and* the literal thesis line (§1 — "connecting the tracker to the code"). Falls back to a manual transition + narrating "this fires from the webhook in the real build"; keep the adapter's internal event *shape* (§7) even with nothing populating it live, so the seam contract stays intact for whoever picks it back up.

**Never cut:** `engine`'s transition validation + guards, the `activity` audit log, Live Duplicate Radar, and the Request Inbox's one-click resolve. Those four are what prove both "understood the reference deeply" (the §2 source-verified work) and "genuinely innovated" (flags → inbox, activity log → flow) — almost certainly the two heaviest-weighted halves of the judging.

---

## 15. Open decisions

- **Dedup index** — `sqlite-vec` (persisted) vs in-memory cosine (zero-dep). Start in-memory; swap only if it's a bottleneck.
- **Auth depth** — full RBAC vs. a handful of seed roles hardcoded for the demo. The data model supports full RBAC either way; start with seed roles.
- **GitHub auth** — PAT-per-project (quick) vs GitHub App + OAuth (more correct, more setup). Start with PAT; note the App as the production path.
- **Presence** — build it, or drop it and keep only live field updates. It's decoration on top of the SSE channel, not load-bearing for the thesis.
