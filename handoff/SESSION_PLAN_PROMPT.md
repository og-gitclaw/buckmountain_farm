# Session-plan prompt

Paste the block below into a **fresh** Claude Code session (web or CLI) when the
rebuild backlog gets unwieldy and you want it split into bite-sized PRs again.
The session it spawns is **planning-only** — it produces a numbered queue of
copyable per-PR prompts, one per future session, ordered by dependency.

Re-run whenever:
- The set of open PRs gets past ~6 and you've lost the thread.
- A new handoff/*.md doc gets added and you want it sequenced into the queue.
- After a merge sweep, to re-prioritize what's left.

---

```
You're picking up the buckmountain.farm rebuild cold. Repo: og-gitclaw/buckmountain_farm
at /home/user/buckmountain_farm (Next.js 15 / App Router, Neon Postgres, Vercel,
deployed via PR previews). This is a PLANNING session — do NOT write code, do NOT
push anything. Your only deliverable is a queue of self-contained session prompts
I can paste one-at-a-time into fresh sessions.

# Step 1 — anchor

Read these and form your model of the project:
- handoff/*.md (especially ALPINE_IQ_INTEGRATION.md, WEB_PUSH_VAPID.md,
  TRANSACTIONAL_EMAIL_WORKFLOW.md, PROD_PROMOTE.md, RIP_LEGACY_RUNBOOK.md)
- lib/super-admin.ts                (allowlist: mustwemuse@, bmdistributionllc@)
- lib/session.ts, lib/push.ts, lib/db.ts
- app/admin/page.tsx, app/agent/page.tsx
- db/migrations/                    (current schema state)

Then list the actual work-in-flight:
  gh pr list --repo og-gitclaw/buckmountain_farm --state open --limit 30
  git branch -r | grep claude/ | sort
  git log --oneline main -40

# Step 2 — survey

For each OPEN draft PR (gh pr view <n>), produce 3 lines: what it does, blocker
(CI red / awaiting eyeball / depends on PR #X), what "done" looks like (≤1 line).

For each `claude/*` branch with NO open PR, decide: is it abandoned (close), in
progress but no PR yet (open one), or already merged via a different branch
(delete)?

For each handoff/*.md doc with no corresponding PR or merged code, mark it as
NET-NEW SCOPE.

# Step 3 — output the session queue

Produce a numbered list. Each entry is a copyable code block I will paste
verbatim into a fresh session. Each prompt must:

a. Be runnable cold. Include:
   - "Repo og-gitclaw/buckmountain_farm; develop on branch claude/<slug>; draft PR"
   - Exact file paths to touch (no vague "update the X")
   - Acceptance criteria (the bullet list that makes the PR mergeable)
   - Dependencies ("requires #N merged first" or "rebases cleanly on main")
   - Integration boundary it sits in:
     · Marketing SMS/email     → Alpine IQ (compliance)
     · Transactional email     → SES
     · In-app push             → VAPID Web Push (own channel, no Alpine IQ)
     · If unclear, flag it as a question to me upfront

b. Be ONE session of work: roughly one feature, one migration, one route group.
   If a unit feels like > ~6 files or > ~400 LOC, split it. A session that
   touches both schema AND a UI AND an API AND a worker is too big.

c. Respect existing patterns:
   - Auth: getSession() + isSuperAdmin() helpers; never invent new gates
   - Schema: db/migrations/NNN_*.sql AND mirror DDL in db/schema.sql
   - Routes: app/admin/ for staff, app/agent/ for field reps, app/api/*/route.ts
   - Draft PRs only; no auto-merge; no force-push; never push to main
   - PR body + commit footer end with the session URL line

d. Be ordered by dependency. Surface the critical path (smallest set that
   unblocks the most downstream work).

# Step 4 — sanity-check

Close the plan with:
- Total session count + rough cumulative LOC estimate
- The 3 PRs to land FIRST (highest unblock value)
- PRs to CLOSE (superseded, scope-drifted, abandoned)
- Architectural decisions I owe you before queue can start (e.g. "Alpine IQ
  Lists model: one list per dispensary vs one list per audience segment?")
- Anything in handoff/* that conflicts with code already merged

# Hard rules

- Plan only. No code. No edits to files outside handoff/SESSION_QUEUE.md if you
  choose to write the queue to disk (ask first).
- Don't invent features. If a session is NOT in an existing handoff doc or an
  open PR, label it [NEW SCOPE — confirm before queuing].
- Each session prompt is a copy/paste atom. Make them self-contained — assume
  the executing session has read NOTHING.
```
