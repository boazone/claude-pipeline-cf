# The pipeline — why each step exists

Generalized from FND's `vibe/dev/PLAN-pipeline.md` (approved 2026-10-05, landed with FND-72) and
the six weeks of stories that shaped it. `template/` carries the skills that run it; this file is
the argument behind them. `<P>` is the project's ticket prefix (`FND`), `<name>` its technical name.

**Who the user is.** The user owns the product, the architecture, the database, the data flow,
security and UX, and does not read code. The code is tested, formatted, logged and reviewed
without the user confirming anything; decisions reach the user wherever they are; the user is
called back only when a feature runs on dev.

---

## 1. The sections

| Section | From | To | Skill |
|---|---|---|---|
| **Phases** | a new project | an approved PRD, then approved specs and design | `/pipeline` → `/plan`, `/design` |
| **Openers** | a request — desktop, phone, or a bug candidate | a story, stopped or running | `/open` |
| **Runners** | a story | a feature on dev, accepted by the user, cleaned up | `/run` |
| **Deployers** | accepted stories on `main` | a version on QA (when there is one), then production | `/ship` |
| **Helpers** | — | a hotfix, the bug sweep, the weekly review | by hand, and two cloud routines |

`/pipeline` is the one entry. It reads where the project and each story are **from the repository
alone** and hands the work to the skill that does it.

---

## 2. Phases — before the first story

| # | Step | Who | Does | Ends at |
|---|---|---|---|---|
| P1 | **Plan** | the agent writes; the user answers and approves | `vibe/prd/PRD.md` — the problem, the users, the requirements as `FR-nnn` / `NFR-nnn`, the stages, the data model sketch — and `vibe/TERMINOLOGY.md`, the locked words. Questions one at a time; every answer written the same turn. | the user's approval, in the PRD's header: status `approved` |
| P2 | **Design** | as P1 | One `vibe/specs/SPEC-<app>.md` per app — screens, states, copy, flows — and `vibe/design/design.md` (the visual language), plus one `design-<app>.md` per app that differs. Wireframes are artifacts only when the user asks, registered in `vibe/RESOURCES.md`. | the user's approval, in each document's header |

**Why two stops.** The PRD and its words are what every later document derives from; a design
built on unapproved words is rewritten when the words change. FND renamed *creator* → *host*,
*attempt* → *try* and *image* → *photo* after screens existed, and every rename was a sweep across
documents and code.

**Why the words are binding.** `TERMINOLOGY.md` outranks the PRD. A word not in it does not exist
yet: it is proposed, confirmed and added in the same turn. FND's agents invented synonyms whenever
the vocabulary was loose; a locked list stopped it.

After P2, `/pipeline <description>` opens stories. A requirement can still change: a decision given
in chat is written into the PRD the same turn, with its consequences in the specs and the design.

---

## 3. Openers — a request comes in

| # | Step | Does | If it fails |
|---|---|---|---|
| O1 | **Write, then stop** | `story.md`: what, why, *Done when* lines a machine can check. Closes the gaps the documents and the code answer; asks the user only product questions, one at a time. A bug is reproduced on dev first and its root cause named at `file:line`. Status `open`. | a question the user cannot answer yet — under *Open*, nothing runs · a bug not reproduced — no story |
| O2 | **Write, then run** | O1, then straight into the runners. | as O1 |

**Why the plan is not written at the open.** A story opened today may run weeks later against a
different `main`. FND's first opener wrote `plan.md` at the open and the plans went stale; the plan
belongs to the run (R1).

**Why a bug needs a reproduction.** A report names a symptom. Without the symptom seen and its
root cause named, the fix guards one caller and leaves its siblings broken.

---

## 4. Runners — from a story to a feature accepted on dev

| # | Step | Who | Does | If it fails |
|---|---|---|---|---|
| R1 | **Shape** | agent | `plan.md`: dev points, how each *Done when* line is checked, what each point touches. Flags three areas: database, architecture and data flow, security. | — |
| R2 | **Decide** | user — skipped when nothing is flagged | One decision card per flagged decision: what changes, what it reaches, whether it is reversible. A migration shows its SQL in full; that approval carries it to every environment. The answer goes in `log.md` word for word. | no — back to R1, or dropped · no answer — it waits |
| R3 | **Build** | agent; machines gate it | Code and tests per dev point, one commit each. Biome formats each file written; every commit runs gitleaks, then `verify`. | red — the commit is refused · a new decision — R2 · the same failure three times — `blocked` |
| R4 | **Evaluate** | agent deploys; fresh agents judge | The branch on its own Worker Preview in the dev account. An evaluator that never saw the code checks every *Done when* line in a browser. Three fresh reviews of the diff: correctness, over-engineering, security. | a line fails — R3 · three rounds — `blocked` |
| R5 | **Merge and dev deploy** | agent, on green, without asking | `main` merged into the branch, `verify` again, a squash merge, dev deployed from `main`, a quick check. Status `dev`. | a conflict touching code — R4 · dev broken — dev back on the commit before the merge, a fix-forward round |
| R6 | **Call-back** | agent | Per *Done when* line, a dev link that signs in and lands on the page, and what to do and see. | — |
| R7 | **Accept** | user, on dev | accepted · notes — a new round on the same story · drop — the merge undone | no answer — it stays `dev` and holds the next ship |
| R8 | **Cleanup** | agent | The preview, the branch, the worktree. What the harness refuses goes to a queue a scheduled task runs. | — |
| R9 | **Reopen** | user | An accepted story back to a failed R7, with a reason. | — |

**Why only two stops.** FND's merge used to wait for the user's word on a pull request the user
could not read. The judgment the user can make — the feature, running — moved to R7, on dev; the
merge became a machine decision on green.

**Why flag three areas.** Those are the decisions that reach past the story: a migration touches
production's rows, a new binding must exist in every environment, a session rule decides who sees
what. Everything else is a default, listed in `plan.md` and on the decisions page, with how to
overturn it. In doubt, flagged.

**Why a fresh evaluator.** An agent that wrote the code checks what it meant, not what it built.
The evaluator gets the URL and the lines, and is forbidden the diff.

**Why a preview per story, in the dev account.** Stories run side by side; none writes the user's
local rows or QA's. A story carrying a migration gets a copy of dev's database with it applied.

**Why dev rolls back but `main` does not.** A revert, then a revert of the revert, left too many
half-done states to resume from the log. Dev goes back to the commit before the merge; the story
fixes forward; the story staying `in progress` holds any ship.

---

## 5. Deployers

| # | Step | Does |
|---|---|---|
| D1 | **Ship to QA** — when the project has QA | Every story on `main` accepted, `verify` green, the approved migrations, `env/qa` fast-forwarded to `main` (the push is the deploy), a check on QA, the next version tagged, the changelogs marked. Status `qa`. |
| D2 | **QA check** — when the project has QA | the user and the testers, on QA |
| D3 | **Ship to production** | A version: a D1 Time Travel bookmark, the migrations, `env/prod` fast-forwarded, a quick check, rolled back to the previous version if it fails. Status `prod`; the story folder moves to `tasks/shipped/`. |

**Without QA** (a `/start` choice), D3 ships `main` itself: D1's gate — every story accepted on
dev, `verify` green — then the version is tagged at D3, and the accept on dev is the check.

**Why a version per ship, not per story.** Production deploys a specific commit QA (or dev) ran;
that needs a name. A version per story would be a second name for the index.

**Why `env/*` branches deploy and `main` does not.** `main` with two jobs — the latest code and
what is live — could never be merged into without releasing. Moving the trigger to `env/qa` and
`env/prod` makes `main` safe at any hour, a docs-only commit deploys nothing, and
`git log origin/env/prod..origin/main` is the release note.

**Why forward only.** `env/prod` reaches only a commit QA (or dev's accept) already carried; git
refuses anything but a fast-forward, and a refusal is a finding, not a nuisance. The one move back
is the rollback, behind the guard.

**Why migrations are not in the build.** Workers Builds deploys code and never touches a database.
Additive migrations go before the push, destructive or renaming ones after it, never both in one
ship.

---

## 6. Helpers

| # | Step | Does |
|---|---|---|
| H1 | **Hotfix** | `hotfix/<P>-<n>` cut from `env/prod`, built and evaluated on a preview, a pull request into `env/prod` (the merge is the deploy, behind the guard), its own patch version, merged back into `main` with a merge commit. |
| H2 | **Bug sweep** | a cloud routine, daily, and after each ship: production's (and QA's) system log grouped by kind into `tasks/SWEEP.md`. |
| H3 | **Weekly review** | a cloud routine, weekly: security, `npm audit`, over-engineering, documentation drift into `tasks/REVIEW.md`. |

---

## 7. The coding standard

1. TypeScript, strict.
2. Biome — one formatting, its lint rules: every promise awaited, no skipped or focused test.
3. The words of `TERMINOLOGY.md` in every identifier.
4. The database conventions, and no hand-written SQL: a migration is generated, and a test writes
   rows through the application's own code.
5. Several languages and directions, when the project has them: `vibe/reference/i18n-and-rtl.md`.
6. Each app's design document.
7. The simplest code that works; what exists is reused before anything is written.
8. A test for every *Done when* line and every bug fixed.

## 8. What runs where

| Check | R3, every commit | R4 | R5 | Ship | Weekly |
|---|---|---|---|---|---|
| Format, lint, typecheck, tests, coverage floor | yes | | yes | yes | |
| gitleaks | yes | | | | |
| *Done when* lines in a browser | | on the preview | quick check on dev | quick check | |
| Correctness, over-engineering, security review | | fresh agents, the diff | | | the whole repo |
| Dependency audit | | | | | yes |

---

## 9. Rules

1. **The repository is the only state.** `/pipeline <P>-<n>` resumes from `log.md`, never memory;
   every step logs, commits and pushes before the next starts, so a session that dies leaves the
   log one step behind, never ahead.
2. **A question goes in the session.** A push notification only at a stop: a decision card, a
   `blocked` story, a production prompt, a failed ship, the call-back, a write to a gate file.
3. **The decisions page** — `DECISIONS.md` on the orphan branch `decisions`, regenerated after
   each step — is what the user reads on the phone.
4. **Statuses:** `open` → `in progress` → `dev` → `accepted` → `qa` → `prod`, plus `blocked` and
   `dropped`. Without QA, `qa` is skipped.
5. **Free tiers only.** The gates run on the laptop; a pull request runs no checks.
6. **The agent's credentials.** Dev and the previews on the dev account's token, which reaches
   nothing else; anything that changes production asks the user first (the guard).
7. **The local database and `local.<domain>` are the user's.** No step of the pipeline runs
   there; `npm run dev` only when the user asks.
8. **A decision overturned keeps its argument** in the document, marked overturned, never deleted.
   The same argument comes back; the kept text answers it.
9. **One command per Bash call** for the allowed forms (`deploy:dev`, `preview:dev`, `gh pr
   create`, `gh pr merge <n> --squash`): an allow rule reads the whole line, and anything added
   turns it into a prompt nobody is told about.

## 10. Lessons that cost FND a day each

1. A Worker in one account cannot take a custom domain on a zone in another — dev is on
   `workers.dev`.
2. Workers Builds substitutes its own `wrangler versions upload` for non-production branches,
   dropping `-c`; every such build fails. Non-production branch builds go **off** on day one.
3. `npm install` must run at the workspace root, `code/`, or workspace packages never link; the
   build's root directory is `code` and the config is named with `-c apps/api/wrangler.jsonc`.
4. Bindings, `vars`, Durable Objects, triggers and rate limits are **not inherited** by a named
   wrangler environment; each block repeats them. A Worker Preview inherits nothing either.
5. Access must cover every request: no service worker on dev (it served the app past a lapsed
   Access session), and fetches send credentials.
6. Removing and re-adding the Access application makes a new AUD; the Worker's `ACCESS_AUD` must
   follow.
7. Remote D1 splits a migration on `;` inside a `/* */` comment; local SQLite does not.
8. A Google OAuth client per environment, each with its own redirect URI; an account not listed
   under the consent screen's test users is refused, and reads like a code bug.
9. A session secret differs per environment, so a QA session never validates on production.
10. Windows lets a second `workerd` bind beside a live one; the old one keeps answering. The local
    starter refuses a busy address.
11. Paths over 260 characters fail opaquely on Windows; keep worktree names short.
