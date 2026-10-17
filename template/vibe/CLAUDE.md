# Project instructions

**{{PREFIX}}** — {{purpose}} `{{name}}` is the **technical name**; **{{marketing}}** is the
marketing name, on user-facing surfaces only (`TERMINOLOGY.md` §1).

{{description}}

**`TERMINOLOGY.md` is binding and outranks every other document, this one included.** Read it whole
before writing anything. A term not in it does not exist yet: propose it, get it confirmed, add it
there in the same turn.

## Where things live

```
{{name}}/
  CLAUDE.md         a signpost to this file — tools look for it at the root
  vibe/             every document. The LLM entry point. Paths in these documents are written from here.
  tasks/            one folder per story — story.md, plan.md, log.md. tasks/INDEX.md is the register.
  code/             the npm workspace — apps/, tools/. code/README.md is its map.
  .claude/skills/   pipeline — the one entry; plan · design · open · run · ship under it
```

Code never goes in `vibe/`; documents never go in `code/`. **Nothing this project produces is stored
outside the repo** — a document is written into `vibe/`, code into `code/`, and a published artifact
is registered in `RESOURCES.md`.

## Find the right file

Read what the row says and no more. Nothing here is read whole except `TERMINOLOGY.md`.

| You need | Read |
|---|---|
| what a thing is called | `TERMINOLOGY.md` — whole, always |
| what the product does; an `FR-nnn` / `NFR-nnn` | `prd/PRD.md` — grep the id or the §, read that section |
| why something is *not* built, and what brings it back | `BACKLOG.md` |
| a screen of an app — content, states, copy | `specs/SPEC-<app>.md` — the index at the top, then the § |
| how a screen looks | `design/design.md`, then `design/design-<app>.md` where it exists — it wins for its app |
<!-- {{#i18n}} -->
| any interface string, language, direction (RTL), plural, font, and the passes that check them | `reference/i18n-and-rtl.md` |
<!-- {{/i18n}} -->
| what we build with; domains, cookies | `TECH-STACK.md` |
| a table, column, migration, query | `prd/PRD.md` for the model; `reference/database-conventions.md` for the grammar — §2 naming, §8 migrations |
| environments, branches, what deploys | `ENVIRONMENTS.md` |
| what was set up on Cloudflare, GitHub and the machine, and what is left | `dev/SETUP.md` |
| the pipeline — each step's job and why it exists | `dev/PIPELINE.md` — the skills and `../tasks/README.md` are what runs |
| what production still needs before the next release | `dev/CHECKLIST-production.md` |
| what has shipped | `changelog/system.md` for users · `changelog/<app>.md` per app and every database change |
| where a story is | `../tasks/INDEX.md`, then `../tasks/{{PREFIX}}-<n>/` |
| the pipeline's gates, statuses and branches | `../tasks/README.md` |
| a published artifact's URL, an export, a known gap | `RESOURCES.md` |
| what waits on the user — decision cards, `blocked`, accepts, defaults | the decisions page, `DECISIONS.md` on the branch `decisions` — generated, never edited |

Create a document → add its row to this table the same turn.

## Precedence

`TERMINOLOGY.md` > `prd/PRD.md` > everything else. Within *everything else*: `TECH-STACK.md` for
what we build with, `reference/database-conventions.md` for database shape, `ENVIRONMENTS.md` for
environments and branches, and a `design-<app>.md` over `design/design.md` for its own app's
screens. Where two documents disagree, the lower one is wrong — fix it, and keep the overturned
argument in place rather than deleting it.

## The pipeline

**`/pipeline` is the one command.** With no PRD approved it runs **P1** (`/plan`): the PRD and
the terminology. With no specs and design approved it runs **P2** (`/design`). Then stories:

`/pipeline <description>` opens and runs a story → R1–R6, stopping only for a decision card → *the
user accepts it on dev* → `/pipeline <{{PREFIX}}-n> ship`. `/pipeline {{PREFIX}}-<n>` picks a story
up where its `log.md` left it — the repo is its only state, never memory.

1. **`main` is the trunk; dev runs it.** `env/prod` (and `env/qa`) are the deploys, each moved by
   fast-forward. A story is built on `features/{{PREFIX}}-<n>` cut from `main`, in its own
   worktree, evaluated on its own Worker Preview in the dev account —
   `https://{{name}}-<n>-{{name}}-dev.{{dev_subdomain}}.workers.dev` — then squash-merged into
   `main` by pull request and deployed to dev. Nothing is committed to `main` or `env/*` directly,
   apart from the pipeline's bookkeeping on `main` (`ENVIRONMENTS.md`).
2. **`/run`**: **R1** writes `plan.md` and flags the database, architecture and data flow, and
   security; **R2** shows one decision card per flagged decision and waits — nothing flagged, no
   stop; **R3** builds behind `verify`; **R4** deploys the preview, where a fresh evaluator checks
   every *Done when* line and three fresh reviews read the diff; **R5** merges on green and deploys
   dev; **R6** calls the user back — a dev link and instructions per line; **R7** the user accepts,
   sends notes, or drops; **R8** cleans up; **R9** reopens.
3. **A migration's SQL is approved once, at the decision card**, shown in full, and that answer
   carries it to the preview's copy, dev{{#qa}}, QA{{/qa}} and production.
4. A story is not `dev` without its changelog lines.
5. **The local database and `local.{{domain}}` are the user's.** No step of the pipeline runs
   there; `npm run dev` runs only when the user asks.

## Working style

- Ask the structural questions first, then spec, then wireframe. Number every list.
- **American English everywhere** — *color*, *center*, *behavior* — in prose, UI copy, identifiers
  and CSS.
- **Short, focused, technical.** Points over prose, one idea per point, nothing the reader already
  has.
- A decision given in chat is written into `prd/PRD.md` the same turn, with its consequences in the
  SPECs, the design documents, `TECH-STACK.md` and `BACKLOG.md`. A decision that lands only in the
  PRD is half-applied.
- When a decision overturns an argument already in a document, record the overturned argument; do
  not delete it.
- Every form field carries a one-line hint unless the label alone is unambiguous.
<!-- {{#i18n}} -->
- **Every string and layout is multi-language and multi-direction** — built and verified to
  `reference/i18n-and-rtl.md`: no string in a component, no `left`/`right` in CSS, the mirror pass
  and the length pass in the story's log.
<!-- {{/i18n}} -->
- Anything touching the database follows `reference/database-conventions.md`. A deviation is
  recorded where it is made, with the reason.
- **Paths.** In a `vibe/` document every path is written from `vibe/` — `prd/PRD.md`,
  `../tasks/INDEX.md`, `../code/apps/api`. Skills and `tasks/` write paths from the repo root.
- Publish an artifact or export a file → `RESOURCES.md`.
- Commit before any large rewrite.

## Talking to the user

The user reads results, not reasoning.

1. **A question or a message for the user starts with a heading** — `## For you: <what>`.
2. **A status with a call to action is tables**, in this order, each only when it has content.
   Every table has a bold title above it; a table the user answers carries, after its title, one
   line on what it is for and how to answer.
   1. **Status** — pivoted, one row per field: **Story** (index and title, linked) · **Status** ·
      **Step** · **Since last update**. Step is the whole path with the current one bold, in plain
      text: R1 Shape → **R2 Decide** → R3 Build → R4 Evaluate → R5 Merge → R6 Call-back → R7
      Accept → R8 Cleanup.
   2. **Blocker B<n> of <N>: <kind>** — one table per blocker, pivoted: **Waits for** · **Who
      acts** · **Decision** · the rows its kind needs · **Your action**, written as the reply that
      answers it (*reply **B1 approve***). **Everything needed to decide is in the table.** Text the
      user copies — a command, a value — goes in a fenced code block right under its table, one per
      command. A migration adds **What changes** · **Data affected** · **Reversible** · **Applies
      to** · **SQL**. A choice adds **Options**, numbered, the recommended one marked.
   3. **Links** — Title · Link.
   4. **Follow ups** — only in the report that closes the story: **#** · **Type** (bug / story) ·
      **What** · **Urgent** (1–5) · **Important** (1–5) · **T-shirt** · **Recommendation** (now ·
      fold in · soon · backlog · skip). Opening a follow up writes the story and stops — `/open`,
      never `--run`; the user runs it in a thread of its own.
3. **A story is approved from its summary, not from `story.md`.** Three tables, then its blocker:
   **Story** (pivoted: Story · What · Why · Apps · You'll check · Not in this story · Size),
   **Decisions I took** (# · Decision · Based on · To overturn), **Risks** (# · Risk · Impact ·
   Mitigation), then **Blocker B1: the story** — *reply **B1 approve**, or change a decision by its
   number*.
