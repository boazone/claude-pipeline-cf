---
name: plan
description: P1 of {{PREFIX}} — write the PRD and the terminology with the user, one question at a time, and stop for the approval. `/plan` starts it or picks it up where tasks/PHASES.md left it; `/plan approve` (or B1 approve) approves it. Reached through `/pipeline` while vibe/prd/PRD.md is not approved. Use for "plan", "PRD", "requirements", "terminology", "what are we building".
---

# plan — P1

The first stop of the project: **`vibe/prd/PRD.md` and `vibe/TERMINOLOGY.md`, approved by the
user.** Everything later derives from them — the specs, the design, every story's requirement — so
nothing after is written on unapproved words.

**The repo is the state.** Each answer is written into the documents the turn it is given, logged in
`tasks/PHASES.md`, committed and pushed. A session that resumes reads the documents and the log, and
asks the next question — never one already answered.

## 0. Load

1. `vibe/TERMINOLOGY.md`, `vibe/CLAUDE.md` (*Working style*, *Talking to the user*), `vibe/prd/PRD.md`.
2. `tasks/PHASES.md` — whole; it may not exist yet.
3. **Where to write.** The root checkout, `{{root}}`, stays on `main`; in it, `git fetch origin` and
   `git worktree add --detach .claude/worktrees/plan origin/main`, and work there. In a worktree the
   app made: `git fetch origin && git checkout --detach origin/main`. **Every commit is
   bookkeeping on `main`**: documents only, nothing under `code/`, pushed with
   `git push origin HEAD:main` (`tasks/README.md` *Working copies* 4).

## 1. Close what the documents already answer

`vibe/CLAUDE.md`'s first paragraph, the PRD's §1 and `TERMINOLOGY.md` §1–§2 were written by `/start`
from the user's answers. Read them as answers, and do not ask them again. **Before the first
question**, one line per thing already settled and where it came from.

## 2. Ask — one question at a time

Each a message of its own, `## For you: <question>`, the question only, numbered, options only when
they are the whole space, a recommended one marked. A default the user can accept with one word
beats an open question. In this order, skipping what is answered:

1. **The users** — who uses the system, and what each kind of user is called. Each becomes a
   **role** in `TERMINOLOGY.md` §3: one word, what it may do. Never two words for one role.
2. **The nouns** — the things the product is about. Each becomes a term in §4, one line each. A
   synonym the user offers is a retired word in §5.
3. **The problem and the goals** — PRD §1 and §3: what is wrong today, what success looks like, and
   what is deliberately not a goal.
4. **The requirements, area by area** — PRD §4. Propose them, in the terms just locked: `FR-<area><nn>`,
   one line each with its acceptance in a sentence; the user cuts, adds or rewrites. One area per
   question.
5. **The non-functional requirements** — PRD §5: performance on a phone, availability, privacy,
   accessibility, cost ceilings.
<!-- {{#i18n}} -->
   **The languages**: the day-one set, which one is right-to-left, whether a language ships whole
   or not at all — into PRD §5 and `vibe/reference/i18n-and-rtl.md` §1.
<!-- {{/i18n}} -->
6. **The stages** — PRD §6: what Stage 1, the first production release, holds; the rest to
   `vibe/BACKLOG.md` with what would bring it back.
7. **The data model** — PRD §7: the tables the requirements imply, in the grammar of
   `vibe/reference/database-conventions.md`. Proposed, not asked line by line; the user answers the
   one or two choices that are really theirs (what is deleted, what is shared between users).

**Every answer, the same turn:** written into the PRD and `TERMINOLOGY.md` (a new word goes in
`TERMINOLOGY.md` first), its consequence in `vibe/BACKLOG.md` when it rules something out, then
`## YYYY-MM-DD — P1: <what> — "<the user's words>"` appended to `tasks/PHASES.md`, committed
`P1 — <what>`, pushed. A question the user cannot answer yet goes under PRD §8 *Open questions* and
does not block the next one.

## 3. Stop — the approval

When every section has content and §8 holds nothing that blocks Stage 1, one message,
`## For you: the PRD is ready`:

1. **The product** — pivoted: **What** (one line) · **For** (the roles) · **Stage 1** (what ships
   first, one line) · **Requirements** (the count per area) · **Not in Stage 1** · **Open**.
2. **Words locked** — the roles and the nouns, one row each: **Term** · **Means** · **Never**.
3. **Decisions I took** — **#** · **Decision** · **Based on** · **To overturn**.
4. **Blocker B1: the PRD** — *reply **B1 approve**, or change anything by its number or section*.

Before it: the push notification (`run` § *The phone*), and the decisions page.

- **B1 approve** → the PRD's header: *Status* `approved`, *Approved* `YYYY-MM-DD — "<words>"`;
  `TERMINOLOGY.md`'s *Status* `locked YYYY-MM-DD`, its changelog row; `P1: approved — "<words>"` in
  `tasks/PHASES.md`; commit, push. Then straight on to P2: read `.claude/skills/design/SKILL.md` and
  follow it from its §0, in this thread.
- **A change** → written, logged, committed, pushed, and the stop again.

## Rules

1. **Do not invent scope.** A requirement the user did not give or accept is not in the PRD.
2. **Product, not build.** How a thing is built is R1's at the story; the PRD says what the system
   does and for whom.
3. **The words win.** A term used before it is in `TERMINOLOGY.md` is a bug in the turn that used it.
