---
name: ship
<!-- {{#qa}} -->
description: Ship {{PREFIX}} to QA or production — `/ship qa` moves `env/qa` to the version dev runs, applies the approved migrations and checks `qa.{{domain}}`; `/ship prod v0.3.1` takes a version QA passed to `{{domain}}` behind a D1 bookmark, and rolls back if its check fails. The command is the approval: a regular ship runs without a question and stops only at something unusual. Use for "ship", "deploy to QA", "release to production", "promote".
<!-- {{/qa}} -->
<!-- {{^qa}} -->
description: Ship {{PREFIX}} to production — `/ship prod` moves `{{domain}}` to the version dev runs, behind a D1 bookmark, checks it, and rolls back if its check fails. The command is the approval: a regular ship runs without a question and stops only at something unusual. Use for "ship", "deploy", "release to production".
<!-- {{/qa}} -->
---

# ship

The deployers of `vibe/dev/PIPELINE.md` §5.

| Form | Does |
| --- | --- |
<!-- {{#qa}} -->
| `/ship qa` | D1 — everything on `main` since the last QA ship, at the version dev runs |
| `/ship qa {{PREFIX}}-<n> …` | D1, shipping the named stories although they are not `accepted` |
| `/ship prod <version>` | D3 — that version, one QA passed, to production |
<!-- {{/qa}} -->
<!-- {{^qa}} -->
| `/ship prod` | D3 — everything on `main` since the last ship, at the version dev runs |
| `/ship prod {{PREFIX}}-<n> …` | D3, shipping the named stories although they are not `accepted` |
<!-- {{/qa}} -->

**A version** is a git tag, `vX.Y.Z`, cut by `deploy:dev` on every dev deploy of `main` (`/run`
R5, `vibe/ENVIRONMENTS.md`). **A ship cuts none**: it moves an `env/*` branch to a version's commit
— what dev runs and the user accepted — so {{#qa}}QA, {{/qa}}production and dev show the same number
in the bar at the foot of every screen. The story index still names a change.

1. **The version** is the latest `v*` tag on `origin`; its commit is an ancestor of `origin/main`,
   and what follows it on `main` is `tasks/` bookkeeping only, which the next version carries.
2. **No tag at all** — nothing was ever deployed to dev — is a stop: `/run` a story, or
   `npm run deploy:dev -w @{{name}}/api` from `origin/main` cuts the first.
3. **Moving an `env/*` branch is the deploy.** Workers Builds watches those branches only; a tag
   deploys nothing, and nothing here runs `wrangler deploy`.
4. **A stop is said in the session** under `## For you: <ship> stopped`, with the Status table and a
   Blocker table (`vibe/CLAUDE.md` *Talking to the user*), and pushed right before it.
5. **`<sha>` is always a commit** — `git rev-parse "<ref>^{commit}"`; a tag is annotated, and its
   own sha matches no branch, lease or check run.
6. **The ship command is the approval.** A regular ship runs from the gate to the record without a
   question: the bookmark, the migrations, the push, the check. It stops only at **something
   unusual** — and asks for that one thing by name:
   1. a gate line that fails (*The gate*);
   2. a pending migration not approved at a decision card, changed since, or destructive or
      renaming — its rollback loses every write since the bookmark;
   3. a refused fast-forward, a missing or failed build, a migration that fails or applies in part;
   4. a checklist row whose *Check* fails or cannot be run;
   5. code on `main` past the version, a version whose commit is not on `main`, anything in the
      range the stories do not explain.

   Only the two regular steps pass the guard on their own — production's migrations apply and the
   push of a version tag to `env/prod`, each as the one command written below, nothing around it.
   Anything else that changes production — a restore, raw SQL, the rollback — still asks.

## 0. Load

1. `vibe/TERMINOLOGY.md`, `vibe/ENVIRONMENTS.md`; for `prod`, `vibe/dev/CHECKLIST-production.md`
   whole.
2. **A worktree, never the root checkout**: `git fetch origin --tags --prune`, then
   `git -C {{root}} worktree add --detach .claude/worktrees/ship <ref>` — or, when it exists,
   `git -C <it> checkout --detach <ref>`. `<ref>` is **the version**:{{#qa}} for `qa`,{{/qa}}
   `git describe --tags --abbrev=0 --match 'v*' origin/main` — the latest tag reachable from
   `main`{{#qa}}; for `prod`, `<version>^{commit}`, the one named in the command{{/qa}}. wrangler
   applies the migration files of the tree it runs in, so the environment gets the version's, never
   `main`'s. Every time: `npm ci` in `code/`.
3. **The stories** of the ship: every `{{PREFIX}}-<n>` in the subjects of the range —
   {{#qa}}`origin/env/qa..HEAD` for `qa`, `origin/env/prod..HEAD` for `prod`{{/qa}}{{^qa}}`origin/env/prod..HEAD`{{/qa}} — and for
   each, `tasks/{{PREFIX}}-<n>/story.md` and `log.md` on `origin/main`.
4. **Waiting for a build** — Workers Builds' check run on the commit, every 30 s, up to 15 minutes;
   no check run by then, or a failure, is a stop:

   ```bash
   gh api "repos/{{gh_owner}}/{{name}}/commits/<sha>/check-runs" --jq '.check_runs[] | [.name,.status,.conclusion] | @tsv'
   ```

## The migrations — every ship

1. **Pending** — `npx wrangler d1 migrations list <db> -c apps/api/wrangler.jsonc --env <env>
   --remote` from `code/` ({{#qa}}`{{name}}-qa`/`qa`, {{/qa}}`{{name}}-prod`/`production`). Every file pending there
   is named in a story's `R2: … Database: … answered` entry, for that exact file, unchanged since.
   One that is not is a stop. When the login sees more than one account, wrangler's `migrations
   list` ignores `account_id` and refuses: prefix it with `CLOUDFLARE_ACCOUNT_ID=<wrangler.jsonc's
   top-level account_id>`.
2. **The order** — wrangler applies every pending file at once. All additive (a table, a nullable
   column, an index) → **before** the push, without a question. Any destructive or renaming one →
   **after** the push, so the old code never reads a shape that is gone — and a stop first, asking
   for that migration by name (rule 6.2). A ship carrying both is a stop: the user splits it.
3. **Apply** — exactly this line, from `code/`, alone in its call (with the `CLOUDFLARE_ACCOUNT_ID=`
   prefix when 1 needed it) — and report what it printed:

   ```bash
   npx wrangler d1 migrations apply <db> -c apps/api/wrangler.jsonc --env <env> --remote
   ```

## The gate — stop on the first that fails

1. **Every story on `main` is accepted.** Each story of the range by its status on `origin/main`:
   `accepted` ships; {{#qa}}`qa`, {{/qa}}`prod` and `dropped…` ride along. Any other — `dev`, `in progress`,
   `blocked`, `open` — **refuses, naming each** with its status and its last log heading. A story
   the user names in the command ships anyway; its log gets `D1: shipped anyway — "<words>"`.
2. **Every decision answered** — each shipped story's latest `R2:` entry per decision is `answered`.
3. **Commits with no index** are listed under their own heading and ride along.
4. **The migrations** are approved (*The migrations* 1).
5. **The environment has its configuration** — every secret, binding, route or console setting a
   story of the range names in its `plan.md`, and for production every open row of
   `vibe/dev/CHECKLIST-production.md` whose *From* is a story of the ship, done and struck through
   there first. The agent runs each row's *Check* itself; one that passes is struck through and
   dated, one that fails or cannot be run from here is a stop (rule 6.4).
6. **`npm run verify` passes** in `code/`.
7. **The version is `main`'s latest build** — `git diff --stat HEAD origin/main -- code` prints
   nothing. Code on `main` past the version is a deploy to dev that never happened — a hotfix merged
   back, `tasks/README.md` *The branches* 4.6: `deploy:dev` from `origin/main` cuts its version,
   then this from §0 (rule 6.5).

<!-- {{#qa}} -->
## D1 — `/ship qa`

After the gate:

1. **Note where QA is**: `git rev-parse origin/env/qa` — the commit to go back to.
2. **The release note — said, not asked**: the version QA moves to; one line per story in the words
   of `vibe/changelog/system.md`; the migrations, each with whether it is reversible; commits with no
   index. Then straight on.
3. The migrations, when they go before the push. A partial apply is a stop — never a push on a
   half-migrated database.
4. **The push** — git refuses anything but a fast-forward, which is the point:

   ```bash
   git push origin "<version>^{commit}:env/qa"
   ```

   Refused → **stop**: `env/qa` holds something `main` does not; show `git log
   origin/main..origin/env/qa`. Never force.
5. The build (§0.4); then the migrations, when they go after the push — once the user answered the
   stop that named them.
6. **Check QA**, from `code/`: `{{NAME}}_BASE_URL=https://qa.{{domain}} npx playwright test -c apps/web/browser public.spec`,
   then each shipped story's lines that need no sign-in, as specs in `code/apps/web/browser/eval/`.
   Every other line is **the user's at D2**, named in the report. A failure stops the ship: QA as it
   is, each story's log `D1: failed — <sha>, <what>`; the user decides — QA back to the commit
   noted (`git push --force-with-lease=env/qa:<sha> origin <noted sha>:env/qa`) or a fix forward.
7. **Record — bookkeeping on `main`**, on a throwaway branch off `origin/main`, pushed with
   `git push origin HEAD:main`: each shipped story's changelog lines from `## Not shipped` to
   `## Shipped` under `### <version> — QA YYYY-MM-DD`; status `qa` in `story.md` and
   `tasks/INDEX.md`; `## YYYY-MM-DD — D1: qa <version>` in each `log.md` — the sha, the build, the
   migration and what it printed, what was checked, the lines left for D2; `npm run sweep` from
   `code/`, its file in this commit (a failure is its first line, never a stop).
8. **Report**: the version, `https://qa.{{domain}}`, what was checked, the lines for D2 — and that
   production is `/ship prod <version>`.

<!-- {{/qa}} -->
## D3 — `/ship prod{{#qa}} <version>{{/qa}}`

### 1. The range

<!-- {{#qa}} -->
1. **QA passed that version** — the tag exists and `env/qa` carried it:
   `git merge-base --is-ancestor "<version>^{commit}" origin/env/qa`.
2. **It moves `env/prod` forward**: `git merge-base --is-ancestor origin/env/prod
   "<version>^{commit}"`. A version older than production is a stop.
3. **The release is** `git log origin/env/prod..<version> --oneline` — show it, under the version.
   Each story in it is `qa` with a `D1: qa` entry. A story reopened since ships the code QA ran and
   not its fix: name it; the user decides.
4. *The gate* 2, 4 and 5, for production.
<!-- {{/qa}} -->
<!-- {{^qa}} -->
1. *The gate*, whole, on `origin/main`.
2. **The release is** `git log origin/env/prod..HEAD --oneline` — show it, under the version.
<!-- {{/qa}} -->

### 2. The release note — said, not asked

One message, then straight on to §3: the version production moves to; one line per story in the
words of `vibe/changelog/system.md`; the migrations, each with whether it is reversible; commits
with no index; and **what the user checked**{{#qa}} — each story's D2 lines on QA{{/qa}}{{^qa}} — each story's
accept on dev{{/qa}}. **The ship command was the approval** (rule 6): its words, verbatim, go in each
story's `log.md` as `D2: checked — "<the command>"`, committed and pushed before §3. A stop in §1
comes before this message, never after it.

### 3. The bookmark, the migration, the deploy

1. **The previous version** — `git describe --tags --exact-match origin/env/prod`, or its sha
   before the first version; note it, and `git rev-parse origin/env/prod`.
2. **The bookmark** — before any migration, D1 Time Travel's restore point, logged:

   ```bash
   npx wrangler d1 time-travel info {{name}}-prod -c apps/api/wrangler.jsonc --env production
   ```

   No `d1 export` file — it would hold users' data outside the repo.
3. The migrations, when they go before the push — the one line of *The migrations* 3.
4. **The deploy** — the version tag, exactly this line, alone in its call; it is the form the guard
   lets through, and no `--force` ever:

   ```bash
   git push origin "<version>^{commit}:env/prod"
   ```

   Refused → **stop**: `env/prod` holds what was never shipped — `git log
   {{#qa}}origin/env/qa{{/qa}}{{^qa}}origin/main{{/qa}}..origin/env/prod`. Never force. Then the build (§0.4).
5. The migrations, when they go after the push — once the user answered the stop that named them.

**A migration that fails or applies in part** → restore the bookmark (the guard asks); after the
push, roll `env/prod` back too (§4). Stop, report:

```bash
npx wrangler d1 time-travel restore {{name}}-prod -c apps/api/wrangler.jsonc --env production --bookmark=<bookmark>
```

### 4. Check production

```bash
{{NAME}}_BASE_URL=https://{{domain}} npx playwright test -c apps/web/browser public.spec
```

{{#www}}and `www.{{domain}}` redirects to the apex. {{/www}}**A failure rolls back** — `env/prod` to the previous
version, the guard asking; Workers Builds deploys it like any ship:

```bash
git push --force-with-lease=env/prod:<the deployed sha> origin <previous sha>:env/prod
```

**The code never goes back alone onto a schema it cannot read**: a release that applied a
destructive or renaming migration restores the bookmark as well — every write since it is lost, and
the report says so. An additive one stays; the previous code ignores what it does not know.

Then the build, the quick check again, and a bug story — `/open --bug <what failed on {{domain}},
and the failed check's output>`, written and stopped. Each story's log gets `D3: rolled back to
<previous> — <what>`. §5 does not run. The quick check failing again after the rollback is an
incident — said at once, no further push; the user decides.

### 4b. The version

Nothing to cut: production now runs `<version>`, the tag `deploy:dev` cut when dev took this
commit. `git describe --tags --exact-match origin/env/prod` prints it.

### 5. Record — bookkeeping on `main`

On a throwaway branch off `origin/main`, pushed with `git push origin HEAD:main`:

1. **The changelogs** — {{#qa}}` · production YYYY-MM-DD` added to the version's heading in each{{/qa}}{{^qa}}each
   shipped story's lines from `## Not shipped` to `## Shipped`, under `### <version> — production
   YYYY-MM-DD`{{/qa}}.
2. **Status `prod`** in each story's `story.md`; its row leaves `tasks/INDEX.md`, and its folder
   moves whole to `tasks/shipped/` (`git mv`).
3. **Each story's `log.md`**, before the move — `## YYYY-MM-DD — D3: prod <version>`: the sha, the
   bookmark, the migration and what it printed, the check, the ship command that approved it.
4. **The bug sweep** — `npm run sweep` from `code/`, its file in this commit. A failure is its first
   line, never a stop.
5. **Report**: what is live, `https://{{domain}}`, and what sits on `main` unreleased.
