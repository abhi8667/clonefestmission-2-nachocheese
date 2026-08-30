# Triarc — Implementation Plan, Part 2
### GitHub Repo Import · Identity, Roles & Administration

> Extends `IMPLEMENTATION.md` (Part 1, blocks W1–W8). This doc adds **W9** and **W10** — two blocks that came out of auditing the repo after Part 1 was written.
> Verified against `clonefestmission-2-nachocheese/` on 2026-08-29 by reading the source, not the README.

---

## 1. Why Part 2 exists

Part 1 was written as *"finish what's built."* Two audits since then found things that change the picture:

**Finding A — the GitHub adapter is receive-only.** `services/github-adapter.ts` exports exactly three functions: `verifyGitHubSignature`, `parseBugIdsFromText`, `processGitHubEvent`. It has **no outbound calls to GitHub at all** and hardcodes `github.com/org/repo` placeholders into the URLs it stores. So the product's central claim — *"we hold both the bug data and the code data"* — is currently true only for events we simulate ourselves.

**Finding B — there is no authentication.** Audit results:

```
Login / Admin / Settings components        NONE EXIST
users table password column                NONE — no password_hash
POST /api/auth/login                        takes a username, returns a token. No password.
requireRole(...)                            defined in middleware, used in ZERO routes
AuthContext                                 a user *switcher* — fetches all users, picks one,
                                            stores the id in localStorage
auth middleware, no token supplied          returns the ADMIN user
```

Net effect: **anyone can be anyone, and by default everyone is an admin.** The five roles in the README are decoration. The row-level security work (`canUserViewBug`, `getSecurityFilterSQL`) is genuinely well-built — and never fires, because nothing establishes who you are.

W10 is therefore not a feature addition. It's the missing half of security work that's already done.

---

## 2. W9 — GitHub Repository Import (~5h)

**What it is:** paste a public repo URL, and Triarc pulls that repo's real issues, pull requests, reviews and timestamps, and materialises them as bugs with real activity history.

**Why it's worth the hours:** right now the flow thesis is demonstrated on 140 backdated seeded bugs, which Part 1 §W8.7 requires you to disclose. The unspoken judge question during the timeline demo is *"you invented this data."* Import a real repo and the timeline shows **actual triage delays, actual review latency, actual stalled PRs from a real engineering org.** The thesis stops being a claim and becomes a finding. That is a Criterion 2 and Criterion 5 win simultaneously — the two 20-mark blocks.

### 2.1 The technical crux: linkage is real, not guessed

GitHub natively tracks issue↔PR relationships, so flow can be *reconstructed* rather than inferred:

| GitHub source | Triarc destination |
|---|---|
| Issue (`state`, `title`, `body`, `created_at`, `closed_at`) | `bugs` row |
| Issue author / assignee | `users` (external, see §2.4) → `reporter_id` / `assignee_id` |
| Issue labels | `keywords` + `bug_keywords` — **this is W1.2 from Part 1, delivered free** |
| Issue opened / closed / reopened events | `activity` rows, backdated |
| Pull request | `git_links(kind='PR', state=open\|merged\|closed)` |
| `closingIssuesReferences` (GraphQL) | **the bug↔PR link** — the thing that makes the timeline real |
| PR `created_at` / `merged_at` | `activity` rows → the branch→PR→merged stages |
| Review submitted (`APPROVED` / `CHANGES_REQUESTED`) | `activity` + optionally a resolved `review?` flag |
| Commits referencing `#N` | `git_links(kind='COMMIT')` |
| Milestone | `milestones` — **W1.3 from Part 1, delivered free** |

**The critical design rule: import writes through the same code path as everything else.** There is no "imported bug" concept — an imported bug is just a bug, and its history is just `activity` rows. Do that, and the flow timeline, CFD, stalled detection, sleeper-branch detection and SLA logic all light up with zero new code, because every one of them reads only the activity log. That is the payoff for the zero-I/O engine design, and it's worth saying out loud in the demo.

`git_links` already has the right shape (`kind`, `ref`, `url`, `state`) — **no migration needed on the git side.**

### 2.2 API approach

Use **GraphQL for linkage, REST for bulk lists.** REST alone needs one timeline call per issue (~200 calls for 200 issues, which will shred your rate limit). A single GraphQL query pulls issues, their labels, their `closingIssuesReferences`, and the linked PRs' timestamps together, paginated.

- Auth: a Personal Access Token from env (`GITHUB_TOKEN`). **Never commit it.** Unauthenticated is 60 req/hr and you *will* exhaust it during rehearsal; a PAT gives 5,000/hr.
- Cap the import (e.g. most recent 150–200 issues). Full history is not needed and costs time.

### 2.3 Endpoints to add

```
POST   /api/import/github      { repoUrl, maxIssues? }  → starts import, returns jobId
GET    /api/import/:jobId      progress + summary (imported/skipped/errors)
GET    /api/import/history     previously imported repos
```

Stream progress over the **existing SSE channel** — no new transport, and it makes the import visibly live in the UI.

### 2.4 The W9↔W10 interaction (don't miss this)

Imported GitHub users must exist in `users` to be referenced as reporter/assignee. Once W10 adds real passwords, these accounts have none. Add `users.is_external BOOLEAN DEFAULT 0`:

- External users can be **referenced** (shown as reporter, assignee, PR author) but **cannot log in**.
- The login screen and admin user list filter them out or badge them clearly.

Handle this when you build W10's schema change, not after — retrofitting it is annoying.

### 2.5 Risk control — non-negotiable

1. **Import before the demo; demo off the database.** Data persists in SQLite. Never depend on a live API call during a scored demo.
2. **Commit a pre-imported DB snapshot as a fixture.** If the network dies, seed from it and nothing changes visually.
3. If you want a live import moment, use a **small** repo as a 20-second party trick, with the large pre-imported dataset already loaded.
4. **Scout the repo during the build.** You want visible dysfunction — long review stalls, reopened issues, abandoned branches. A well-run repo makes a boring demo. Shortlist two or three and keep the best.

### 2.6 Task list

| # | Task | Est. |
|---|---|---|
| W9.1 | `users.is_external` + `imported_repos(id, url, imported_at, issue_count)` | 20m |
| W9.2 | GraphQL client + repo-URL parser/validator | 1h |
| W9.3 | Mapper: GitHub payload → bugs / activity / git_links / keywords / milestones | 2h |
| W9.4 | Import route + SSE progress + idempotency (re-import must not duplicate) | 1h |
| W9.5 | Import UI: paste URL, live progress, summary | 45m |
| W9.6 | Fixture snapshot + repo scouting | 30m |

---

## 3. W10 — Identity, Roles & Administration (~8h)

Highest-value block remaining. It converts existing-but-dormant security work into demonstrable capability, and it directly serves the rubric's wording: *"structured, **collaborative** bug tracking across a **software development lifecycle**."* Collaboration across a lifecycle means different people doing different jobs — that's the workflow, not a UI preference.

### 3.1 Real authentication (~2h)

- Add `password_hash` to `users`; hash with `bcrypt` (cost 10+). Seed script sets known demo passwords.
- `POST /api/auth/login` verifies the password. Remove the username-only path.
- Login screen with proper form semantics and labels (feeds Part 1 W2.6).
- Token in memory or an `httpOnly` cookie — **not `localStorage`**, which is what the current switcher uses.
- **Keep a "Demo accounts" panel on the login screen**: one click to sign in as Alex (developer), Priya (triager), Sam (admin). This keeps the demo fast *and* turns role-switching into a visible, deliberate feature instead of a hidden dropdown.
- Remove or gate `TRIARC_DEMO_MODE` fallbacks from Part 1 W3.1/W3.2 — with real login they're no longer needed as a crutch.

### 3.2 Enforce RBAC (~1h)

`requireRole` is written. Apply it. Target matrix:

| Action | Allowed |
|---|---|
| File bug, comment, watch, request `needinfo?` | any authenticated user |
| Status transition | per workflow config `roles` — engine already validates; enforce at the route too |
| Confirm / set priority / bulk triage | `triager`, `admin` |
| Resolve a `review?` flag | requestee only (engine already enforces) |
| Manage components, versions, milestones, flag types | `admin` |
| Manage users & roles, edit workflow config | `admin` |
| View security-grouped bugs | group members, `security`, `admin` |

Defence in depth matters here: the engine validates transitions, but the route must too — otherwise a crafted request bypasses it.

### 3.3 Role-differentiated UI (~3h) — where the marks actually are

**Hide what a role can't do rather than disabling it.** The UI *is* the permission model made visible.

- **Reporter / contributor** — simple file-a-bug flow, "My reports," watched bugs. Never sees triage controls or bulk actions.
- **Developer** — assigned bugs, Request Inbox, flow timeline, git links, "my open PRs."
- **Triager** — the triage queue: unconfirmed bugs, bulk actions, duplicate resolution, priority setting. This is the screen Bugzilla makes most painful and where a modern rethink is most visible.
- **Admin** — everything, plus §3.4.

Route guards on the client, enforcement on the server. Client-side hiding is UX, not security.

### 3.4 Admin panel (~2h)

Moves three criteria at once — core functionality (C1), makes the configurable-workflow differentiator *visible* (C2), and proves the security model is real (C3).

- Products / components / versions / milestones CRUD
- Users & role assignment; security group membership
- Flag type management (`review?`, `needinfo?`, `approval` — who may request, who may grant)
- **Workflow viewer/editor** — even read-only-plus-JSON-edit is a large step up from "it's a file." The `WorkflowGraph` component already exists in `apps/web/src/components/Analytics/` — reuse it here to *show* the state machine.

### 3.5 The demo payoff

Part 1's demo step 6 currently means narrating *"this bug would be invisible to a non-member."* With real login you **log out, log in as someone else, and the bug is visibly gone** — from the list *and* from the duplicate radar. Same backend code, dramatically better evidence. Add this as an explicit demo beat.

---

## 4. Combined schedule (Part 1 + Part 2)

Reordered by marks-per-hour across both docs. Changes from Part 1 are marked.

| Order | Block | Time | Why here |
|---|---|---|---|
| 1 | **W2** Accessibility | ~4h | +6 marks, mechanical, rubric names it |
| 2 | **W3.1–W3.2** Auth holes | ~30m | Security fix; superseded by W10 but needed if W10 slips |
| 3 | **W4** Dedup claim reconciliation | ~40m | 40 min for ~3 marks; credibility fix |
| 4 | **W10** Identity, roles, admin | ~8h | ⬆ **promoted** — correctness fix + activates dormant work |
| 5 | **W9** GitHub import | ~5h | ⬆ **new** — makes the thesis literally true; also delivers W1.2 + W1.3 |
| 6 | **W8** Docs & demo | ~3h | Verified claims, clean-clone test, rehearsal |
| 7 | **W5** Surface existing analytics | ~2h | CFD / sleeper branches must be *seen* |
| 8 | **W3.3–W3.6** Rate limit, error boundary, security test, CI | ~2h | Reliability + cheap credibility |
| 9 | **W7** Performance evidence at scale | ~1.5h | Publish real numbers |
| 10 | **W1.1/W1.4/W1.5** Remaining capability gaps | ~3h | ⬇ **demoted** — W9 covers keywords + milestones |
| 11 | **W6** UX polish | ~2.5h | Empty states, skeletons, optimistic updates |

**Total ≈ 32h.**

That is a lot. Part 1 alone was ~21h; W9+W10 add ~13h while W9 removes ~2h of W1. **Do not plan to complete all of it.** Use §5.

---

## 5. Cut protocol

Cut from the bottom of the schedule. Each cut costs ~2 marks and nothing structural:

1. **W6** UX polish → ship current empty/loading states
2. **W1.1/W1.5** watchers, saved searches, notifications → **document as deliberately scoped out, with reasoning**
3. **W7** at-scale benchmark → keep the 140-bug number, don't overclaim
4. **W9** GitHub import → the webhook simulator still demos the auto-transition; disclose seeded data per W8.7

**Never cut, in priority order:**
1. **W2** — accessibility is 7 marks and explicitly named in the rubric
2. **W10.1 + W10.2** — without login and enforced RBAC, your own security claims are false, and that's worse than not making them
3. **W4** — 40 minutes, ~3 marks, and an unused `@xenova/transformers` in `package.json` discredits every other README claim
4. **W8.2 + W8.3** — verified claims and a clean-clone setup test; untested setup instructions fail in front of judges

**If you can only do one of W9/W10: do W10.** It's a correctness fix, it activates security work you've already paid for, and "collaborative" is in the rubric's own sentence. W9 is an enhancement to a feature that already demos.

---

## 6. What not to do

- **Don't build two-way GitHub sync, live polling, OAuth, or comment mirroring.** W9 is one-directional and one-shot. That boundary is what keeps it at 5 hours.
- **Don't demo against a live API call.** Import first, demo off the database, keep the fixture snapshot.
- **Don't wire real ML embeddings** (Part 1 W4 stands — the honest framing scores better and risks nothing).
- **Don't build the Blast Radius graph or rrweb capture.** Still out of scope; nothing has changed.
- **Don't add anything after the demo rehearsal.** Every post-rehearsal change is untested under demo conditions.
