# Triarc ⚡

> **A flow-centric bug tracker built for momentum and engineering rigor.**  
> Inspired by Bugzilla's proven structural foundations — modernized with real-time git integration, live flow visualization, personal request queues, and semantic duplicate detection.

---

## Table of Contents

- [The Thesis](#the-thesis)
- [Headline Capabilities](#headline-capabilities)
  - [1. Per-Bug Flow Timeline & Stalled Segments](#1-per-bug-flow-timeline--stalled-segments)
  - [2. Request & Approval Inbox](#2-request--approval-inbox)
  - [3. Live Semantic Duplicate Radar](#3-live-semantic-duplicate-radar)
- [Core Features & Architecture](#core-features--architecture)
  - [Dynamic Workflow Engine](#dynamic-workflow-engine)
  - [First-Class Issue Relationships & Graph](#first-class-issue-relationships--graph)
  - [Real-Time GitHub Webhooks & Automation](#real-time-github-webhooks--automation)
  - [Project Cumulative Flow Diagram (CFD) & Sleeper Branches](#project-cumulative-flow-diagram-cfd--sleeper-branches)
  - [Dense Triage Table, Kanban & Command Palette](#dense-triage-table-kanban--command-palette)
  - [Security Groups & Confidential Reports](#security-groups--confidential-reports)
- [Monorepo Structure](#monorepo-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Build](#installation--build)
  - [Database Seeding](#database-seeding)
  - [Running Locally](#running-locally)
- [Running Tests & Benchmarks](#running-tests--benchmarks)
- [4–5 Minute Demo Walkthrough Script](#45-minute-demo-walkthrough-script)
- [API & Webhook Reference](#api--webhook-reference)

---

## The Thesis

Modern engineering issue trackers suffer from a false dichotomy:

| Tool | The Flaw |
| :--- | :--- |
| **Linear / Modern Tools** | Fast and slick, but treats bugs as flat tasks. Lacks structured triage, guard rails, explicit blocking dependencies, and request queues. |
| **Jira** | Highly configurable, but bloated, slow, and disconnected from the developer's raw git code flow. |
| **Bugzilla** | Excellent data model (auditable activity log, flags, strict workflow state machine, components), but frozen in 2004 web architecture. |

**Triarc bridges this gap.** It keeps Bugzilla's high-integrity structural core (every field change is an immutable audit row, state transitions are data-driven with guards, requests are first-class flags) and re-engineers it for modern developer speed:

- **Zero-I/O Pure Engine**: The state machine, flag validator, and query parser are isolated in `@triarc/engine` and shared across server and browser.
- **Git-Integrated Flow**: Issues track progression across git branches, commits, PRs, and reviews automatically.
- **Sub-10ms Speed**: Dense keyboard-driven triage powered by local SQLite indexing and real-time SSE stream.

---

## Headline Capabilities

### 1. Per-Bug Flow Timeline & Stalled Segments
Triarc constructs a unified lifecycle timeline directly from the audit log and connected git metadata:

$$\text{Reported} \xrightarrow{\text{2d 4h}} \text{Triaged} \xrightarrow{\text{1d 2h}} \text{Branch} \xrightarrow{\text{3h}} \text{PR} \xrightarrow{\text{6h}} \text{Review} \xrightarrow{\text{Merged}}$$

- **Granular Stage Latencies**: Measures exact elapsed time in each stage (triage time, dev time, review turnaround, verification latency).
- **Visually Distinct Stalled Segments**: If a bug gets stuck (e.g. Bug #412 waiting in review for 4 days), the timeline highlights the stalled segment with an animated glowing alert and attributes the bottleneck directly to the blocking flag: `stalled 4d — waiting on review (flag review? → @alex)`.
- **Graceful Degradation**: If GitHub is disconnected, the timeline renders purely from Bugzilla-style `activity` status transitions.

### 2. Request & Approval Inbox
Bugzilla's most powerful concept — request and approval flags (`review?`, `needinfo?`, `approval+`) — reimagined as a personal real-time inbox:
- **Personal Queue**: Instant visibility into *"who is waiting on me"* (Incoming) and *"who I am waiting on"* (Outgoing).
- **One-Click Inline Resolution**: Reviewers approve (`+`), request changes (`-`), or reply with details directly from the inbox view without having to open the bug first.
- **Role Enforcement**: Flag requestees can resolve flags, admins can arbitrate, but setters cannot self-approve.

### 3. Live Semantic Duplicate Radar
Duplicate bug reports waste hundreds of engineering hours. Triarc solves this at the moment of creation:
- **Real-Time Embedding Similarity**: As a user types the bug title or description, a debounced 384-dimensional vector comparison calculates cosine similarity against existing open/resolved bugs.
- **Inline Duplicate Alert**: Displays matched bugs with exact similarity percentages (e.g., `92% match`) and quick-links before the report is ever submitted.

---

## Core Features & Architecture

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

### Dynamic Workflow Engine
Workflows are defined as declarative JSON configurations (`packages/engine/config/default-workflow.json`). The state machine enforces:
- **Role-Based Permissions**: Restricts transitions by user role (`reporter`, `developer`, `qa`, `admin`).
- **Expressive Guards**: Transitions can enforce `requireComment: true` or `requireFields: ["resolution", "duplicate_of"]`.
- **Wildcards**: Supports `*` wildcard source states (e.g. closing or marking duplicate from any active state).
- **Automation Rules**: Flags transitions that can be triggered automatically via external git webhooks.

### First-Class Issue Relationships & Graph
Relationships are modeled as first-class rows in the `relationships` table rather than plain text ID lists:
- Types: `BLOCKS`, `DEPENDS_ON`, `DUPLICATE_OF`, `RELATED_TO`.
- Interactive node graph visualization rendered side-by-side with tabular dependency lists.
- Cycle protection prevents circular blocking dependencies ($A \to B \to A$).

### Real-Time GitHub Webhooks & Automation
Inbound GitHub webhook payloads are HMAC-SHA256 verified and processed automatically:
- **Commit Push**: Commits with `Fixes #<id>` auto-transition bugs to `Resolved` and create an activity record with `automated: true` and `actor_id: null`.
- **Pull Request Open**: Moves linked bugs to `In Progress` or `In Review`.
- **PR Review Approval**: Automatically approves open `review?` flags on linked bugs.
- **Built-in Simulator**: Test and replay GitHub webhook events interactively with the included Webhook Simulator modal.

### Project Cumulative Flow Diagram (CFD) & Sleeper Branches
- **Cumulative Flow Diagram**: Stacked area chart reconstructed from historical `activity` log transitions showing work distribution over time.
- **Sleeper Branch Detection**: Automatically flags branches that were created in git but have gone quiet (>3 days without commits) while the parent bug remains `In Progress`.
- **Flow Metrics**: Live metrics dashboard tracking triage latency, dev cycle time, review turnaround, and reopen rate %.

### Dense Triage Table, Kanban & Command Palette
- **Dense Table View**: Low-latency list with full keyboard navigation (`j` / `k` to navigate, `Enter` to open), severity/priority badges, and fast filter dropdowns.
- **Kanban Card View**: Column-based view grouped by lifecycle status.
- **Command Palette (`⌘K` / `Ctrl+K`)**: Rapid keyboard search for bugs, tabs, actions, and persona switching.

### Security Groups & Confidential Reports
- Row-level access control restricting confidential security bugs (`security_group_id: 'grp_sec'`) to authorized group members. Non-members cannot view, search, or access confidential issue payloads.

---

## Monorepo Structure

```
.
├── packages/
│   ├── shared-types/             # Domain TypeScript type definitions
│   │   ├── src/index.ts
│   │   └── package.json
│   └── engine/                   # Pure TypeScript zero-I/O workflow engine
│       ├── config/
│       │   └── default-workflow.json
│       ├── src/
│       │   ├── workflow.ts       # State transition & guard validation
│       │   ├── flags.ts          # Flag lifecycle validator
│       │   ├── metrics.ts        # Stage latency & stalled calculation
│       │   ├── query.ts          # Search query AST parser
│       │   └── relationships.ts  # Relationship graph & cycle check
│       ├── test/
│       │   └── engine.test.ts    # 13 comprehensive unit tests
│       └── package.json
├── apps/
│   ├── api/                      # Backend REST API & SSE Server
│   │   ├── src/
│   │   │   ├── db/               # SQLite database & schema (WAL mode)
│   │   │   ├── middleware/       # JWT auth & security group filters
│   │   │   ├── routes/           # REST endpoints (bugs, flags, analytics, webhooks)
│   │   │   ├── services/         # SSE stream, duplicate radar, GitHub adapter
│   │   │   ├── scripts/seed.ts   # Multi-week historical seed generator
│   │   │   └── index.ts          # Express server entry point
│   │   ├── test/api.test.ts      # Latency & integration test suite
│   │   └── package.json
│   └── web/                      # React 18 + Vite + Tailwind Frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── BugDetail/    # FlowTimeline, StatusTransition, FlagsPanel, etc.
│       │   │   ├── BugList/      # TableView, CardView, FilterBar
│       │   │   ├── Inbox/        # RequestInbox (Incoming/Outgoing/History)
│       │   │   ├── Analytics/    # FlowAnalyticsView & CFD area chart
│       │   │   ├── NewBug/       # NewBugModal with Live Duplicate Radar
│       │   │   ├── WebhookSimulator/ # GitHub event replayer
│       │   │   ├── CommandPalette.tsx
│       │   │   └── Navbar.tsx
│       │   ├── context/          # AuthContext & SSEContext
│       │   ├── services/api.ts   # Typed API client
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── package.json
├── package.json                  # Root npm workspaces config
└── tsconfig.base.json            # Base compiler configuration
```

---

## Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or later
- **npm**: `v9.0.0` or later

### Installation & Build

```bash
# Clone the repository
git clone https://github.com/your-org/triarc.git
cd triarc

# Install dependencies across all workspaces
npm install

# Build all packages (shared-types, engine, api, web)
npm run build
```

### Database Seeding
Seed the database with 146 realistic historical bugs, 596 audit log rows, 37 flags, and headline demo scenarios:

```bash
npm run seed -w apps/api
```

### Running Locally

Start both the backend API and frontend Vite server concurrently:

```bash
npm run dev
```

Or run them individually in separate terminals:

```bash
# Terminal 1: Backend API (port 3001)
npm run dev:api

# Terminal 2: Frontend Web App (port 5173 / 5174)
npm run dev:web
```

Once started, open [http://localhost:5174](http://localhost:5174) in your browser.

---

## Running Tests & Benchmarks

Triarc includes unit tests for the pure engine and integration benchmarks for the API.

```bash
# Run all tests across the monorepo
npm test

# Run engine unit tests
npm test -w packages/engine

# Run API integration and latency benchmarks
npm test -w apps/api
```

### Benchmark Results
- **Engine Unit Tests**: `13 pass, 0 fail` (~75ms)
- **API Query Latency**: **1.41ms** (Target: `<150ms` on 150+ seeded bugs)
- **Duplicate Radar Match**: **2.52ms**
- **Webhook Processing**: **1.24ms**

---

## 4–5 Minute Demo Walkthrough Script

Follow these steps to experience the complete Triarc workflow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Dense Triage Table & Kanban                                              │
│    • Open http://localhost:5174/                                            │
│    • Use 'j'/'k' keys to move through the table, filter by component/status. │
│    • Toggle to Card view to inspect the Kanban workflow columns.            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Live Duplicate Radar                                                     │
│    • Press ⌘N (or click 'New Bug').                                         │
│    • Type "Crash on save when offline" in the title.                        │
│    • Watch the Duplicate Radar immediately highlight Bug #412 (>90% match). │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Per-Bug Flow Timeline & Stalled Segments                                 │
│    • Open Bug #412 ("Crash on save when offline").                          │
│    • Inspect the Flow Timeline: notice the glowing stalled segment:         │
│      "stalled 4d — waiting on review (flag review? → @alex)".               │
│    • Click the 'Audit Log' tab to view immutable field-level diffs.         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. Request & Approval Inbox                                                 │
│    • Switch user to @alex in the top navbar user switcher.                  │
│    • Open 'Request Inbox' — observe the pending review? flag for Bug #412.  │
│    • Click [+ Approve] — the flag resolves instantly without page reload.   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. Automated Git Webhook Lifecycle                                          │
│    • Open the 'Webhook Simulator' from the navbar.                          │
│    • Click [Push 'Fixes #412' Commit].                                      │
│    • Open Bug #412: observe it auto-transitioned to Resolved with an audit  │
│      record showing 'automated: true'.                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ 6. Cumulative Flow Diagram & Sleeper Signals                                │
│    • Click 'Flow Analytics' in the navbar.                                  │
│    • Inspect the CFD area chart reconstructed from the activity log.        │
│    • Check the 'Sleeper Branches' alert card for quiet git branches.        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API & Webhook Reference

### Core REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/bugs` | List bugs with filters (`query`, `status`, `component`, `priority`) |
| `GET` | `/api/bugs/:id` | Get bug detail with flow timeline, flags, git links, and activity log |
| `POST` | `/api/bugs` | File a new bug report |
| `PATCH` | `/api/bugs/:id/transition` | Execute a workflow transition with guard validation |
| `POST` | `/api/bugs/check-duplicates` | Semantic duplicate radar search |
| `GET` | `/api/inbox` | Get personal incoming and outgoing flag queue |
| `POST` | `/api/flags` | Request a new review/needinfo/approval flag |
| `PATCH` | `/api/flags/:id/resolve` | Grant (`+`) or deny (`-`) a requested flag |
| `GET` | `/api/analytics/flow` | Project CFD points, stage averages, and sleeper branches |
| `POST` | `/api/webhooks/github` | Inbound GitHub webhook endpoint (`X-Hub-Signature-256`) |
| `GET` | `/api/stream` | Server-Sent Events (SSE) real-time stream |
| `POST` | `/api/presence/heartbeat` | Broadcast active viewer presence on a bug |

---

## License

MIT © Triarc Contributors
