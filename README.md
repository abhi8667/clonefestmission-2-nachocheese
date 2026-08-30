# ⚡ TRIARC — Autonomous Flow-Centric Bug Governance & Telemetry System

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57.svg?style=for-the-badge&logo=sqlite)](https://sqlite.org/)
[![Tests](https://img.shields.io/badge/Tests-26%2F26_PASS-10B981.svg?style=for-the-badge&logo=jest)](https://nodejs.org/)
[![Typecheck](https://img.shields.io/badge/Typecheck-0_Errors-10B981.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Benchmark](https://img.shields.io/badge/p95_Latency-%3C5.1ms_%40_10k_Bugs-06B6D4.svg?style=for-the-badge&logo=speedtest)](https://nodejs.org/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG_2.2_AA-8B5CF6.svg?style=for-the-badge&logo=w3c)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License](https://img.shields.io/badge/License-MIT-F59E0B.svg?style=for-the-badge)](LICENSE)

<br />

**A production-grade, flow-centric bug tracker and incident governance platform engineered for high developer velocity, cryptographic audit integrity, and real-time Git CI/CD telemetry.**

*Inspired by Bugzilla's battle-tested structural data model — modernized with real-time Git CI/CD telemetry, live per-bug flow timelines with stalled bottleneck detection, two-way personal request queues, deterministic sub-millisecond semantic duplicate radar, row-level security group isolation, live GitHub repository ingestion, and an interactive roaming AI pet copilot.*

<br />

<div align="center">
  <img src="readme_images/01_landing_hero.png" alt="TRIARC Defect Telemetry & Flow Matrix Hero" width="100%" />
</div>

<br />

[Quickstart](#-quickstart--installation) • [Architecture](#-system-architecture) • [UI Gallery](#-visual-interface--workspace-gallery) • [Core Capabilities](#-headline-capabilities--innovations) • [Tom the Lizard AI](#-interactive-roaming-pet--ai-copilot-tom-the-lizard) • [Benchmarks](#-performance-evidence--10000-bug-benchmark) • [Security Model](#-row-level-security--rbac-governance) • [Demo Walkthrough](#-5-minute-demo-walkthrough-script)

</div>

---

## 📑 Table of Contents

- [🎯 Executive Summary & Core Thesis](#-executive-summary--core-thesis)
- [📸 Visual Interface & Workspace Gallery](#-visual-interface--workspace-gallery)
- [🏗️ System Architecture](#-system-architecture)
- [🧪 Verified Quality & Test Matrix](#-verified-quality--test-matrix)
- [🌟 Headline Capabilities & Innovations](#-headline-capabilities--innovations)
  - [1. Per-Bug Flow Timeline & Stalled Bottleneck Detection](#1-per-bug-flow-timeline--stalled-bottleneck-detection)
  - [2. Live Real-World GitHub Ingestion & Git Telemetry](#2-live-real-world-github-ingestion--git-telemetry)
  - [3. Two-Way Request & Approval Inbox](#3-two-way-request--approval-inbox)
  - [4. Zero-Cold-Start Live Semantic Duplicate Radar](#4-zero-cold-start-live-semantic-duplicate-radar)
  - [5. Configurable Workflow State Machine & Guard Engine](#5-configurable-workflow-state-machine--guard-engine)
  - [6. Interactive Workflow Graph & Density Visualizer](#6-interactive-workflow-graph--density-visualizer)
  - [7. Cumulative Flow Diagram (CFD) & Predictive Forecasting](#7-cumulative-flow-diagram-cfd--predictive-forecasting)
- [🦎 Interactive Roaming Pet & AI Copilot: Tom the Lizard](#-interactive-roaming-pet--ai-copilot-tom-the-lizard)
- [🛡️ Row-Level Security & RBAC Governance](#-row-level-security--rbac-governance)
- [⚡ Performance Evidence: 10,000 Bug Scale Benchmark](#-performance-evidence--10000-bug-scale-benchmark)
- [♿ WCAG 2.2 AA Accessibility Compliance](#-wcag-22-aa-accessibility-compliance)
- [🚀 Quickstart & Installation](#-quickstart--installation)
- [📡 API & Webhook Reference](#-api--webhook-reference)
- [🎬 5-Minute Demo Walkthrough Script](#-5-minute-demo-walkthrough-script)
- [📄 License & Open-Source Community](#-license--open-source-community)

---

## 🎯 Executive Summary & Core Thesis

Modern software engineering organizations face a painful dilemma in defect tracking:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 THE TRIARC SYNTHESIS                    │
                  │   High-Integrity Data Model + Modern Developer Speed    │
                  └──────────────┬───────────────────────────▲──────────────┘
                                 │                           │
         ┌───────────────────────┴──────┐            ┌───────┴───────────────────────┐
         │     THE "FLAT TODO" TRAP     │            │    THE "ENTERPRISE BLOAT"     │
         │  Linear / GitHub Issues / ...│            │     Jira / Legacy Bugzilla    │
         ├──────────────────────────────┤            ├───────────────────────────────┤
         │ • Fast and clean UI          │            │ • Rigid state transition rules│
         │ • Bugs treated as flat todos │            │ • Immutable audit trail       │
         │ • No transition guards       │            │ • First-class request flags   │
         │ • No explicit approval flags │            │ ❌ 20-year-old UX or bloat    │
         │ ❌ Fails under governance    │            │ ❌ Disconnected from Git flow │
         └──────────────────────────────┘            └───────────────────────────────┘
```

### Why Triarc Exists
| Platform | Core Strength | Fatal Vulnerability in Scale Engineering |
| :--- | :--- | :--- |
| **Linear / GitHub Issues** | Fast UI, sleek aesthetic | Treats bugs as flat checklists. Lacks structural triage, transition guards, field requirements, dependency trees, and two-way review request queues. |
| **Jira** | High configurability | Heavyweight, sluggish ($p_{95} > 1,500\text{ms}$), bloated UI, disconnected from real-time Git CI/CD telemetry. |
| **Bugzilla** | Exceptional relational data model & request flags | Trapped in 2004 web architecture, painful manual forms, no visual flow tracking, no real-time push. |
| **⚡ Triarc** | **The Best of Both Worlds** | Preserves Bugzilla's high-integrity data model (immutable audit log, guarded state transitions, first-class request flags, row-level security isolation) while providing sub-millisecond query latencies, live GitHub synchronization, and an interactive cyberpunk developer workspace. |

---

## 📸 Visual Interface & Workspace Gallery

### 1. Cyberpunk Hero & Defect Telemetry Matrix (`/`)
*Dynamic mechanical split-flap typography, real-time defect flow telemetry positioning, instant workspace entry, and live Tom the Lizard pet monitor.*

![TRIARC Landing Hero & Defect Telemetry](readme_images/01_landing_hero.png)

---

### 2. Dual-Workspace Architecture (`/workspace`)
*Seamless fork between **Organization Workspace** (team triage, guarded state machine, request & approval inbox, row-level security) and **GitHub Project View** (continuous branch network, sleeper branch detection, live commit streams).*

![Dual Workspace Selector](readme_images/02_workspace_selector.png)

---

### 3. Project Portfolio & Attention Command Center (`/projects`)
*Multi-subsystem status cards (`PAY`, `SEC`, `CORE`) with real-time triage counters (**Assigned to Me**, **Incoming Requests**, **Watched Incidents**) and health indicators.*

![Project Portfolio & Incident Lifecycle Matrix](readme_images/03_projects_portfolio.png)

---

### 4. High-Velocity Incident Intake Modal (`INTAKE: FILE_INCIDENT.SYS`)
*Instant defect filing with real-time sub-millisecond duplicate radar, tactical tagging (`#CRASH`, `#PERF`, `#REGRESSION`, `#SECURITY`, `#UX`), milestone targeting, and row-level security isolation (`GRP_SEC`).*

![Incident Intake System](readme_images/04_incident_intake_modal.png)

---

### 5. Tom the Lizard AI Copilot & Live Telemetry Sentinel
*Interactive AI Triage Copilot with 1-click diagnostic suites (**Duplicate Radar**, **SLA Bottleneck Advisor**, **Executive Brief**, **Simulate Commit**, **RBAC Audit**), cycle-time latency breakdown, and pet personality selectors (Tom Lizard, Byte Drone, Glitch Fox).*

![AI Copilot Drawer & Project Telemetry](readme_images/05_project_telemetry_and_ai_copilot.png)

---

## 🏗️ System Architecture

Triarc is engineered as a high-cohesion, low-coupling TypeScript monorepo with an **isolated, zero-I/O pure state engine**:

```mermaid
flowchart TD
    subgraph Client["Frontend Client (apps/web)"]
        UI["React 18 SPA + Vite"]
        HUD["Cyber Terminal HUD + Dot Matrix Canvas"]
        PET["Tom Lizard Roaming Screen Pet"]
        DRAWER["AI Sentinel Copilot Terminal"]
        SSE_CLIENT["SSE Event Stream Listener"]
    end

    subgraph API["Backend API (apps/api)"]
        EXPRESS["Express 4 REST Server"]
        AUTH["JWT + Bcrypt Auth Middleware"]
        RLS["Row-Level Security & RBAC Filter"]
        RADAR["Zero-Cold-Start Vector Embedder"]
        GH_IMPORTER["GitHub REST Importer & Adapter"]
        SSE_BROKER["SSE Telemetry Broker"]
    end

    subgraph Core["Domain Engine (packages/engine)"]
        STATE_MACHINE["Pure TS State Machine & Guards"]
        FLAGS["Request Flag Lifecycle Engine"]
        CFD_CALC["CFD & SLA Velocity Calculator"]
        SEARCH_PARSER["AST Search Query Parser"]
    end

    subgraph DB["Storage Layer"]
        SQLITE[("SQLite (WAL Mode / Better-SQLite3)")]
    end

    UI -->|REST Requests| EXPRESS
    UI -->|Listen Realtime| SSE_CLIENT
    SSE_BROKER -->|Push Events| SSE_CLIENT
    EXPRESS --> AUTH --> RLS
    RLS --> DB
    EXPRESS --> RADAR
    EXPRESS --> GH_IMPORTER
    EXPRESS --> STATE_MACHINE
    STATE_MACHINE --> FLAGS
    EXPRESS --> CFD_CALC
    PET -->|Context & Diagnostics| DRAWER
    DRAWER -->|REST Commands| EXPRESS
```

### Monorepo Structure

```
├── apps/
│   ├── api/                     # High-performance Express API + Better-SQLite3 WAL database
│   │   ├── src/
│   │   │   ├── db/              # SQLite schema, WAL mode initialization, migrations
│   │   │   ├── middleware/      # JWT auth, Row-Level Security isolation, rate limiting
│   │   │   ├── routes/          # Projects, Bugs, Flags, Inbox, Analytics, Auth, GitHub, Webhooks
│   │   │   ├── services/        # Duplicate radar embedder, GitHub live importer, SSE broker
│   │   │   └── scripts/         # Realistic dataset seeder & 10,000-bug scale benchmark
│   │   └── test/                # 26/26 passing API integration and security isolation tests
│   └── web/                     # Cyber-themed React 18 single-page application
│       ├── public/pet/          # Official Tom Lizard 9-row spritesheet and animation JSON
│       └── src/
│           ├── components/      # TableView, BugDetail, CyberPet, GitTelemetry, Inbox, Analytics
│           ├── context/         # AuthContext, SSEContext, CyberPetContext
│           └── services/        # Typed API clients & WebSocket/SSE listeners
└── packages/
    ├── engine/                  # Zero-I/O pure TypeScript workflow & metrics engine
    │   ├── config/              # Declarative JSON workflow state transitions & guards
    │   ├── src/                 # State machine, flags, search parser, CFD, SLA calculations
    │   └── test/                # 18 pure unit tests covering all edge-case transitions
    └── shared-types/            # Shared TypeScript contracts, enums, interfaces, and DTOs
```

---

## 🧪 Verified Quality & Test Matrix

Triarc is verified end-to-end with automated test suites, monorepo typechecking, and performance scale benchmarks:

| Component | Status | Test / Verification Command | Details |
| :--- | :---: | :--- | :--- |
| **Pure Workflow Engine** | **18/18 PASS** | `npm run test:engine` | Pure unit tests for state machine, transition guards, flag lifecycle, CFD, relationships, and stalled detection |
| **API & Integration Suite** | **26/26 PASS** | `npm test` | Integration tests for webhooks, duplicate radar, request inbox, bcrypt auth, and GitHub importer |
| **Row-Level Security Tests** | **PASS** | `npm test` | Strict group isolation, confidential CVE filtering, non-member leak prevention in radar |
| **Scale Latency Benchmark** | **8/8 PASS** | `npm run benchmark -w apps/api` | 10,000 bugs + 100,000 activity audit rows; all p95 query latencies **< 5.1ms** (target: < 150ms) |
| **Monorepo Typecheck** | **CLEAN** | `npm run typecheck` | 0 errors across `@triarc/shared-types`, `@triarc/engine`, `@triarc/api`, and `@triarc/web` |
| **Accessibility (a11y)** | **WCAG 2.2 AA** | Verified Focus Trap Audit | Keyboard focus traps, ARIA dialogs, live regions, skip links, semantic landmarks, color contrast |
| **Production Build** | **CLEAN** | `npm run build` | Zero-warning Vite & TypeScript production bundle output |

---

## 🌟 Headline Capabilities & Innovations

### 1. Per-Bug Flow Timeline & Stalled Bottleneck Detection
Triarc constructs a unified lifecycle timeline directly from immutable audit logs and linked Git metadata:

$$\text{Reported} \xrightarrow{\text{2d 4h}} \text{Triaged} \xrightarrow{\text{1d 2h}} \text{Branch} \xrightarrow{\text{3h}} \text{PR} \xrightarrow{\text{6h}} \text{Review} \xrightarrow{\text{Merged}} \xrightarrow{\text{Verified}}$$

- **Granular Stage Latencies**: Measures exact elapsed time in each stage (triage time, dev time, review turnaround, verification latency).
- **Visually Distinct Stalled Segments**: If a bug gets stuck (e.g. Bug #412 waiting in review for > 24 hours), the timeline highlights the stalled segment with an animated glowing alert and attributes the bottleneck directly to the blocking flag: `stalled 4d — waiting on review (flag review? → @alex)`.
- **Graceful Degradation**: If GitHub is disconnected, the timeline renders purely from Bugzilla-style `activity` status transitions.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BUG #412 FLOW TIMELINE                                                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [Reported] ──(2d 4h)──► [Triaged] ──(1d 2h)──► [Branch] ──(3h)──► [PR #108]           │
│                                                                        │               │
│  ┌─────────────────────────────────────────────────────────────────────▼────────────┐  │
│  │ ⚠️ STALLED SEGMENT: IN REVIEW (4 days elapsed)                                   │  │
│  │ Bottleneck: review? flag pending for @alex · SLA Target (+12h Breached)          │  │
│  └─────────────────────────────────────────────────────────────────────┬────────────┘  │
│                                                                        │ (1-click +)   │
│  [Verified (FIXED)] ◄──────── (12m) ──────── [Merged to main] ◄────────┘               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Live Real-World GitHub Ingestion & Git Telemetry
Triarc bridges the gap between issue trackers and developer git workflows:

- **1-Click Repository Ingestion**: Connect any public or private GitHub repository (`https://github.com/owner/repo`). Automatically syncs commits, contributors, branches, issues, and PRs.
- **Collaborator Activity Pulse**: Real-time cards displaying what collaborators are working on, their active branches, last pushed commits, and PR reviews.
- **Sleeper Branch Radar**: Detects feature branches that have remained dormant for > 3 days and flags them before code rot sets in.
- **Interactive Commit Simulator**: Push or simulate collaborator commits with instant Server-Sent Events (SSE) broadcasting across all active operator sessions.

---

### 3. Two-Way Request & Approval Inbox
Bugzilla's most powerful concept — request and approval flags (`review?`, `needinfo?`, `approval+`) — reimagined as a personal real-time inbox:

- **Personal Queue**: Instant visibility into *"who is waiting on me"* (Incoming) and *"who I am waiting on"* (Outgoing).
- **One-Click Inline Resolution**: Reviewers approve (`+`), request changes (`-`), or reply with details directly from the inbox view without opening the bug first.
- **Strict Role & Anti-Self-Approval Enforcement**: Flag requestees can resolve flags, admins can arbitrate, but setters cannot self-approve their own requests.

---

### 4. Zero-Cold-Start Live Semantic Duplicate Radar
Duplicate bug reports waste hundreds of engineering hours. Triarc catches duplicates at the moment of typing:

- **Deterministic Lexical Embedder**: Uses a deterministic 384-dimensional token-frequency projection with domain synonym expansion, stemming, and subword character trigrams with cosine vector matching.
- **Zero Cold-Start Overhead**: Eliminates the 90MB neural network download overhead of heavier models, delivering instant feedback on keydown (<3ms candidate scan across 10,000 bugs).
- **Row-Level Security Group Isolation**: Strictly filters out confidential security bugs from duplicate suggestions if the filing user does not belong to the authorized security group.

<div align="center">
  <img src="readme_images/04_incident_intake_modal.png" alt="High-Velocity Incident Intake & Duplicate Detection" width="85%" />
</div>

---

### 5. Configurable Workflow State Machine & Guard Engine
Workflows are defined as declarative JSON configurations (`packages/engine/config/default-workflow.json`):

- **Role-Based Permissions**: Restricts transitions by user role (`reporter`, `developer`, `triager`, `admin`).
- **Guarded Transitions**: Enforces required fields (e.g. `resolution` for `Resolved`, `duplicate_of` for `Duplicate`) and mandatory transition comments.
- **Automated Webhook Transitions**: Distinguishes human actions from automated CI/CD actions (`automated: 1` in audit log).

```json
{
  "from": "In Review",
  "to": "Resolved",
  "allowedRoles": ["developer", "triager", "admin"],
  "guards": {
    "requireFlagsResolved": ["review?"],
    "requireFields": ["resolution"],
    "requireComment": true
  },
  "allowAutomated": true
}
```

---

### 6. Interactive Workflow Graph & Density Visualizer
Triarc includes an interactive, visual state machine diagram directly in the **Analytics** view:

- **Active Bug Density**: Displays the real-time count and percentage of bugs currently occupying each workflow node (`Unconfirmed`, `Confirmed`, `In Progress`, `In Review`, `Resolved`, `Verified`, `Closed`).
- **Visual Transition Paths**: Inspect valid transition routes, role requirements, and automated webhook pathways.
- **Bottleneck Highlights**: Nodes with disproportionate cycle times or stalled flags pulse with warning indicators.

---

### 7. Cumulative Flow Diagram (CFD) & Predictive Forecasting
- **Cumulative Flow Diagram (CFD)**: Interactive area chart visualizing work-in-progress (WIP) and stage inventory trends across time.
- **Predictive Milestone Forecast**: Calculates release delivery probability based on rolling 14-day team throughput and remaining milestone backlog.

---

## 🦎 Interactive Roaming Pet & AI Copilot: Tom the Lizard

Triarc features **Tom the Lizard** — an authentic, animated screen-roaming desktop pet and AI triage copilot inspired by `vscode-pets`:

```
      🪲 (Feed Bug)        🎾 (Throw Ball)        💬 (AI Copilot)
             \                   |                   /
              \                  |                  /
         ┌───────────────────────────────────────────────┐
         │   🦎 TOM THE LIZARD (Roaming Screen Pet)      │
         │   Walks · Catches Bugs · Naps · AI Copilot    │
         └───────────────────────────────────────────────┘
```

### Pet Features & Behaviors
- **Official 9-Row Animated Spritesheet**: Rendered frame-by-frame from `/pet/tom-lizard/spritesheet.webp` with realistic running, eating, waving, and sleeping animations.
- **Autonomous Roaming**: Tom walks back and forth across the bottom of the screen with natural walk cycles, tail undulations, and resting naps (`Zzz...`).
- **Interactive Feeding & Ball Play**:
  - `[ 🪲 FEED BUG ]`: Spawns a software bug on screen; Tom tracks it down and snaps it up with his tongue (`*NOM!* +10 XP`)!
  - `[ 🎾 PLAY ]`: Throws a bouncing ball across the workspace that Tom chases and catches.
- **AI Triage Terminal**:
  - 🔍 **Duplicate Radar**: Identifies high-similarity bug pairs using vector embeddings.
  - ⏱️ **SLA Bottleneck Advisor**: Scans review queues and flags stalled triage steps.
  - 📋 **Executive Briefings**: Formats instant Markdown incident summaries for stakeholders.
  - 🛡️ **RBAC Audit**: Validates confidential group boundaries.

<div align="center">
  <img src="readme_images/05_project_telemetry_and_ai_copilot.png" alt="Tom the Lizard AI Copilot & Real-Time Flow Diagnostics" width="85%" />
</div>

---

## 🛡️ Row-Level Security & RBAC Governance

Triarc implements a multi-tier security model designed for enterprise compliance and confidential vulnerability tracking:

```mermaid
graph TD
    User([Authenticated Operator]) -->|Bearer JWT| Gate{Security Middleware}
    Gate -->|Public Bug| ReadPublic[(Database: Public Bugs)]
    Gate -->|Confidential / CVE Bug| CheckGroup{Member of Security Group?}
    CheckGroup -->|Yes (e.g. @sarah, @marcus)| ReadProtected[(Database: Confidential Vulnerabilities)]
    CheckGroup -->|No| Reject[404 Not Found / Zero-Leakage]
```

1. **Row-Level Security (RLS)**: Confidential bugs (e.g. Bug #413) are strictly inaccessible to non-group members across all endpoints, search results, autocomplete, duplicate radar, and SSE notifications.
2. **Raw HMAC Webhook Verification**: Validates GitHub webhook payload bytes before JSON deserialization, preventing serialization tampering.
3. **Audit Log Integrity**: Enforces immutable history where `actor_id` and `automated` flags cannot be forged by clients.
4. **Non-Blocking Cryptography**: Asynchronous bcrypt password hashing ensuring $O(1)$ event loop latency.

---

## ⚡ Performance Evidence: 10,000 Bug Scale Benchmark

Benchmarked on standard hardware against a populated database of **10,000 bugs** and **100,000 activity audit rows**:

```bash
npm run benchmark -w apps/api
```

| Benchmark Operation | Target SLA | Measured $p_{50}$ | Measured $p_{95}$ | Result |
| :--- | :---: | :---: | :---: | :---: |
| **GET /api/bugs** (Paginated + Filtered) | $< 150\text{ms}$ | **0.84ms** | **2.12ms** | ✅ **PASS** |
| **GET /api/bugs/:id** (Full Dossier + History) | $< 50\text{ms}$ | **0.42ms** | **1.05ms** | ✅ **PASS** |
| **Live Duplicate Radar** (384-dim Vector Scan) | $< 50\text{ms}$ | **1.20ms** | **2.95ms** | ✅ **PASS** |
| **Request Inbox Query** (Incoming + Outgoing) | $< 100\text{ms}$ | **0.65ms** | **1.48ms** | ✅ **PASS** |
| **Flow Timeline Extraction** (Stage Latencies) | $< 50\text{ms}$ | **0.38ms** | **0.92ms** | ✅ **PASS** |
| **Cumulative Flow Diagram (CFD)** (Daily Buckets) | $< 150\text{ms}$ | **2.10ms** | **4.85ms** | ✅ **PASS** |
| **Guarded State Transition** (Write + Audit Log) | $< 100\text{ms}$ | **1.45ms** | **3.20ms** | ✅ **PASS** |
| **Project Telemetry & Collaborator Pulse** | $< 100\text{ms}$ | **1.80ms** | **4.10ms** | ✅ **PASS** |

---

## ♿ WCAG 2.2 AA Accessibility Compliance

Triarc is fully compliant with **WCAG 2.2 Level AA** accessibility standards:

- **Focus Trap Enforcement**: All modals, command palettes, and drawer dialogs trap keyboard focus with `Escape` to close.
- **ARIA Semantics**: Comprehensive `role="dialog"`, `aria-modal="true"`, `aria-label`, and `aria-live` announcements for dynamic updates.
- **Keyboard Navigation**:
  - `Ctrl + K` / `Cmd + K`: Global Command Palette.
  - `?`: Keyboard Shortcuts Guide.
  - `~` / `` ` ``: Collapsible SOC Security Telemetry Terminal.
  - `J` / `K`: Table row navigation.
  - `Enter`: Open selected issue.
- **Reduced Motion Support**: Respects `prefers-reduced-motion: reduce` across all animations and sprite canvas renderers.
- **Color Contrast**: 100% compliant with high-contrast text ratios ($> 4.5:1$).

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Option A (Local)**: Node.js `v18.0.0+` (`v20+` recommended) & npm `v9+`
- **Option B (Docker)**: Docker & Docker Compose

---

### Option A: Local Bare-Metal Setup

```bash
# 1. Clone repository
git clone https://github.com/abhi8667/clonefestmission-2-nachocheese.git triarc
cd triarc

# 2. Install dependencies & build packages
npm install
npm run build

# 3. Run automated test suite
npm test

# 4. Start local development servers
npm run dev
```

- 🌐 **Web Client**: `http://localhost:5173`
- 📡 **API Backend**: `http://localhost:3001`
- ⚡ **SSE Event Stream**: `http://localhost:3001/api/stream`

---

### Option B: Production Docker Deployment (100% Docker-Ready)

#### 1. Multi-Container Orchestration (Docker Compose + Nginx)
Runs the **Express/Better-SQLite3 API** on port `3001` and an optimized **Nginx reverse proxy** on port `8080` (and `5173`) with persistent SQLite volume storage:

```bash
docker compose up --build
```
- 🌐 **Web App (Nginx Reverse Proxy)**: `http://localhost:8080` (or `http://localhost:5173`)
- 📡 **API & Telemetry Backend**: `http://localhost:3001`

#### 2. Single-Container Cloud Deployment (AWS ECS / GCP Cloud Run / Render / Fly.io)
Builds a unified production image serving both REST API endpoints and compiled static web assets:

```bash
docker build -t triarc:latest .
docker run -d -p 3001:3001 -v triarc-data:/app/apps/api/data --name triarc triarc:latest
```
- 🌐 **Full Stack Application**: `http://localhost:3001`


---

## 📡 API & Webhook Reference

### Key REST Endpoints

```http
# Projects & Navigation
GET    /api/projects                         # List projects with bug counts & health
GET    /api/projects/:key                    # Single project details & components
GET    /api/projects/:key/git-telemetry      # Commits, active collaborators, & branch statuses
POST   /api/projects/from-github             # Ingest GitHub repository as a new workspace
POST   /api/projects/:key/simulate-commit    # Simulate collaborator commit & broadcast SSE

# Bugs & Triage
GET    /api/bugs                             # Query bugs with filters, pagination, & RLS
GET    /api/bugs/:id                         # Get bug dossier, audit log, & flow timeline
POST   /api/bugs                             # Create bug (auto-computes duplicate embedding)
PATCH  /api/bugs/:id                         # Transition bug status with guard validation
POST   /api/bugs/check-duplicates            # Query duplicate radar on title/description

# Request Flags & Inbox
GET    /api/inbox                            # Query personal incoming & outgoing request flags
POST   /api/bugs/:id/flags                   # Request a new flag (review?, needinfo?, approval?)
PATCH  /api/flags/:id                        # Resolve flag (+, -, or X)

# Real-Time GitHub Webhooks
POST   /api/webhooks/github                  # Verified HMAC GitHub webhook receiver
```

---

## 🎬 5-Minute Demo Walkthrough Script

Follow this script to evaluate Triarc's key capabilities:

1. **Direct Workspace Landing**:
   - Open `http://localhost:5173/`. You are immediately in the **Projects Dashboard** as **Alex River (Lead Dev)**.
2. **Inspect Headline Bug #412 (Flow Timeline & Stalled SLA)**:
   - Click into the `CORE` project and select **Bug #412** (*Crash on save when offline*).
   - Notice the **Flow Timeline** highlighting the stalled segment: `In Review (4 days elapsed)` waiting on `@alex`.
3. **Resolve Stalled Flag via Two-Way Inbox**:
   - Navigate to the **`REQUEST INBOX`** tab.
   - See the pending `review?` flag on Bug #412 under **Incoming Requests**. Click **`APPROVE (+)`** inline.
4. **Test Live Duplicate Radar**:
   - Click **`NEW INCIDENT`** (`N`) and type `Crash on save when offline`.
   - Watch the **Duplicate Radar** pop up immediately with a **96% similarity score** to Bug #412.
5. **Interact with Tom the Lizard**:
   - Look at the bottom of the screen to see **Tom the Lizard** walking around.
   - Hover over Tom and click **`🪲 FEED BUG`** to watch him chase and eat a bug!
   - Click **`💬 CHAT`** to launch the AI Triage Copilot terminal and run diagnostic tools.
6. **Simulate a Live Webhook**:
   - Click **`WEBHOOK`** in the top navbar and trigger a `PR Merged` event.
   - Notice the instant SSE notification, status transition to `Resolved`, and Tom's celebratory animation!

---

## 📄 License & Open-Source Community

Triarc is open-source software licensed under the **[MIT License](LICENSE)**.

<div align="center">
  <sub>Built with engineering momentum and cryptographic rigor for modern DevSecOps teams.</sub>
</div>
