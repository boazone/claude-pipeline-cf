# Tasks

Story tracking. One folder per story, Jira-style index, no external tracker. The `{{PREFIX}}-<n>`
carries a change; **a version names a ship** — `vX.Y.Z`, a git tag (`vibe/ENVIRONMENTS.md`).

```
tasks/
  INDEX.md          every story — index, title, requirement, apps, status. The register.
  SWEEP.md          bug candidates — production's errors and fatals by kind, written by the bug sweep
  REVIEW.md         the weekly review's findings — written by the routine, when there is one
  {{PREFIX}}-1/
    story.md        what is wanted and how we know it is done. Written at open; edited only until it runs.
    plan.md         the story broken into dev points, its flags and defaults. Written at R1.
    log.md          append-only record of the whole process, oldest first.
  shipped/
    {{PREFIX}}-1/   a story that reached production, moved here whole
```

## The pipeline

**`/pipeline` runs every stage below**, and before the first story, the two phases: **P1** `/plan` —
the PRD and the terminology, approved; **P2** `/design` — the specs and the design, approved.

| Stage | Command | Ends at |
| --- | --- | --- |
| 1 | `/open <description \| file.md>` | `story.md` and `log.md` on `features/{{PREFIX}}-<n>`, its `INDEX.md` row `open`, pushed, **stops**; `/open --run` goes straight on |
| 2 | *B1 approve* in the opening thread, or `/run {{PREFIX}}-<n>` | R1 Shape → R2 Decide → R3 Build → R4 Evaluate → R5 Merge → **R6 Call-back** on dev |
| 3 | the user's word on dev — *accepted*, notes, or *drop* | R7 Accept, then R8 Cleanup |
<!-- {{#qa}} -->
| 4 | `/ship qa` — every accepted story on `main`, as the next version | tagged, live and checked on `qa.{{domain}}` |
| 5 | `/ship prod <version>` | that version live and checked on `{{domain}}`, or rolled back |
<!-- {{/qa}} -->
<!-- {{^qa}} -->
| 4 | `/ship prod` — every accepted story on `main`, as the next version | tagged, live and checked on `{{domain}}`, or rolled back |
<!-- {{/qa}} -->

A bug is `/open --bug <description>`: reproduced on dev first and its root cause named at
`file:line`; not reproduced, no story. **Two stops: a decision card, and the accept.** Between R2 and
R6 the agent works alone, gated by machines. The merge does not wait for the user — it is R5, on
green — and the user judges the feature where it runs, on dev.

## The branches

```
features/{{PREFIX}}-<n>  ──PR──▶  main  ──deploy:dev──▶  dev
{{#qa}}                                 ──ff──▶  env/qa    deploys qa.{{domain}}
                                           └──ff──▶  env/prod  deploys {{domain}}
{{/qa}}{{^qa}}                                 ──ff──▶  env/prod  deploys {{domain}}
{{/qa}}
hotfix/{{PREFIX}}-<n>  ──PR──▶  env/prod  ──merge──▶  main
```

1. **`main` is the trunk.** Every story's pull request targets it. Nothing is committed to `main` or
   an `env/*` branch directly, but the pipeline's own bookkeeping — a changelog line, a status row, a
   log entry — which goes straight to `main`.
2. **One branch per story**, `features/{{PREFIX}}-<n>`, cut from `main`, its remote deleted at the
   merge. A new round after the merge (R7 notes, R9) cuts it again from `main`.
3. **A deploy is a fast-forward of an `env/*` branch**, and pushing it is what Workers Builds
   deploys. A refused fast-forward is a stop. The one move back is a rollback to the previous
   version, behind the guard.
4. **A production fix that cannot wait** is a **hotfix** — `hotfix/{{PREFIX}}-<n>`, a story like any
   other, run by hand with `/run`'s and `/ship`'s tools:
   1. **Open it** with `/open --bug`, reproduced on production; its `tasks/{{PREFIX}}-<n>/` is
      bookkeeping on `main` from the start, so the hotfix branch carries code only.
   2. **Cut from production**, in a worktree of its own: `git fetch origin && git checkout -B
      hotfix/{{PREFIX}}-<n> origin/env/prod`, pushed.
   3. **R1–R4 as `/run` does them**, on its preview.
   4. **Ship it on the user's word**: the production bookmark, the migration when it goes before, a
      pull request onto `env/prod` merged with `gh pr merge <pr> --squash` — the guard asks, since
      **the merge is the deploy** — then the quick check on `{{domain}}`, and the rollback if it fails.
   5. **Its version** is the patch above the one production ran, an annotated tag on `env/prod`'s
      new tip.
   6. **Back into `main`**: `git checkout -B merge-{{PREFIX}}-<n> origin/main && git merge
      origin/env/prod` — a **merge commit, never a squash**, or `env/prod` could never fast-forward
      to the next version — then a pull request merged with `gh pr merge <pr> --merge`, and the
      bookkeeping as `/ship prod` does it.

## Working copies

1. **The root checkout, `{{root}}`, stays on `main`.** It is never switched to a story branch. R5
   pulls it after the merge, and the worktree commands run there.
2. **One story, one branch, one worktree.** Git refuses a branch checked out twice, and that refusal
   names the worktree the story is in.
3. **No local server is part of the pipeline.** A story is evaluated on its Worker Preview;
   `local.{{domain}}` runs only when the user asks, and a story server only for a test that needs one.
4. **Bookkeeping never checks out `main`.** A doc-only commit is made on a throwaway branch and
   pushed straight to `main`: `git push origin HEAD:main`, fast-forward.
5. **Cleanup, after the accept** (R8): the preview and its database copy, then the worktree, the
   local branch and `git fetch --prune` — done, or queued when the harness refuses. Never a cleanup
   reported that did not happen.

## Status values

`open` → `in progress` → `dev` → `accepted` →{{#qa}} `qa` →{{/qa}} `prod`, plus `blocked` and `dropped`.

1. **`open`** — `story.md` written on the branch; `plan.md` may not exist yet.
2. **`in progress`** — `/run` has started: R1 to R5.
3. **`dev`** — merged into `main`, deployed to dev, the user called back. Holds the next ship until
   accepted.
4. **`accepted`** — the user accepted it on dev. Waiting for a ship.
<!-- {{#qa}} -->
5. **`qa`** — in a version on `qa.{{domain}}`.
<!-- {{/qa}} -->
6. **`prod`** — its version live on `{{domain}}`. The folder moves to `shipped/`.
7. **`blocked`** — names what it waits on, in `log.md`.
8. **`dropped`** — folder kept, index never reused.

## Rules

1. **An index is never reused.** The next index is one above the highest `{{PREFIX}}-<n>` on any
   branch or worktree — the folders and branch names are the register, there is no counter file.
2. **A story folder is never deleted.**
3. **`INDEX.md` is the register.** A folder with no row there is invisible; a row with no folder is a
   bug.
4. **`log.md` is append-only.** A wrong entry is corrected by a new entry, never by editing the old
   one.
5. **A migration's SQL is approved once, before it runs anywhere** — at the story's decision card.
6. **The local database and `local.{{domain}}` are the user's.** No step of the pipeline runs there.
7. **A commit that stages `code/` is refused while `npm run verify` is red.**

Process is in the skills. This file is the layout only.
