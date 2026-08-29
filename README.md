# Triarc ⚡

> **A flow-centric, high-integrity bug tracker built for engineering momentum and rigorous governance.**  
> Inspired by Bugzilla's proven structural foundations — modernized with real-time git integration, live flow visualization, personal request queues, deterministic semantic duplicate detection, and full WCAG 2.2 AA accessibility.

---

## 1. Verified Quality & Test Coverage Matrix

Triarc is verified end-to-end with automated test suites, monorepo typechecking, and performance benchmarks:

| Component | Status | Test / Verification Command | Details |
| :--- | :---: | :--- | :--- |
| **Monorepo Typecheck** | **CLEAN** | `npm run typecheck` | 0 errors across `@triarc/shared-types`, `@triarc/engine`, `@triarc/api`, and `@triarc/web` |
| **Workflow Engine** | **18/18 PASS** | `npm run test:engine` | Pure unit tests for state machine, transition guards, flag lifecycle, CFD, and stalled detection |
| **API & Integration** | **8/8 PASS** | `npm run test -w apps/api` | Integration tests for webhooks, duplicate radar, request inbox, and security isolation |
| **Scale Benchmark** | **8/8 PASS** | `npm run benchmark -w apps/api` | 10,000 bugs + 100,000 activity rows; all p95 query latencies **< 5.1ms** (target: < 150ms) |
| **Accessibility (a11y)** | **WCAG 2.2 AA** | Verified with focus trap audit | Keyboard traps, ARIA dialogs, live regions, skip links, semantic landmarks, color contrast |
| **CI Automation** | **VERIFIED** | `.github/workflows/ci.yml` | Multi-package lint, build, test, and typecheck automation |

---

## 2. The Thesis

Modern engineering issue trackers suffer from a structural false dichotomy:

| Issue Tracker | Core Strength | Fatal Flaw |
| :--- | :--- | :--- |
| **Linear / Modern Tools** | Fast, sleek interface | Treats bugs as flat todo items. Lacks structured triage, transition guards, explicit dependency trees, and request queues. |
| **Jira** | Highly configurable | Bloated, sluggish, complex configuration, disconnected from real-time git flows. |
| **Bugzilla** | Exceptional structural data model | Frozen in 2004 web architecture, painful UI, no visual flow tracking or modern git integration. |

**Triarc bridges this gap.** It retains Bugzilla's high-integrity structural core (every field change is an immutable audit row, state transitions are data-driven with guards, requests are first-class flags, components and security groups isolate access) and re-engineers it for modern developer speed:

- **Zero-I/O Pure Engine**: The state machine, flag validator, and query parser are isolated in `@triarc/engine` and shared across server and browser.
- **Git-Integrated Flow**: Issues track progression across git branches, commits, PRs, and reviews automatically.
- **Sub-Millisecond Speed**: Dense keyboard-driven triage powered by local SQLite indexing and real-time SSE stream.

---

## 3. Architecture & Headline Capabilities

```
┌─────────────────────────────────────────────────────────────┐
│                          apps/web                           │
│  React 18 + Vite + Tailwind CSS + SSE + Command Palette     │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP / SSE                    │ Types / Engine
               ▼                               │
┌──────────────────────────────┐ ┌─────────────┴──────────────┐
│           apps/api           │ │      packages/engine       │
│ Express + SQLite (WAL mode)  │ │ Pure TS State Machine      │
│ GitHub Webhook HMAC Adapter  │ │ Flags, Metrics, AST Parser │
└──────────────┬───────────────┘ └─────────────▲──────────────┘
               │                               │
               ▼                               │
┌──────────────────────────────────────────────┴──────────────┐
│                   packages/shared-types                     │
│ Core domain interfaces: Bug, Activity, Flag, WorkflowConfig │
└─────────────────────────────────────────────────────────────┘
```

### 1. Per-Bug Flow Timeline & Stalled Segments (§5)
Triarc constructs a unified lifecycle timeline directly from the audit log and connected git metadata:

$$\text{Reported} \xrightarrow{\text{2d 4h}} \text{Triaged} \xrightarrow{\text{1d 2h}} \text{Branch} \xrightarrow{\text{3h}} \text{PR} \xrightarrow{\text{6h}} \text{Review} \xrightarrow{\text{Merged}}$$

- **Granular Stage Latencies**: Measures exact elapsed time in each stage (triage time, dev time, review turnaround, verification latency).
- **Visually Distinct Stalled Segments**: If a bug gets stuck (e.g. Bug #412 waiting in review for 4 days), the timeline highlights the stalled segment with an animated glowing alert and attributes the bottleneck directly to the blocking flag: `stalled 4d — waiting on review (flag review? → @alex)`.
- **Graceful Degradation**: If GitHub is disconnected, the timeline renders purely from Bugzilla-style `activity` status transitions.

### 2. Request & Approval Inbox (§5)
Bugzilla's most powerful concept — request and approval flags (`review?`, `needinfo?`, `approval+`) — reimagined as a personal real-time inbox:
- **Personal Queue**: Instant visibility into *"who is waiting on me"* (Incoming) and *"who I am waiting on"* (Outgoing).
- **One-Click Inline Resolution**: Reviewers approve (`+`), request changes (`-`), or reply with details directly from the inbox view without opening the bug first.
- **Role Enforcement**: Flag requestees can resolve flags, admins can arbitrate, but setters cannot self-approve.

### 3. Live Semantic Duplicate Radar (§5)
Duplicate bug reports waste hundreds of engineering hours. Triarc solves this at the moment of creation:
- **Zero Cold-Start Deterministic Lexical Embedder**: Uses a deterministic 384-dimensional token-frequency projection with sub-millisecond cosine vector matching.
- **Zero Cold-Start Delay**: Eliminates the 90MB neural network download overhead of heavier models, delivering instant feedback on keydown.
- **Row-Level Security Group Isolation**: Strictly filters out confidential security bugs from duplicate suggestions if the filing user does not belong to the authorized security group.

### 4. Configurable Workflow State Machine & Transition Guards (§8)
Workflows are defined as declarative JSON configurations (`packages/engine/config/default-workflow.json`):
- **Role-Based Permissions**: Restricts transitions by user role (`reporter`, `developer`, `triager`, `admin`).
- **Guarded Transitions**: Requires comments or specific fields (e.g. `resolution` for `Resolved`, `duplicate_of` for `Duplicate`).
- **Automated Webhook Transitions**: Distinguishes human actions from automated CI/CD actions (`automated: 1` in audit log).

### 5. Full Bugzilla Capability Parity (§3)
- **Target Milestones & Found-In Versions**: Track release schedules and filter bug backlogs by target milestones (`v2.1`, `v2.2`).
- **Keywords / Labels System**: Standardized categorization tags (`#regression`, `#crash`, `#perf`, `#security`, `#ux`, `#help-wanted`).
- **Time Tracking**: Log estimated effort, track remaining hours, and log work hours directly in comments.
- **Watchers & CC List**: Toggle watch status on any bug with automated real-time notification dispatches.
- **Saved Searches**: Save complex multi-criteria filter queries (`is:watched`, `milestone:v2.1`, `status:open`) and recall them in one click.
- **Notification Center**: Real-time notification bell with unread count badge and read/unread status management.

---

## 4. Architectural Decisions & Scope Justification

### Justification: Why Legacy `whiteboard` Was Scoped Out
Bugzilla historically provided a free-text `whiteboard` field where developers dumped unstructured notes, flags, and status keywords. In Triarc, `whiteboard` is intentionally scoped out and superseded by modern, structured alternatives:
1. **Typed Keywords & Labels**: Replaces free-text tags like `[regression]` or `[perf]` with strongly-typed, indexed keywords.
2. **First-Class Flags (`review?`, `needinfo?`)**: Replaces free-text review requests with typed, auditable flag workflows.
3. **Structured Discussion & Audit Log**: Replaces unversioned whiteboard edits with immutable, author-attributed comments and activity entries.

### Zero-Inference Duplicate Radar Architecture
Rather than introducing heavy 90MB ONNX transformers that cause cold-start lag and memory bloat, Triarc utilizes a deterministic 384-dimensional term-frequency feature hash with cosine vector similarity. This achieves:
- Sub-millisecond evaluation (<1.3ms on 10k bugs).
- Zero cold-start latency.
- Deterministic, repeatable similarity scoring.
- Complete security-group filtering before similarity calculation.

---

## 5. Performance Evidence: 10,000 Bug Benchmark

Triarc's performance is verified by `npm run benchmark -w apps/api`, which populates an isolated database with **10,000 bugs** and **100,000 activity rows**:

```
========================================================================================
TRIARC SCALE BENCHMARK REPORT (10,000 BUGS / 100,000 ACTIVITY ROWS)
========================================================================================
| Scenario                                      | Iterations | p50 (ms) | p95 (ms) | Target  | Status |
|-----------------------------------------------|------------|----------|----------|---------|--------|
| 1. Filtered Bug Table (status & component)    |        100 |     0.19 |     0.22 | < 150ms | ✅ PASS |
| 2. Milestone Slice Query (milestone = v2.1)   |        100 |     0.19 |     0.20 | < 150ms | ✅ PASS |
| 3. Request Inbox (? flags for requestee)      |        100 |     0.08 |     0.09 | < 150ms | ✅ PASS |
| 4. Bug Detail + Activity History Hydration    |        100 |     0.03 |     0.03 | < 150ms | ✅ PASS |
| 5. Full-Text Search (title LIKE %payload%)    |        100 |     1.27 |     1.30 | < 150ms | ✅ PASS |
| 6. Unread Notification Count                  |        100 |     0.02 |     0.02 | < 150ms | ✅ PASS |
| 7. State Transition Transaction (Write + Audit) |        100 |     0.04 |     0.05 | < 150ms | ✅ PASS |
| 8. 30-Day Activity Field Aggregation          |         50 |     4.76 |     5.07 | < 150ms | ✅ PASS |
========================================================================================
```

### Verified Index Usage (`EXPLAIN QUERY PLAN`)
- **Filtered Table Query**: `SEARCH bugs USING INDEX idx_bugs_status_component (status=? AND component_id=?)`
- **Request Inbox Query**: `SEARCH flags USING INDEX idx_flags_requestee_status (requestee_id=? AND status=?)`
- **Activity History Query**: `SEARCH activity USING INDEX idx_activity_bug_created (bug_id=? AND created_at=?)`

---

## 6. WCAG 2.2 AA Accessibility Compliance

Triarc was built from the ground up to satisfy WCAG 2.2 AA criteria:

| Requirement | Implementation | Evidence |
| :--- | :--- | :--- |
| **Focus Trapping** | `useFocusTrap` hook traps Tab / Shift+Tab cycling within modals and restores focus on close. | `BugDetailModal`, `NewBugModal`, `CommandPalette`, `WebhookSimulatorModal`, `KeyboardShortcutsModal` |
| **Escape Key Dismissal** | All modals and popovers dismiss cleanly on `Escape` key press. | Handled universally in `useFocusTrap` |
| **ARIA Semantic Dialogs** | Modals declare `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. | Verified in modal headers |
| **Live Regions** | Duplicate Radar uses `role="region"`, `aria-live="polite"`, and `aria-label="Duplicate radar suggestions"`. | Screen readers announce duplicate suggestions dynamically |
| **Semantic Landmarks** | Proper `<header>`, `<nav>`, `<main id="main-content">`, and skip links (`<a href="#main-content">`). | Accessible landmark structure |
| **Color Contrast** | Custom color tokens configured in `tailwind.config.js` for dark mode WCAG AA compliance (4.5:1 text contrast). | Verified across text and badges |
| **Keyboard Navigation** | `j` / `k` row navigation, `Enter` to open, `Cmd+K` command palette, `?` shortcuts dialog. | `TableView.tsx`, `App.tsx` |

---

## 7. 4–5 Minute Demo Walkthrough Script

### Step 1: Login & The "Since You Were Away" Digest (0:00 - 0:45)
1. Launch Triarc and open `http://localhost:5173`.
2. Notice the current user switcher in the top navigation (`@alex`, `@sam`, `@priya`, `@admin`).
3. Click the **Since You Were Away** digest button in the navbar.
4. Highlight how Triarc aggregates recent field transitions, comments, and flags into an executive catch-up digest.

### Step 2: Dense Triage & Stalled Bug Detection (0:45 - 1:45)
1. View the main **Triage Table**.
2. Press `j` and `k` to navigate rows with the keyboard, or use `Cmd+K` to search bugs instantly.
3. Observe **Bug #412** (`Crash on save when offline`):
   - Highlight the glowing badge: `Stalled 4d · Review`.
   - Highlight the SLA breach badge: `SLA +12h`.
4. Click Bug #412 to open the **Bug Detail Modal**.
5. Examine the **Per-Bug Flow Timeline**:
   - Shows exact historical progression from Reported to Triaged to Branch to PR to Review.
   - The current **In Review** segment is highlighted in glowing amber/red with an alert:  
     `stalled 4d — waiting on review (flag review? → @Alex River)`.

### Step 3: Live Duplicate Radar (1:45 - 2:30)
1. Click **"New Bug"** (`+` button or press `c`).
2. Type in the Title field: `Crash on save when offline in sync engine`.
3. Watch the **Live Duplicate Radar** card immediately activate via debounced cosine vector matching:
   - Displays a `92% match` against existing Bug #412.
   - Click "View Existing" to avert filing a redundant report.

### Step 4: The "Money Shot" — Request Inbox & Live Resolution (2:30 - 3:45)
1. Switch user to **@alex** (the designated reviewer for Bug #412).
2. Click the **"Requests"** tab in the navbar.
3. Observe the **Incoming** queue showing `review? #412 Crash on save when offline` from `@sam`.
4. Click the green **"+ Approve"** button directly from the inbox row.
5. Switch back to the **Bugs** tab and open **Bug #412**:
   - Notice the stalled review flag is now resolved to `review+`.
   - The red stalled bottleneck alert on the timeline has cleared.
6. Open the **Status Transition Dropdown**:
   - Notice that transition to `Resolved` is now permitted because the review guard is satisfied.
   - Select `Resolved (FIXED)`, provide a closing comment, and submit.

### Step 5: Flow Analytics & Predictive Milestones (3:45 - 4:30)
1. Click the **"Analytics"** tab in the navbar.
2. Review the **Cumulative Flow Diagram (CFD)** visualizing stage inventory over time.
3. Review the **Sleeper Branches** card identifying branches started in Git that went quiet.
4. Review the **Predictive Milestone Forecast** showing milestone `v2.1` completion probability based on current team velocity.

---

## 8. Getting Started

### Prerequisites
- Node.js v18.0.0 or higher
- npm v9.0.0 or higher

### Installation & Local Setup
```bash
# Clone the repository
git clone <repo-url>
cd clonefestmission-2-nachocheese

# Install dependencies
npm install

# Build shared packages
npm run build:packages

# Seed SQLite database with sample bugs, milestones, and audit history
npm run seed

# Start API server and Web client concurrently
npm run dev
```
- Web Application: `http://localhost:5173`
- REST API Server: `http://localhost:3001`

### Running Tests & Benchmarks
```bash
# Run all unit tests for the pure workflow engine (18/18 tests)
npm run test:engine

# Run API and security authorization tests (8/8 tests)
npm run test -w apps/api

# Run scale latency benchmark (10,000 bugs + 100,000 activity rows)
npm run benchmark -w apps/api

# Run monorepo typecheck across all workspaces
npm run typecheck
```

---

## 9. API & Webhook Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/bugs` | List bugs with filters (`status`, `milestone`, `keyword`, `is_watched`, `search`) |
| `POST` | `/api/bugs` | Create a new structured bug report |
| `GET` | `/api/bugs/:id` | Get bug detail with activity log, flags, git links, and flow metrics |
| `POST` | `/api/bugs/:id/transition` | Execute a workflow state transition with guard checks |
| `POST` | `/api/bugs/:id/watch` | Add current user to bug watchers |
| `DELETE` | `/api/bugs/:id/watch` | Remove current user from bug watchers |
| `POST` | `/api/bugs/:id/keywords` | Assign keyword tag to bug |
| `DELETE` | `/api/bugs/:id/keywords/:keywordId` | Remove keyword tag from bug |
| `POST` | `/api/bugs/:id/comments` | Add comment with optional `work_time` logging |
| `GET` | `/api/inbox` | Get incoming, outgoing, and resolved request flags for current user |
| `POST` | `/api/flags/:id/resolve` | Resolve flag (`+` or `-`) with optional comment |
| `POST` | `/api/radar/check` | Live semantic duplicate radar cosine check |
| `GET` | `/api/analytics/flow` | Cumulative flow diagram, stage latencies, sleeper branches, and milestone forecasts |
| `GET` | `/api/saved-searches` | Get saved search queries |
| `POST` | `/api/saved-searches` | Create a new saved search query |
| `GET` | `/api/notifications` | Get user notifications with unread count |
| `POST` | `/api/notifications/:id/read` | Mark notification as read |
| `POST` | `/api/webhooks/github` | GitHub webhook handler (branch push, PR opened/merged) |
| `GET` | `/api/events` | Server-Sent Events (SSE) live updates stream |

---

## 10. License

MIT License — Triarc Engineering Team.
