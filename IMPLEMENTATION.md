# Triarc — Implementation Plan Targeting Full Marks

> Companion to `README.md` (product/architecture reference). This is the **work order**: what to build, in what order, and which marks each item buys.
> Written against `clonefestmission-2-nachocheese/` as **verified on 2026-08-29** — tests run, typecheck run, schema and components read. Not against what the README claims.

**On the target:** a literal 100/100 means no examiner finds a single deduction on any axis. That's rarely awarded and isn't fully in your control — two judges can read "innovation" differently. What *is* in your control is leaving no *findable* gap. This plan is built backwards from "what would a hostile examiner deduct for," and closes every one of those. Realistic landing zone: **95–100**, with the last few marks depending on how the room reads the thesis.

---

## 1. Verified current state

I ran these — not assumed:

| Check | Result |
|---|---|
| `npm run test:engine` | **15/15 pass**, 5 suites |
| `npm run test -w apps/api` | **4/4 pass** (list latency <150ms @140 bugs, dedup scoring, webhook auto-transition, inbox) |
| `npm run typecheck` | **Clean, all 4 workspaces**, zero errors |
| Volume | web 5,179 LOC · api 2,841 LOC · engine ~1,464 LOC |
| Schema | 14 tables |
| Engine API | 14 exported functions, ~11 directly covered by tests |

**Honest current score: ~74/100.** Architecture, engine design, and the flow thesis are genuinely strong. Everything below is *finishing* — plus one functional gap that's bigger than it looks.

| # | Criterion | Marks | Now | Gap |
|---|---|---|---|---|
| 1 | Problem Understanding & Core Functionality | 20 | ~17 | **3** |
| 2 | Innovation & Differentiation | 20 | ~16 | **4** |
| 3 | Technical Implementation & Architecture | 15 | ~12 | **3** |
| 4 | User Experience & Accessibility | 15 | ~8 | **7** |
| 5 | Performance & Reliability / Demo | 20 | ~14 | **6** |
| 6 | Documentation & Explanation | 10 | ~7 | **3** |

---

## 2. The finding that changes the plan

`README.md` §3 publishes a capability checklist and states *"nothing on this list gets silently dropped."* I checked the schema and shared types against it:

```
watcher / cc_list    MISSING      keyword            MISSING
whiteboard           MISSING      milestone          MISSING
version              MISSING      estimated_time     MISSING
work_time            MISSING      saved_search       MISSING
notification         MISSING      comment            found
attachment           found
```

**Ten of twelve are absent.** This is the single largest threat to Criterion 1 (20 marks) — not because every tracker needs a whiteboard field, but because *the submission's own documentation promises them*. An examiner comparing README §3 to the schema finds ten unmet claims. That's worse than never having listed them.

It also touches Criterion 6: a doc that overpromises is a documentation defect, not just a functionality one.

**Two valid resolutions.** Do both, split by value:

- **Build the ones that carry real workflow weight** (W1 below): watchers/CC, keywords, saved searches, time tracking, milestones/versions. These are genuinely part of "structured bug tracking across a software development lifecycle" — the rubric's own words.
- **Consciously scope out the rest, in writing**: whiteboard is a legacy free-text field superseded by keywords + comments. Say that explicitly in the README with the reasoning. A documented, justified omission scores as judgment; a silent one scores as a gap.

---

## 3. Work blocks

Ordered by marks-per-hour. W1–W4 are non-negotiable for a 95+; W5–W8 are what close the last stretch.

---

### W1 — Close the capability gap (Criterion 1: +3, Criterion 6: +1) · ~5h

Schema, API, and minimal UI for each. None of these are hard; they're breadth.

**W1.1 Watchers / CC** (~1h) — `watchers(bug_id, user_id, created_at)`. `POST/DELETE /api/bugs/:id/watch`. A "Watch" toggle on bug detail; watched bugs get a filter chip in the list. Feeds notifications (W1.5).

**W1.2 Keywords + labels** (~1h) — `keywords(id, name, description)` + `bug_keywords(bug_id, keyword_id)`. Multi-select on the bug form, chips on detail, `keyword:regression` in the query parser (the parser already exists in `engine/query.ts` — extend, don't rebuild).

**W1.3 Milestones & versions** (~1h) — `versions(id, product_id, name)`, `milestones(id, product_id, name, due_date)`; `bugs.version`, `bugs.target_milestone`. This matters more than it looks: **a milestone due-date is what makes the flow analytics predictive** rather than merely descriptive — "at current throughput, 6 of 14 bugs targeting v2.1 will miss the date." That's a Criterion 2 asset, not just checklist compliance.

**W1.4 Time tracking** (~1h) — `bugs.estimated_time`, `bugs.remaining_time`, `comments.work_time`. Bugzilla had this and almost no modern tracker does it well. Log work when commenting; show estimate-vs-actual on the timeline. **Pairs directly with the flow thesis** — you already measure elapsed wall-clock time per stage; adding *worked* time lets you show the gap between "in progress for 6 days" and "actually worked on for 3 hours," which is exactly the bottleneck insight the product is about.

**W1.5 Saved searches + notifications** (~1h) — `saved_searches(id, user_id, name, query)`; reuse the existing query parser. `notifications(id, user_id, bug_id, type, read, created_at)`, written on watched-bug activity, surfaced in the existing navbar. The SSE channel already exists — push them down it.

> **Judgment call:** if time is short, W1.3 and W1.4 are the two that buy Criterion 2 marks as well as Criterion 1. Do those first, then W1.1/W1.2, then W1.5.

---

### W2 — Accessibility to WCAG 2.2 AA (Criterion 4: +6) · ~4h

Measured baseline across 5,179 LOC: **4** `aria-*` attributes, **1** `role`, **0** `role="dialog"`, **0** focus traps, **5** keyboard-inaccessible `<div onClick>`. The foundation is better than that sounds — 63 real `<button>`s, 46 focus styles, 40 responsive breakpoints — so this is adding announced structure, not rebuilding.

**W2.1 Modals** (~1h) — `BugDetailModal`, `NewBugModal`, `WebhookSimulatorModal`: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → heading id, focus trap, focus restore on close, Escape to close. Write **one** `useFocusTrap` hook; reuse it. (`CommandPalette` and `KeyboardShortcutsModal` already handle Escape — bring them onto the same hook.)

**W2.2 Landmarks + skip link** (~20m) — `<nav>`, `<main>`, exactly one `<h1>` per view, "Skip to main content" as first focusable element.

**W2.3 Live regions** (~30m) — toasts into `aria-live="polite"` (`assertive` for errors only). **The duplicate-radar results panel must be a live region** — results appearing mid-typing are invisible to a screen reader otherwise, and that's your headline feature silently failing for those users.

**W2.4 Clickable divs** (~20m) — `grep -rn '<div[^>]*onClick' apps/web/src` → 5 hits. Convert to `<button>`.

**W2.5 Table semantics** (~40m) — real `<table>/<thead>/<th scope="col">`, `aria-sort` on sortable columns, keyboard path to open a row (make the title a real link/button).

**W2.6 Forms** (~30m) — `<label htmlFor>` on every input (`.sr-only` where the design has no visible label), errors wired via `aria-describedby` and announced.

**W2.7 Verify and cite** (~40m) — run `accesslint:accessibility-scan` against the running app, fix findings, then **state the result and date in the README**. Also do one full mouse-unplugged pass of the demo path. A verified a11y claim is worth several times a promised one.

---

### W3 — Security & reliability (Criteria 3 & 5: +4) · ~2.5h

**W3.1 Auth default** (~20m) — `middleware/auth.ts:47`: no token currently returns the **admin** user. This silently defeats the entire RBAC + security-group model the README sells as a differentiator. Gate behind `TRIARC_DEMO_MODE`, default off, loud `console.warn` at boot when on, `.env` sets it for local demo.

**W3.2 Impersonation header** (~10m) — `auth.ts:38`, `x-user-id` lets any request become any user. Same gate. It's genuinely useful for demoing the inbox from two accounts — just make it explicit rather than ambient.

**W3.3 Rate limiting** (~15m) — README §10 claims `express-rate-limit`; grep finds zero usage. Add it (the CipherDrop pattern already works) — faster than defending the absence.

**W3.4 Error boundary + API error contract** (~45m) — **zero** React error boundaries today, so one thrown render error blanks the app *during the demo*. Add a top-level boundary with a recoverable fallback, plus per-route boundaries around the timeline and analytics views (the two most data-dependent). Standardise API errors on one shape `{ error, code, details? }`.

**W3.5 Security test** (~30m) — assert a non-member cannot see a security-grouped bug via `GET /api/bugs` **and via the duplicate radar**. The dedup path is the non-obvious leak; demonstrating you thought of it is worth more than the test.

**W3.6 CI** (~20m) — no `.github/workflows` today. One workflow running `typecheck` + `test` on push. **A green CI badge in the README is the single cheapest credibility signal available** for Criterion 3.

---

### W4 — Reconcile the duplicate-radar claim (Criteria 2 & 6: +3) · ~40m

README claims ONNX `all-MiniLM-L6-v2`. `@xenova/transformers` is in `package.json` and **imported nowhere**. The real implementation (`services/duplicate-radar.ts:34`) is a synonym-expansion + token-hashing vectorizer.

The implementation is defensible on its own terms — deterministic, no model download, sub-10ms, domain-tuned with a real engineering-vocabulary synonym table. The *docs* are the defect. An examiner who greps for `xenova`, finds it unused, and then discounts every other README claim costs you far more than this feature earns.

**Do this:** rewrite the section to describe what it is — *"a domain-tuned lexical similarity engine: synonym-cluster expansion over a 384-dim hashed token space; deterministic, zero-inference, no model download, sub-10ms"* — and state **why**: a real embedding model is a ~90MB download with non-deterministic cold-start, a bad trade for live-demo reliability. Remove the unused dependency.

**Do not** wire up real embeddings to chase the label. It costs 2–3h, adds a cold-start failure mode on demo day, and scores *worse* than the honest engineering-tradeoff framing.

---

### W5 — Surface the analytics that already exist (Criterion 2: +2) · ~2h

`packages/engine` exports `computeCumulativeFlow`, `detectSleeperBranches`, and `computeSlaStatus` — the CFD, the stalled-branch signal, and SLA breach detection. **Verify each is actually rendered in the UI, not just implemented and tested.** Innovation only scores if a judge sees it.

Specifically make sure the demo can show: the project CFD with a visibly widening band, the "branch started in git then went quiet" list, and an SLA breach badge. These are your Criterion 2 differentiators and they're already built — this is wiring and polish, not new work.

Add tests for any of the 14 engine exports not currently covered (`computeCumulativeFlow`, `detectSleeperBranches`, `getAvailableTransitions` look thin) — cheap, and it makes "fully unit-tested engine" literally true.

---

### W6 — UX polish (Criterion 4: +1, Criterion 5: +1) · ~2.5h

Only **2** empty-state references and **13** loading references across the whole app. Gaps here read as unfinished.

- **Empty states** for every list: bug list (filtered to nothing), inbox (both tabs), relationships, activity, analytics with insufficient data. Each gets an icon, a sentence, and an action.
- **Loading skeletons** on bug list, detail, timeline, analytics — not spinners; skeletons that match final layout, so nothing jumps.
- **Optimistic updates** on status transition and flag resolve (TanStack Query is already in the stack) — makes the app feel instant, directly serves "Performance" as *perceived*.
- **Responsive pass** — 40 breakpoints exist; verify the table view degrades sensibly on a narrow viewport. Judges sometimes open things on a laptop at odd zoom.

---

### W7 — Performance evidence (Criterion 5: +2) · ~1.5h

You have one latency test at 140 bugs. Make the claim unassailable:

- **Seed 10k bugs and 100k activity rows**, then re-run list/detail/timeline/CFD timings. Publish the numbers in the README as a small table. The README already targets `<150ms` — prove it at a scale that sounds real.
- **Verify the indexes named in README §9 actually exist** in `schema.ts` (`activity(bug_id, created_at)`, `bugs(status, component_id)`, `flags(requestee_id, status)`), and run `EXPLAIN QUERY PLAN` on the timeline and inbox queries to confirm they're index seeks, not scans. Paste one plan into the README — it's concrete evidence almost nobody else will have.
- Keep the honest note that SQLite write-serialisation is the ceiling and Postgres is the migration path. Naming your own limit reads as maturity.

---

### W8 — Documentation & demo (Criterion 6: +3, Criterion 5: +2) · ~3h

**W8.1 Delete `README_2.md`** — a verbatim duplicate of the team reference sitting next to the real README. Two READMEs in a root reads as unfinished. Keep the reference doc outside the submission repo.

**W8.2 "Verified" section in README** — every line re-runnable:
```md
## Verified
- Engine: 15/15 tests (`npm run test:engine`) · CI: [badge]
- API: N/N integration tests incl. list latency <Xms @10k bugs
- Typecheck: clean, 4 workspaces
- Accessibility: WCAG 2.2 AA verified with <tool>, <date>
```

**W8.3 Clean-clone setup test** — `npm install && npm run build && npm run seed && npm run dev` must work end to end on a machine that has never seen the repo. Untested setup instructions are a Criterion 5 failure waiting to happen in front of judges.

**W8.4 Architecture + decisions** — the ASCII diagram from reference §7, plus a short "decisions and trade-offs" section: why SQLite, why SSE over WebSockets, why a zero-I/O engine package, why lexical dedup over ML. **Criterion 6 is "Documentation *& Explanation*"** — the explanation half is where marks hide, and reasoning about trade-offs is exactly what it's asking for.

**W8.5 Demo video (3–5 min), recorded** — insurance against live failure and a documentation artifact in its own right.

**W8.6 Rehearse the path twice.** The sequence:
1. Bug list — table/card, filters *(covers basics)*
2. File a near-duplicate → radar catches it mid-typing *(first reaction)*
3. Bug detail → **flow timeline, stalled segment highlighted** *(the thesis)*
4. **Request Inbox → resolve the incoming `review?` → the stalled gap clears** *(★ money shot)*
5. Webhook simulator → `Fixes #412` → auto-transition, activity log shows `automated` *(the wow)*
6. Security group — invisible to a non-member in list **and** dedup *(depth)*
7. Analytics — CFD widening band + sleeper branches *(W5 payoff)*

**Step 4 is the most valuable 30 seconds in the submission.** Most teams demo features as a list. Showing feature B *resolving* a problem feature A *diagnosed* proves a coherent product rather than a pile of parts. Seed a bug into exactly that state, ready.

**W8.7 State that seed data is seeded** — 140 backdated bugs is the right call for a credible CFD. Say it once, plainly. Volunteering costs nothing; being caught implying otherwise costs a lot.

---

## 4. Order and totals

| Order | Block | Time | Marks |
|---|---|---|---|
| 1 | **W2** Accessibility | ~4h | **+6** |
| 2 | **W3** Security & reliability | ~2.5h | **+4** |
| 3 | **W4** Dedup claim | ~40m | **+3** |
| 4 | **W1** Capability gap | ~5h | **+4** |
| 5 | **W8** Docs & demo | ~3h | **+5** |
| 6 | **W5** Surface analytics | ~2h | **+2** |
| 7 | **W7** Performance evidence | ~1.5h | **+2** |
| 8 | **W6** UX polish | ~2.5h | **+2** |

**~21 hours → 95–100.**

Note W2/W3/W4 come before W1 despite W1 being the bigger *functional* gap: the first three are places the build is **actively losing marks it has already earned**, and W4 is 40 minutes for 3 marks. Fix leaks before adding volume.

---

## 5. If time runs short

Cut from the bottom of the order, in this sequence — each cut costs ~2 marks and nothing structural:

1. **W6** UX polish → ship with current empty/loading states
2. **W7** at-scale benchmark → keep the 140-bug number, don't overclaim
3. **W1.5** saved searches + notifications → document as scoped-out
4. **W1.1/W1.2** watchers + keywords → document as scoped-out

**Never cut:** W2 (accessibility — 7 marks and explicitly in the rubric), W3.1/W3.2 (the auth holes — they invalidate your own security claims), W4 (40 minutes, 3 marks, and it's a *credibility* fix), W8.2/W8.3 (verified claims + clean-clone setup).

---

## 6. What not to do

- **Don't build the visual workflow editor, Blast Radius graph, or rrweb capture.** Scope isn't the constraint — completeness is. New surface area breaks on demo day and scores nothing the existing headliners don't cover.
- **Don't migrate to Postgres.** SQLite is proven at this scale by a passing test, and the README already names the migration as the honest next step.
- **Don't wire real ML embeddings.** W4's honest framing scores better and risks nothing.
- **Don't add features after the demo rehearsal.** Every change after W8.6 is untested under demo conditions.
