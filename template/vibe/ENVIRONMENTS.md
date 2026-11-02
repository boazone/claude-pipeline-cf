# Environments — what runs where

> **Terminology.** This document uses the locked vocabulary of [`TERMINOLOGY.md`](TERMINOLOGY.md).

**A version names a dev deploy.** Every `deploy:dev` of `main` cuts one — `vX.Y.Z`, written to
`VERSION` at the repo root, committed on `main` as bookkeeping before the build, and a git tag on
that commit once dev answers (`../code/apps/api/dev.mjs`) — so every build dev runs has a number,
every tag names a build dev ran, and the bar at the foot of every screen shows it beside the
environment: `DEV - v0.2.0`. **A ship cuts none**: `/ship` moves an `env/*` branch to the version
dev runs. A change is carried by its story index, `{{PREFIX}}-<n>`; a version carries what one dev
deploy brought — usually one story.

1. **The first is `v0.1.0`.** **Minor** when the deploy carries a story with a requirement
   (`FR-nnn` — `/run` R5 passes `--minor`), **patch** otherwise; **major** only on the user's word,
   by hand.
2. **A tag deploys nothing.** Workers Builds watches the `env/*` branches only.
3. **The bundle reads `VERSION`** at build time (`../code/apps/web/vite.config.ts`) — a committed
   file, so the laptop's dev build and Workers Builds' production build carry the same number without
   depending on the clone having the tags. A `--branch` deploy, a preview and a local build show the
   file as committed: the last version cut, not a new one. A `main` deploy with no change under
   `code/` since the latest version — `tasks/` bookkeeping — reuses it.
4. *Overturned (Baki, 2026-10-25):* **a version named a ship** — cut by `/ship` once the check
   passed, so every tag was a version that ran and passed, and a ship that stopped took no number. It
   left every dev build nameless and production unnumbered for as long as no ship happened; the
   number moved to the dev deploy, and the ship fast-forwards to one.

## The environments

| Environment | Domain | Branch behind it | Deployed by | Database |
|---|---|---|---|---|
| Local | `https://local.{{domain}}` (`{{local_ip}}`, mkcert TLS) — the user's | any | `npm run dev` in `code/`, on the user's request only | `{{name}}-local`, `--local` |
| Local, one per story — on request | `http://{{name}}-<n>.localhost:<8700 + n>` | `features/{{PREFIX}}-<n>` | `code/apps/api/wrangler.mjs dev --story <n>` — for a test that needs a server | a duplicate of local's state, in the story's worktree |
| Dev | `https://{{name}}-dev.{{dev_subdomain}}.workers.dev`, behind Access — the user by one-time code, the agent by service token | `main` | `npm run deploy:dev -w @{{name}}/api`, from the laptop, on the dev account's token — never Workers Builds; cuts the version first | `{{name}}-dev`, in the dev account |
| Preview, one per story | `https://{{name}}-<n>-{{name}}-dev.{{dev_subdomain}}.workers.dev`, behind dev's Access | `features/{{PREFIX}}-<n>` | `npm run preview:dev -w @{{name}}/api -- <n>`, by `/run` R4; `-- <n> --delete` at R8 | dev's; `{{name}}-preview-<n>`, a copy with the story's migration, when it carries one |
<!-- {{#qa}} -->
| QA | `https://qa.{{domain}}` | `env/qa` | a fast-forward of `env/qa` to `main` | `{{name}}-qa` |
<!-- {{/qa}} -->
| Production | `https://{{domain}}`{{#www}} (+ `www` redirect){{/www}} | `env/prod` | a fast-forward of `env/prod` to a version | `{{name}}-prod` |

**Dev is a Cloudflare account of its own.** The agent's token reaches that account and nothing in
the main one, and carries no Access permission, so the agent cannot lower the wall in front of dev.

## The branches

**Only the `env/*` branches deploy on a push.** Every other branch, `main` included, builds nothing,
and a pull request runs no checks — which is what makes `main` safe to merge into at any hour.

| Branch | What it is | How it moves |
|---|---|---|
| `main` | The truth. Every finished story is here, and dev runs it. | a squash-merged pull request |
<!-- {{#qa}} -->
| `env/qa` | The commit QA is running. The push **is** the QA deploy. | `/ship qa` fast-forwards it to the version dev runs — the latest `v*` tag |
| `env/prod` | The commit production is running. The push **is** the production deploy. | `/ship prod <version>` fast-forwards it to a version `env/qa` carried; a failed check moves it back to the previous one |
<!-- {{/qa}} -->
<!-- {{^qa}} -->
| `env/prod` | The commit production is running. The push **is** the production deploy. | `/ship prod` fast-forwards it to the version dev runs — the latest `v*` tag; a failed check moves it back to the previous one |
<!-- {{/qa}} -->
| `features/{{PREFIX}}-<n>` | One story, cut from `main` by `/open`, run by `/run` in its own worktree, squash-merged back by pull request on green, then deleted. | `/open`, `/run` |
| `hotfix/{{PREFIX}}-<n>` | A production fix that cannot wait. Cut from `env/prod`, shipped under a version of its own, merged back into `main`. | by hand, story first (`../tasks/README.md`) |

**Nothing is committed to `main` or an `env/*` branch directly** — they only ever receive a merge.
The one exception is bookkeeping on `main`: a changelog line, a status row, a log entry.

## Rules

1. **One deploy carries the whole system** — every app and the API are one Worker.
2. **Forward only.** Production runs a commit {{#qa}}QA verified{{/qa}}{{^qa}}dev ran and the user accepted{{/qa}}:
   a fast-forward, never a `wrangler deploy` from a laptop. A refused fast-forward is a finding and a
   stop. **The one move back:** a failed check on `{{domain}}` returns `env/prod` to the previous
   version, behind the guard.
3. **A deploy is a pipeline run, not an edit here.** `/ship` sets a story's status; a table row that
   disagrees with what is deployed is a bug in the row.
4. **A story reaching `dev` without its changelog lines is incomplete.**
5. **Long-lived branches are `main` and the `env/*` branches, and no others.** A story's remote
   branch is deleted the turn its pull request merges; its worktree, local branch and preview go
   after the user accepts it on dev (`/run` R8).
6. **A migration's SQL is approved once, before it runs anywhere** — at the story's decision card,
   which shows every statement and names every environment under *Applies to*. A ship applies it
   to production without asking again, an additive one before the push; production's database is
   bookmarked first (D1 Time Travel). A destructive or renaming one stops the ship and is asked for
   by name — its rollback loses every write since the bookmark.
7. **A story is evaluated on its own Worker Preview in the dev account** and confirmed on dev
   before the user is asked to accept it. `local.{{domain}}` runs only on the user's request; a
   story's own local check runs on its own server and state (`../code/README.md`).
