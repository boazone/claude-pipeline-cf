---
name: design
description: P2 of {{PREFIX}} — write a spec per app and the design documents with the user, one question at a time, stop for the approval, then propose the first stories. `/design` starts it or picks it up where tasks/PHASES.md left it. Reached through `/pipeline` once the PRD is approved and the specs or the design are not. Use for "design", "spec", "screens", "wireframe", "look and feel".
---

# design — P2

The second stop: **one `vibe/specs/SPEC-<app>.md` per app, and `vibe/design/design.md`** — plus a
`vibe/design/design-<app>.md` for an app whose look differs — **approved by the user.** A story's
*Done when* lines and the evaluator's checks are read against these, so a screen not in a spec is a
screen nobody can accept.

## 0. Load

1. `vibe/TERMINOLOGY.md` — binding. `vibe/CLAUDE.md`. `vibe/prd/PRD.md` — approved; read whole once.
2. `tasks/PHASES.md`, and every spec and design document that exists.
<!-- {{#i18n}} -->
3. `vibe/reference/i18n-and-rtl.md` — every screen is written for several languages and both
   directions from the first line.
<!-- {{/i18n}} -->
4. **Where to write** — as `/plan` §0.3: bookkeeping on `main`, documents only.

## 1. The specs — per app, in Stage 1 order

One file per app in `TERMINOLOGY.md` §2, `vibe/specs/SPEC-<app>.md`, headed with a *Status* row
(`draft`) and an index of its screens. Per screen, a section:

1. **What it is for**, and the requirements it serves (`FR-nnn`).
2. **What it shows** — content, in order, in the words of `TERMINOLOGY.md`.
3. **Its states** — empty, loading, error, offline, not allowed — each with its copy.
4. **What the user can do** — each control, its hint, and where it leads.
5. **The copy** — every string on it, in English{{#i18n}}, written 2× longer than it will fit{{/i18n}}.

**Propose, then ask.** Draft the app's screen list from the PRD and ask *one* question to confirm
it; then each screen drafted and shown, the user's changes taken, one screen per question.

## 2. The design

`vibe/design/design.md` — the visual language, for every app, written before any screen is built:

1. **The feel** — ask first: a reference the user likes (a site, an app, a picture), light or dark
   or both, dense or airy, the brand colors if any. One question.
2. **Tokens** — color (with dark mode when asked), type scale, spacing, radius, elevation. Named,
   never raw values in a component.
3. **The component library** — one, or none; a decision the user takes on a recommendation, written
   with what it rules out.
4. **Components** — buttons, fields, lists, sheets, empty states: how each looks and behaves.
5. **Accessibility** — contrast, targets of at least 44px, focus rings, motion.
<!-- {{#i18n}} -->
6. **Direction** — what mirrors and what does not (`reference/i18n-and-rtl.md` §5–§7).
<!-- {{/i18n}} -->

A `design-<app>.md` only for an app whose look departs from it (an internal desktop admin app,
usually); it derives from `design.md` and wins for its app's screens. **Wireframes are artifacts
only when the user asks**, registered in `vibe/RESOURCES.md`.

**Every answer, the same turn:** written, `## YYYY-MM-DD — P2: <what> — "<the user's words>"` in
`tasks/PHASES.md`, committed `P2 — <what>`, pushed. A new word goes in `TERMINOLOGY.md` first; a
change to what the product does goes in the PRD with its consequences.

## 3. Stop — the approval

One message, `## For you: the design is ready`:

1. **Per app** — **App** · **Screens** (the count, and the list) · **Spec** (its link).
2. **The look** — pivoted: **Feel** · **Library** · **Colors** · **Type** · **Dark mode**.
3. **Decisions I took** — **#** · **Decision** · **Based on** · **To overturn**.
4. **Blocker B1: the design** — *reply **B1 approve**, or change anything by its number*.

- **B1 approve** → every spec's and design document's *Status* `approved YYYY-MM-DD`;
  `P2: approved — "<words>"` in `tasks/PHASES.md`; their rows in `vibe/CLAUDE.md`'s table; commit,
  push. Then §4.
- **A change** → written, logged, pushed, and the stop again.

## 4. The first stories

Stage 1 as stories, in the order they can be built — each one change a user can see on dev, the
first being the thinnest path through the main flow. One table, **Proposed stories**: **#** ·
**Story** (one line) · **Requirement** · **Apps** · **After** (the numbers it needs first) ·
**T-shirt**. Its title line: *Reply with the numbers to open — each is written and stopped, to run in
a thread of its own — or `all`.*

Each chosen one is `/open <its line>` — written, pushed, stopped; never `--run`. Then
`## For you: <k> stories open`, with each one's `/pipeline {{PREFIX}}-<n>` to paste in a new
session.
