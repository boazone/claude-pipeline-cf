---
name: pipeline
description: The one command for {{PREFIX}} — `/pipeline` alone runs the next phase (P1 the PRD and terminology, P2 the specs and design) or lists the stories in flight; `/pipeline <description | file.md>` opens a story and runs it; `/pipeline {{PREFIX}}-12` starts it or picks it up exactly where its log.md left it; `/pipeline {{PREFIX}}-12 accepted | notes <text> | drop | reopen <reason> | ship` answers the call-back or ships. Reads only the repo — the PRD's and the specs' status headers, tasks/PHASES.md, tasks/INDEX.md, story.md, plan.md, log.md — never memory or this thread. Use for "pipeline", "plan", "design", "run it", "continue", "pick up", "where is {{PREFIX}}-n", "next".
---

# pipeline

One entry for the whole path. It decides **where the project is, and where a story is**, and hands
the work to the skill that does it — `/plan`, `/design`, `/open`, `/run`, `/ship`. It does no step
itself.

**The repo is the only state** — read fresh on every call, never this thread, a memory file or a
summary. A session that started a minute ago resumes the same way as the one that wrote the log.

## The forms

| Form | Does |
| --- | --- |
| `/pipeline` | §0 — the next phase while one is open; once both are approved, the stories in flight (§3), and asks which |
| `/pipeline <description \| file.md>` | `/open --run` with it — written, then `/run` in the same thread. Before P1 is approved, only a chore or a spike (§0) |
| `/pipeline --bug <description \| file.md>` | `/open --bug --run` — reproduced first; not reproduced, no story |
| `/pipeline {{PREFIX}}-<n>` | Finds where the story is (§2) and continues there |
| `/pipeline {{PREFIX}}-<n> accepted` | `/run` R7.1, then R8 |
| `/pipeline {{PREFIX}}-<n> notes <text>` | `/run` R7.2 — a new round |
| `/pipeline {{PREFIX}}-<n> drop` | `/run` R7.3 |
| `/pipeline {{PREFIX}}-<n> reopen <reason>` | `/run` R9, on an `accepted`{{#qa}} or `qa`{{/qa}} story |
<!-- {{#qa}} -->
| `/pipeline {{PREFIX}}-<n> ship` | `accepted` → `/ship qa`, which ships everything on `main` as the next version; `qa` → `/ship prod <version>` — the version of its `D1: qa` entry; `dev` → it waits for the accept, say so |
<!-- {{/qa}} -->
<!-- {{^qa}} -->
| `/pipeline {{PREFIX}}-<n> ship` | `accepted` → `/ship prod`, which ships everything on `main` as the next version; `dev` → it waits for the accept, say so |
<!-- {{/qa}} -->

## 0. Which phase — before the first story

`git fetch -q --prune origin`, then read on `origin/main`:

1. **`vibe/prd/PRD.md`'s header *Status* is not `approved`** → **P1**: read
   `.claude/skills/plan/SKILL.md` and follow it from its §0, in this thread.
2. **P1 approved, and P2 is not** — any `vibe/specs/SPEC-<app>.md` missing for an app
   `vibe/TERMINOLOGY.md` §2 lists, or one of them, or `vibe/design/design.md`, not `approved` in its
   header → **P2**: `.claude/skills/design/SKILL.md`, from its §0.
3. Both approved → stories. `/pipeline` alone is §3.

`tasks/PHASES.md` is the phases' log, as a story's `log.md` is its own. **A story before P1 is
approved** is a chore or a spike only — requirement `none` — never a story that would name an
`FR-nnn`; say so and offer P1.

## 1. Which copy of a story to read

A story lives on `origin/features/{{PREFIX}}-<n>` before R5 and during a round, and on `origin/main`
after R5 (`tasks/{{PREFIX}}-<n>/`, or `tasks/shipped/{{PREFIX}}-<n>/` from `prod`).

1. **Both exist** → the branch's copy only when its `log.md` has strictly more entries; otherwise
   `main`'s (a tie is `main`'s). One log is always a prefix of the other. Only when `main`'s is
   strictly longer is the remote branch a leftover R5.3 missed: `git push origin --delete
   features/{{PREFIX}}-<n>`, say so.
2. **One exists** → read it (`git show origin/features/{{PREFIX}}-<n>:tasks/{{PREFIX}}-<n>/log.md`, or
   `main`'s).
3. A local `features/{{PREFIX}}-<n>` ahead of `origin/features/{{PREFIX}}-<n>` — only when that remote
   branch exists — is a session that stopped before pushing: push it, say so, then read it. With no
   remote branch and `R5: merged` in `main`'s round, a local branch is R8's to delete, never pushed.
4. Found nowhere → not a story; `/pipeline <description>` opens one.

**The status is `story.md`'s.** `tasks/INDEX.md` disagreeing is fixed by bookkeeping first.

## 2. Where a story is

Read `story.md`, `log.md` whole, and `plan.md` if it exists. **The current round** is the log
entries from the last `R7: notes`, `R9: reopened` or `R5: broken` heading, that heading included —
the whole log when there is none. Steps are matched in the round; **decision answers in the whole
log** — an answer holds for the story's life.

In order — the first row that holds:

| What the repo says | Continue at |
| --- | --- |
| Status `accepted` or `dropped…` with an `R7:` entry and no `R8: cleaned up` after it | R8 first — and for `dropped` with no `R7: dropped — …`, the rest of R7.3 before it |
| Status `prod`, or starts with `dropped` | nothing to do; say so |
<!-- {{#qa}} -->
| `qa` | done until production — the next is `/pipeline {{PREFIX}}-<n> ship` |
<!-- {{/qa}} -->
| `accepted` | the next is `/pipeline {{PREFIX}}-<n> ship` |
| `dev` | R6 — the call-back again, from the round's R4 rows and the dev URL |
| `blocked` | re-check what the round's log names. Cleared → log `R<k>: unblocked — …`, status `in progress`, and read on from the rows below. Not cleared → its Blocker table again, wait |
| `open` with no approval entry — or `open` or `in progress` with no `plan.md` | R1 |
| `open` with an approval entry, or `in progress` — then, within the round: | |
| — `R5: broken` with no `R5: dev restored` after it | `/run` R5.5.2 |
| — a decision whose **latest** R2 entry in the whole log is `refused`, with no `R1: plan` after it | R1 — re-plan without what the *no* ruled out |
| — a decision `plan.md` lists (a `### <area>: <decision>` block under *Decisions*) whose latest R2 entry is not `answered`. Keys match with backticks ignored | R2 — the cards again, wait |
| — a dev point not `done` in `plan.md` | R3, at the first such point |
| — no `R4: green` after the last `R3:` or `R5: conflict — back to R4` entry (an `R5: conflict — R4 holds` keeps the green before it) | R4 |
| — `R4: green`, no `R5: merged`, read from `main`'s copy | merged already: `gh pr list --head features/{{PREFIX}}-<n> --state merged --json number,mergeCommit,url --limit 1`, its `mergeCommit` an ancestor of `origin/main` → log `R5: merged`, continue at R5.4 |
| — `R4: green`, no `R5: merged`, read from the branch | R5 — unless a merged pull request's `headRefOid` is `git rev-parse origin/features/{{PREFIX}}-<n>`: then as the row above |
| — `R5: merged`, no `R5: on dev` | R5.4 |
| anything else | show the Status table and the round's last three log headings, and ask |

Then follow that skill from that step, with its §0 Load first. One line under the Status table says
what was found: *Picked up at R4 — every dev point done, last entry "R3: point 7".*

## 3. The stories in flight — `/pipeline` alone

Every story's `story.md` status, read from the copy §1 picks — `origin/main`'s `tasks/INDEX.md` for
the list of indexes, plus every `origin/features/{{PREFIX}}-*` branch. In flight: `open`, `in progress`,
`blocked`, `dev`, `accepted`. One table — index and title, status, the last log heading{{#qa}} — then
`qa` as a count{{/qa}}. Ask which. None in flight → offer the next story of the PRD's Stage 1 that has
none yet.

## Rules

1. **Never trust the thread over the repo.** If this thread remembers something the log does not
   hold, the log is incomplete: write the missing entry first, then continue.
2. **Every step logs, commits and pushes before the next starts**, so a session that dies mid-step
   leaves the log one step behind, never ahead. Then the decisions page (`/run` § *The phone*).
3. Reports follow `vibe/CLAUDE.md` *Talking to the user*.
