---
name: run
description: Run one {{PREFIX}} story from its story to a feature on dev, accepted by the user — `/run {{PREFIX}}-12`, `/run {{PREFIX}}-12 accepted`, `/run {{PREFIX}}-12 drop`, `/run {{PREFIX}}-12 reopen <reason>`. Stops only for a decision card; merges on green and calls back with dev links. Use for starting, continuing, running, checking, accepting, reopening or cleaning up an existing story.
---

# run

The runners of `vibe/dev/PIPELINE.md` §4. `/run {{PREFIX}}-<n>` takes one `tasks/{{PREFIX}}-<n>/`
from `open` to a feature running on dev, and calls the user back. The user is asked only for a
decision card (R2) and for the accept (R7); everything between is the agent's, gated by machines.

| Form | Does |
| --- | --- |
| `/run {{PREFIX}}-<n>` | From wherever the story is — `/pipeline` §2 decides the step, from the repo alone |
| `/run {{PREFIX}}-<n> accepted` (or *accepted* in the story's thread) | R7 accepted, then R8 |
| notes in the story's thread, after R6 | R7 → a new round from R3 |
| `/run {{PREFIX}}-<n> drop` | R7 drop — the merge undone, `dropped` |
| `/run {{PREFIX}}-<n> reopen <reason>` | R9 |

**Input is the index.** With none, ask which story — never open one; that is `/open`.

**Every report follows `vibe/CLAUDE.md` *Talking to the user*.** Nothing is reported between R2 and
R6 unless the story stops. A stop reaches the phone by § *The phone*.

## 0. Load

1. `vibe/TERMINOLOGY.md` — binding. `vibe/CLAUDE.md`. `vibe/dev/PIPELINE.md` §4, §7, §9.
2. **Get on the right checkout** — decided by where the story is, not by the current branch:
   - **No `features/{{PREFIX}}-<n>` on `origin`, and `tasks/{{PREFIX}}-<n>/` on `origin/main`** — past a
     merge. Never in the root checkout, `{{root}}`, which stays on `main`: there, `git fetch
     origin`, then work in `.claude/worktrees/{{PREFIX}}-<n>` — reused when it exists (`git -C <it>
     checkout --detach origin/main`), else `git worktree add --detach .claude/worktrees/{{PREFIX}}-<n>
     origin/main`.
     - R5.4–R6, R7.1, R7.3 and R8 run on `main`: `git fetch origin && git checkout --detach
       origin/main`.
     - A new round (R7.2, R9, R5.5's fix-forward), or any R3–R5.3 resume with no remote branch,
       cuts it again: `git fetch origin && git checkout -B features/{{PREFIX}}-<n> origin/main`, then
       push. Refused as *already checked out at `<path>`* — run there, or `git -C <path> checkout
       --detach` first, and say which.
   - `features/{{PREFIX}}-<n>` on `origin`:
     - on `features/{{PREFIX}}-<n>` — resuming; nothing to do.
     - in a worktree the desktop app made (`claude/<name>`) — `git fetch origin && git checkout
       features/{{PREFIX}}-<n>`. *Already checked out at `<path>`* — the story runs there; stop and
       say so.
     - in the root checkout — `git fetch origin && git worktree add .claude/worktrees/{{PREFIX}}-<n>
       features/{{PREFIX}}-<n>`, and work there.
   - On neither: the story was never opened — `/open`.
3. **Merge `origin/main` into the branch** before anything else when the branch was cut before the
   latest `main`. `tasks/INDEX.md` conflicts keep `main`'s rows and this story's row in index order.
4. First run in a worktree: `cp {{root}}/code/apps/api/.dev.vars code/apps/api/.dev.vars` when it
   exists, then `npm install` in `code/` — the pre-commit hook runs `verify` whenever `code/` is
   staged.
5. `tasks/{{PREFIX}}-<n>/story.md`, `log.md`, and `plan.md` if it exists — always, fully.
6. The PRD sections the story names, `vibe/TECH-STACK.md`, the specs and design documents of its
   apps, and `vibe/reference/database-conventions.md` when it touches the database.
7. **The index is the only one** — `git branch -a --list '*{{PREFIX}}-<n>*'` and the `story.md`
   titles of every worktree; a different title under the same index is a stop.
8. **Rename the session** `{{PREFIX}}-<n> — <title>`:
   `mcp__ccd_session_mgmt__set_session_title session_id: "self"`.

***Open* in `story.md` not `None.`** — a question with no `O1: answered` for it in `log.md` → it is
the blocker, as `/open` §6 shows and records it; nothing runs until it is answered.

**Running `/run {{PREFIX}}-<n>` (or `/pipeline {{PREFIX}}-<n>`) approves the story.** No approval entry
in `log.md` → append `R1: approved — by running /run {{PREFIX}}-<n>`. It does not answer a decision card.

**`vibe/prd/PRD.md` and `vibe/BACKLOG.md` before any question about behavior.** A requirement that
answers it makes it a default, not a question.

## R1 Shape — `plan.md`

Write `tasks/{{PREFIX}}-<n>/plan.md` when it is missing. Status → `in progress` in `story.md` and
`tasks/INDEX.md`.

````markdown
# {{PREFIX}}-<n> — plan

## Approach

Two or three points: the shape of the change, and why this shape.

## Dev points

| # | Point | Touches | Flag | Proves | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | … | `code/apps/api/src/…` | — | 3, 4 | todo |

## Decisions

One block per decision (R2), headed `### <area>: <decision>` — the key the log's R2 entries use.
None → `None.` Then, always: `Considered, not flagged: …` — one line per area with the document or
precedent that settles it.

## Defaults

The technical choices made without asking, one line each — what was chosen and what it rules out.
The decisions page lists them under the story, with how to overturn one.

## Out of scope

## Verification

Per *Done when* line: the test that proves it, and how the evaluator checks it on the preview — the
page, the role, what to see.

## Changelog entries

| File | Line |
| --- | --- |
| `vibe/changelog/system.md` | … |
| `vibe/changelog/<app>.md` | … |
````

1. **One dev point is one commit-sized change**; real paths; every *Done when* line proved by at
   least one point.
2. **Flag three areas** — each decision in one is its own block and its own card — each with one
   question: *is there a decision here the user has not already made?*
   - **Database** — a table, column, index, constraint, migration, backfill, a change to what a
     stored row means. **Never "clear enough"**: any migration is a card.
   - **Architecture and data flow** — a dependency, a Worker, Durable Object, bucket or service, a
     secret, variable, binding, route, domain or console setting {{#qa}}QA and {{/qa}}production must
     have, a new boundary between the apps and the API, a pattern the repo has not used.
   - **Security** — sign-in, sessions, cookies, tokens, who may see or do what, a role boundary,
     input that crosses a trust boundary.
3. **Not flagged** when the change is an instance of a decision already written down. Name the
   document or precedent. None nameable → flagged. In doubt → flagged.
4. Anything else is a **default**, in `plan.md` and the log, never a question.
5. Nothing flagged → straight to R3, no stop. Commit `plan.md`, log `R1: plan`, push.

## R2 Decide — one card per decision

One message, `## For you: {{PREFIX}}-<n> needs <k> decisions`: the Status table; the story summary
(`vibe/CLAUDE.md` *Talking to the user* 3); then one **Blocker B<i> of <k>: <area>: <decision>**
card per decision in `plan.md`, with **What changes**, **Consider** (what it reaches beyond the
story — {{#qa}}QA, {{/qa}}production, other users' data, a console; what breaks if it is wrong; what a
yes commits the user to) and **Reversible**; then *Considered, not flagged*, the Links and the dev
points. A migration's card has its SQL generated by drizzle-kit, reverted until approved, and
**Applies to** naming the preview's copy, dev{{#qa}}, QA{{/qa}} and production.

1. **Log the cards as shown** — `R2: B<i> <area>: <decision> — waiting`, one entry per card — then
   the push (§ *The phone*), and **wait**. Silence is not a yes. The answer goes in `log.md` word
   for word, **with its decision**: `R2: B<i> <area>: <decision> answered — "<words>"`. An answer
   holds for the story's whole life, every round.
2. **The SQL approved here is approved everywhere**; edited after, it is a new card.
3. A *no* → `R2: B<i> <area>: <decision> refused — "<words>"`, and back to R1 with what it rules
   out — or `dropped`. A re-plan that brings the decision back, changed, logs its new card
   `R2: … — waiting` in the same commit as `R1: plan`. Other decisions keep their answers.

## R3 Build

Per dev point: do it, set its row `done` in `plan.md`, append `R3: point <k> — …` to `log.md`,
commit (`{{PREFIX}}-<n> — <point>`) and push.

1. **The coding standard**, `vibe/dev/PIPELINE.md` §7. Biome formats each file written; every
   commit runs gitleaks, then `npm run verify`, and is refused while red — fix what it names.
   `--no-verify` and `core.hooksPath` are denied.
2. **A test for every *Done when* line** and every bug fixed — Vitest for the api and the
   components; a browser test (`code/apps/web/browser/`) for a line on a page.
3. **Nothing runs locally to check a line.** The check is R4's, on the preview. A local story server
   is for a test that needs one, on request, and never the local database.
4. **A decision recorded the same turn** — `log.md`, and `vibe/prd/PRD.md` with its consequences
   when it changes what the product does. An overturned argument is kept, not deleted.
<!-- {{#i18n}} -->
5. **A screen added or changed** is built and verified to `vibe/reference/i18n-and-rtl.md`: no string
   in a component, no `left`/`right` in CSS; its §10 passes — the mirror pass and the length pass —
   in `log.md`, on the preview at R4.
<!-- {{/i18n}} -->
6. **A bug story** — its requirement reads `— fix`:
   1. **Root cause, not symptom.** One change where every caller routes through beats a guard in the
      caller the report named.
   2. **The shortest diff that fixes the root cause** — no refactor around it.
   3. **A second bug found on the way** is a line in `vibe/BACKLOG.md` and a note in `log.md`, not a
      second fix on this branch.
7. **Stop on:** a new decision → its block in `plan.md`'s *Decisions* and its `R2: … — waiting`
   entry in one commit, then R2 for that card · a blocker outside the plan → `blocked`, named in
   `log.md` · the same failure three times → `blocked`.

## R4 Evaluate — on the story's own Worker Preview

**One command per call.** `preview:dev`, `deploy:dev`, `gh pr create` and `gh pr merge` run without
a prompt only in the exact forms this skill writes, each the whole Bash call — nothing before it,
nothing after it: no `cd`, no `2>&1 | tail`, no second command. An allow rule and the guard read the
whole line, so anything added turns an allowed command into a prompt.

```bash
npm --prefix code run preview:dev -w @{{name}}/api -- <n>
```

Deploys `https://{{name}}-<n>-{{name}}-dev.{{dev_subdomain}}.workers.dev` with its own Durable Objects,
on dev's database — or, when the branch adds a migration, on `{{name}}-preview-<n>`, a copy of dev's
with the approved migration applied — and checks Access: 302 without it, 200 with the service
token. A migration edited after the copy: `-- <n> --delete` first. Cloudflare failing → retry once,
then `blocked`.

**1. The evaluator — a fresh subagent that never saw the code.** `Agent`, `general-purpose`, in the
background, with this prompt and nothing from the build:

> You are the evaluator for {{PREFIX}}-`<n>`. You check a running system, not code: do not read
> `git diff`, the branch's commits, or anything under `code/apps/*/src`. You may read `vibe/` and
> `code/README.md` *Tests*.
> The system: `<preview URL>`, behind Cloudflare Access. Check each line below on it, as the line's
> role would. Write Playwright specs in `code/apps/web/browser/eval/` (git-ignored), import `test`
> and `expectAccessible` from `../kit` — its `test` carries the Access token for you — and run them
> from `code/` with `{{NAME}}_BASE_URL=<preview URL> npx playwright test -c apps/web/browser eval/`.
> When a line needs a signed-in user, sign in the way `code/README.md` *Tests* says — never as the
> user's own account, `{{email}}`.
> The lines: `<every *Done when* line, verbatim>`.
> Return one row per line: **pass**, **fail** or **cannot** (no machine can check it — say why),
> with what you did and what the page showed. Do not fix anything.

Log a row per line in `log.md` (`R4: evaluator`). **A preview without its own database shares
dev's**: rows it writes show on dev. Dev holds only test data, so this is accepted; a story that
needs a clean dev says so in its plan. A **fail** → R3, then R4 again; the same line failing three
rounds → `blocked`, with what was seen. A **cannot** goes to the user at R6.

**2. Three fresh reviews of the whole diff**, `origin/main...HEAD`, each its own subagent, in
parallel: `/code-review` (correctness), `/ponytail-review` (over-engineering), `/security-review`.
Each finding is fixed — and its line re-evaluated — or answered with the reason, in `log.md`
(`R4: reviews`). A review skill this session lacks is said once, never skipped silently.

Green = every line **pass** or **cannot**, every finding fixed or answered, `verify` passing —
logged as `R4: green`, R4's last entry. A line failing → `R4: fail <line>`, with its fix as a `todo`
dev point in `plan.md`, in one commit.

**Nothing under `code/` changed** (a skill, a document): no preview. The evaluator checks the lines
against the documents, and the three reviews run as usual.

## R5 Merge and dev deploy — on green, without asking

1. Write the changelog lines from `plan.md` under `## Not shipped`. `R4: green` in `log.md`. Commit.
2. `git fetch origin && git merge origin/main` — a conflict is resolved; the merge changing nothing
   under `code/` (`git diff <before> <after> -- code` prints nothing) is logged `R5: conflict — R4
   holds` and goes on; otherwise `R5: conflict — back to R4`, and back to R4. `npm run verify` in
   `code/`.
3. Push, open the pull request onto `main` — the body: each *Done when* line with its evaluator
   result, every decision with its answer, the migration, the three review lists — then merge. Each
   line its own call:

   ```bash
   git push origin features/{{PREFIX}}-<n>
   gh pr create --base main --head features/{{PREFIX}}-<n> --title "{{PREFIX}}-<n> — <title>" --body-file <file>
   gh pr merge <pr> --squash
   ```

   **At once**, before anything else: `R5: merged <sha> <pull request URL>` in `log.md`, as
   bookkeeping on `main` (the branch is gone from here on). Then `git push origin --delete
   features/{{PREFIX}}-<n>` — already gone is fine. Report the URL `gh` printed, never one composed.
   `--delete-branch` is not used: it checks out `main`, which the root checkout holds.
4. **Deploy dev from `main`, in this worktree** — unless another story's `R5: broken` on `main` has
   neither an `R5: merged` nor an `R7: dropped` after it: then wait, `blocked — <that story> broke
   dev`.

   ```bash
   git fetch origin && git checkout --detach origin/main
   npm --prefix code run deploy:dev -w @{{name}}/api
   ```

   It migrates dev, deploys, and checks Access — failing, it runs once more before anything else.
   Then the quick check, from `code/`:
   `{{NAME}}_BASE_URL=https://{{name}}-dev.{{dev_subdomain}}.workers.dev npx playwright test -c apps/web/browser public.spec`
5. **Dev broken** — the deploy, the migration or the quick check fails: **dev goes back, `main` does
   not.** The story staying `in progress` holds any ship.
   1. At once, one bookkeeping commit on `main`: `R5: broken <merge sha> — <why>` in `log.md` (a
      round boundary), the fix as a `todo` dev point in `plan.md`, status `in progress`.
   2. Dev from the commit before the merge: `git checkout --detach <merge sha>~1`, then
      `npm --prefix code run deploy:dev -w @{{name}}/api -- --branch` (it prompts), the quick check,
      and `R5: dev restored <sha>` as bookkeeping on `main`. A migration dev already ran stays.
   3. A new round from R3, on the branch cut again from `main`, fixing forward. Restoring dev
      failing → `blocked`.
6. Status `dev` in `story.md` and `tasks/INDEX.md`, and `R5: on dev <sha>` in `log.md` —
   bookkeeping pushed straight to `main`. `git -C {{root}} pull --ff-only`.

## R6 Call-back

The push (§ *The phone*), then `## For you: {{PREFIX}}-<n> is on dev`:

1. **Status** — Story, Status `dev`, Step with **R7 Accept** bold, Since last update. A bug story
   adds **Symptom**, **Root cause** (`file:line`, every path through it) and **The fix** (what
   changed, in words, and the regression test left behind).
2. **Links** — one row per *Done when* line: the line, a dev link that lands on the page —
   `https://{{name}}-dev.{{dev_subdomain}}.workers.dev/<path>` — and the instructions: who to be, what
   to do, what to see. Then the pull request.
3. The lines no machine could check (R4's **cannot**), named — the user's to check.
4. **Follow ups** — what the story found and did not fix, offered by number.

`R6: called back` in `log.md`. The user signs in to Access once per browser, by the one-time code
to `{{email}}`.

## R7 Accept — the user's, on dev

1. **Accepted** → status `accepted`, `R7: accepted — "<words>"` in `log.md` (bookkeeping on
   `main`), then R8.
2. **Notes** → a new round on the same story: the branch cut again from `main`; **in one commit**
   `R7: notes — "<words>"` in `log.md`, status `in progress`, and each note a dev point in `plan.md`
   (a test that fails before the fix); pushed at once to the branch **and to `main`**
   (`git push origin HEAD:main` — a fast-forward of `tasks/` only), so a ship reads the story as
   `in progress`; then R3 → R4 → R5 → R6.
3. **Drop** → on `main`, never on the story's branch: `git fetch origin && git checkout --detach
   origin/main`. First, when the branch's copy is the newer one, its folder from the branch —
   `git checkout origin/features/{{PREFIX}}-<n> -- tasks/{{PREFIX}}-<n>/`, and the INDEX row by hand
   when `main` has none. Then, on top, one commit: `R7: drop — "<words>"` and status `dropped`,
   pushed together with the branch's deletion, in one atomic push:

   ```bash
   git push --atomic origin HEAD:main :features/{{PREFIX}}-<n>
   ```

   Never merged → `R7: dropped — nothing merged`, then R8. Otherwise every round's merge undone on
   `main`, **code only**, on one branch — each revert resolved before the next:

   ```bash
   git checkout -B revert-{{PREFIX}}-<n> origin/main
   for sha in <each R5: merged sha, newest first>; do
     git revert --no-commit "$sha"; git checkout origin/main -- tasks/
     git diff --name-only --diff-filter=U    # must print nothing before the next revert
   done
   git commit -m "{{PREFIX}}-<n> — dropped: revert <shas>"
   git push --force-with-lease origin revert-{{PREFIX}}-<n>
   ```

   A file the `git diff` still prints is code a later story built on: resolved by hand, or
   `blocked`. Then a pull request for `revert-{{PREFIX}}-<n>`, `gh pr merge <pr> --squash`,
   `npm --prefix code run deploy:dev -w @{{name}}/api` from `origin/main`, **then**
   `R7: dropped — reverted <shas>` on `main`, then R8.
4. No answer → it stays `dev`, and holds the next ship.

## R8 Cleanup — after R7

1. The preview, and `{{name}}-preview-<n>` if there is one:

   ```bash
   npm --prefix code run preview:dev -w @{{name}}/api -- <n> --delete
   ```

2. Any worktree that is not this session's, then the branches:

   ```bash
   git -C {{root}} worktree remove .claude/worktrees/{{PREFIX}}-<n>
   git -C {{root}} branch -D features/{{PREFIX}}-<n> revert-{{PREFIX}}-<n> claude/<name-if-any>
   git -C {{root}} fetch --prune
   ```

3. **This session's own worktree is queued, never removed from inside.** It goes to the cleanup
   queue, one line, with the Bash tool (Git Bash — PowerShell 5.1 would append UTF-16), and so does
   any command above the harness refused. A scheduled task runs the queue daily at 09:00
   (`code/tools/cleanup`):

   ```bash
   echo "0 git -C {{root}} worktree remove .claude/worktrees/<this worktree>" >> {{root}}/.claude/cleanup-queue.txt
   ```

   Only the shapes `code/tools/cleanup/index.mjs` allows run; any other line is dropped unrun.
4. `R8: cleaned up` — what was removed and what was queued — as bookkeeping on `main`. **Never
   report a cleanup that did not happen.**

## R9 Reopen — `/run {{PREFIX}}-<n> reopen <reason>`

A story `accepted`{{#qa}} or `qa`{{/qa}} comes back to a failed R7, with a reason.

1. The branch cut again from `main`; **in one commit** `R9: reopened — "<reason>"` in `log.md`,
   status `in progress`, and the reason as a dev point in `plan.md`; pushed at once to the branch
   and to `main`, so `/ship` sees it.
2. A new round from R3 — or, when the reason needs a decision, its card first.
<!-- {{#qa}} -->
3. On `qa`: QA keeps its version until the fix ships. In production it is not a reopen: a bug story.
<!-- {{/qa}} -->

## The phone — a push, and the decisions page

1. **A question goes in the session.** `PushNotification` goes out only at six stops, right before
   the stop's message: a decision card (R2, `/open`'s stop, a phase's stop) · a `blocked` story · a
   production permission prompt · a failed ship · the call-back (R6) · **a write to a gate file** —
   `.githooks/`, `.claude/hooks/`, `.claude/settings.json` — which the guard asks before. One line
   under 200 characters, what the user acts on — *{{PREFIX}}-12: 2 decision cards — B1 database, B2
   security*. Never for progress. Never error output, SQL, a URL, a token or a value.
2. **Away is the app's.** The tool sends nothing while the user is at the session. *Not sent* is
   expected — never retried, never logged.
3. **The decisions page** — after each step's push, `npm run decisions` from `code/`: `DECISIONS.md`
   on the orphan branch `decisions`. A failure never stops the step; say so once.

## Bookkeeping, changelogs, `log.md`

- Bookkeeping on `main`: `tasks/README.md` *Working copies* 4.
- Changelog lines: each `vibe/changelog/*.md` header says what goes in it; `system.md` is for users,
  and a change they would not notice gets no line there.
- `log.md`: `tasks/README.md` rule 4, and § *Log headings*.

## Log headings

Every entry is `## YYYY-MM-DD — R<k>: <what>` (`O<k>` from `/open`), then points — what was done,
decided and ruled out, what broke and why; no narration. **Logged, committed and pushed before the
next step starts.**

| Heading | Written |
| --- | --- |
| `O1: opened` · `O2: opened` · `O1: answered — "<words>"` | `/open` |
| `R1: approved — by running …` · `R1: approved — "<words>"` | §0, or `/open`'s stop |
| `R1: plan` | `plan.md` written or re-read |
| `R2: B<i> <area>: <decision> — waiting` · `… answered — "<words>"` · `… refused — "<words>"` | each card shown · a yes, for the story's life · a no — back to R1 |
| `R3: point <k> — …` | each dev point done |
| `R4: evaluator` · `R4: reviews` · `R4: fail <line>` · `R4: green` | the evaluator's rows · the findings · a failing line · R4's last entry |
| `R5: conflict — back to R4` · `R5: conflict — R4 holds` · `R5: merged <sha> <url>` · `R5: on dev <sha>` · `R5: broken <sha> — <why>` · `R5: dev restored <sha>` | as R5 says |
| `R6: called back` | the call-back sent |
| `R7: accepted\|notes\|drop — "<words>"` · `R7: dropped — reverted <shas>\|nothing merged` | the user's answer · the drop's undo done |
| `R8: cleaned up` | what was removed, and what was queued |
| `R9: reopened — "<reason>"` | starts a round |
| `R<k>: blocked — <what it waits on>` · `R<k>: unblocked — <what cleared it>` | a stop, and its push · the stop cleared |
