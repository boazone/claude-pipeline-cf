---
name: ship
<!-- {{#qa}} -->
description: Ship {{PREFIX}} to QA or production — `/ship qa` moves `env/qa` to `main`, applies the approved migrations, checks `qa.{{domain}}`, and tags what passed as the next version; `/ship prod v0.3.1` takes a version QA passed to `{{domain}}` behind a D1 bookmark and the production guard, and rolls back if its check fails. Use for "ship", "deploy to QA", "release to production", "promote", "cut a version".
<!-- {{/qa}} -->
<!-- {{^qa}} -->
description: Ship {{PREFIX}} to production — `/ship prod` takes every accepted story on `main` to `{{domain}}` behind a D1 bookmark and the production guard, checks it, tags what passed as the next version, and rolls back if its check fails. Use for "ship", "deploy", "release to production", "cut a version".
<!-- {{/qa}} -->
---

# ship

The deployers of `vibe/dev/PIPELINE.md` §5.

| Form | Does |
| --- | --- |
<!-- {{#qa}} -->
| `/ship qa` | D1 — everything on `main` since the last QA ship, as the next version |
| `/ship qa {{PREFIX}}-<n> …` | D1, shipping the named stories although they are not `accepted` |
| `/ship prod <version>` | D3 — that version, one QA passed, to production |
<!-- {{/qa}} -->
<!-- {{^qa}} -->
| `/ship prod` | D3 — everything on `main` since the last ship, as the next version |
| `/ship prod {{PREFIX}}-<n> …` | D3, shipping the named stories although they are not `accepted` |
<!-- {{/qa}} -->

**A version** is a git tag, `vX.Y.Z`, on a commit that ran and passed its check. It names a ship,
which carries several stories; the story index still names a change (`vibe/ENVIRONMENTS.md`).

1. **The first is `v0.1.0`.** Then **minor** when the ship carries a story whose *Requirement*
   names an `FR-nnn`, **patch** otherwise. **Major** only on the user's word.
2. **The tag is cut once the check passed** — so every tag is a version that ran and passed, and a
   ship that stops has no number; the next one takes it.
3. **Moving an `env/*` branch is the deploy.** Workers Builds watches those branches only; a tag
   deploys nothing, and nothing here runs `wrangler deploy`.
4. **A stop is said in the session** under `## For you: <ship> stopped`, with the Status table and a
   Blocker table (`vibe/CLAUDE.md` *Talking to the user*), and pushed right before it.
5. **`<sha>` is always a commit** — `git rev-parse "<ref>^{commit}"`; a tag is annotated, and its
   own sha matches no branch, lease or check run.

## 0. Load

1. `vibe/TERMINOLOGY.md`, `vibe/ENVIRONMENTS.md`; for `prod`, `vibe/dev/CHECKLIST-production.md`
   whole.
2. **A worktree, never the root checkout**: `git fetch origin --tags --prune`, then
   `git -C {{root}} worktree add --detach .claude/worktrees/ship <ref>` — or, when it exists,
   `git -C <it> checkout --detach <ref>`. `<ref>` is {{#qa}}`origin/main` for `qa`, and
   **`<version>^{commit}` for `prod`** — wrangler applies the migration files of the tree it runs
   in, and production gets the version's, never `main`'s{{/qa}}{{^qa}}`origin/main`{{/qa}}. Every time:
   `npm ci` in `code/`.
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
   One that is not is a stop.
2. **The order** — wrangler applies every pending file at once. All additive (a table, a nullable
   column, an index) → **before** the push. Any destructive or renaming one → **after** the push, so
   the old code never reads a shape that is gone. A ship carrying both is a stop: the user splits it.
3. **Apply**, and report what it printed:

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
   there first. The user confirms each.
6. **`npm run verify` passes** in `code/`.

<!-- {{#qa}} -->
## D1 — `/ship qa`

After the gate:

1. **Note where QA is**: `git rev-parse origin/env/qa` — the commit to go back to.
2. The migrations, when they go before the push. A partial apply is a stop — never a push on a
   half-migrated database.
3. **The push** — git refuses anything but a fast-forward, which is the point:

   ```bash
   git push origin HEAD:env/qa
   ```

   Refused → **stop**: `env/qa` holds something `main` does not; show `git log
   origin/main..origin/env/qa`. Never force.
4. The build (§0.4); then the migrations, when they go after the push.
5. **Check QA**, from `code/`: `{{NAME}}_BASE_URL=https://qa.{{domain}} npx playwright test -c apps/web/browser public.spec`,
   then each shipped story's lines that need no sign-in, as specs in `code/apps/web/browser/eval/`.
   Every other line is **the user's at D2**, named in the report. A failure stops the ship: no
   version, QA as it is, each story's log `D1: failed — <sha>, <what>`; the user decides — QA back
   to the commit noted (`git push --force-with-lease=env/qa:<sha> origin <noted sha>:env/qa`) or a
   fix forward.
6. **Cut the version** — `git tag --list "v*" --sort=-v:refname | head -1`; none → `v0.1.0`, else the
   next by the rule above:

   ```bash
   git tag -a <version> HEAD -m "<version> — {{PREFIX}}-<a>, {{PREFIX}}-<b>"
   git push origin <version>
   ```

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
3. **The release is** `git log origin/env/prod..<version> --oneline` — show it. Each story in it is
   `qa` with a `D1: qa` entry. A story reopened since ships the code QA ran and not its fix: name
   it; the user decides.
4. *The gate* 2, 4 and 5, for production.
<!-- {{/qa}} -->
<!-- {{^qa}} -->
1. *The gate*, whole, on `origin/main`.
2. **The release is** `git log origin/env/prod..origin/main --oneline` — show it.
<!-- {{/qa}} -->

### 2. The release approval

One message: {{#qa}}the version{{/qa}}{{^qa}}the version it will take{{/qa}}; one line per story in the words
of `vibe/changelog/system.md`; the migrations, each with whether it is reversible; commits with no
index; and **what the user checked**{{#qa}} — each story's D2 lines on QA{{/qa}}{{^qa}} — each story's accept on
dev{{/qa}}. **Wait for an explicit approval of the release** — logged verbatim in each story's `log.md`
as `D2: checked — "<words>"`.

### 3. The bookmark, the migration, the deploy

1. **The previous version** — `git describe --tags --exact-match origin/env/prod`, or its sha
   before the first version; note it, and `git rev-parse origin/env/prod`.
2. **The bookmark** — before any migration, D1 Time Travel's restore point, logged:

   ```bash
   npx wrangler d1 time-travel info {{name}}-prod -c apps/api/wrangler.jsonc --env production
   ```

   No `d1 export` file — it would hold users' data outside the repo.
3. The migrations, when they go before the push — the guard asks.
4. **The deploy**, behind the guard:

   ```bash
   git push origin "{{#qa}}<version>^{commit}{{/qa}}{{^qa}}HEAD{{/qa}}:env/prod"
   ```

   Refused → **stop**: `env/prod` holds what was never shipped — `git log
   {{#qa}}origin/env/qa{{/qa}}{{^qa}}origin/main{{/qa}}..origin/env/prod`. Never force. Then the build (§0.4).
5. The migrations, when they go after the push.

**A migration that fails or applies in part** → restore the bookmark (the guard asks); after the
push, roll `env/prod` back too (§4). Stop, report:

```bash
npx wrangler d1 time-travel restore {{name}}-prod -c apps/api/wrangler.jsonc --env production --bookmark=<bookmark>
```

### 4. Check production

```bash
{{NAME}}_BASE_URL=https://{{domain}} npx playwright test -c apps/web/browser public.spec
```

and `www.{{domain}}` redirects to the apex. **A failure rolls back** — `env/prod` to the previous
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

<!-- {{^qa}} -->
### 4b. Cut the version

The check passed: `git tag --list "v*" --sort=-v:refname | head -1`; none → `v0.1.0`, else the next
by the rule above, on the commit production now runs:

```bash
git tag -a <version> HEAD -m "<version> — {{PREFIX}}-<a>, {{PREFIX}}-<b>"
git push origin <version>
```

<!-- {{/qa}} -->
### 5. Record — bookkeeping on `main`

On a throwaway branch off `origin/main`, pushed with `git push origin HEAD:main`:

1. **The changelogs** — {{#qa}}` · production YYYY-MM-DD` added to the version's heading in each{{/qa}}{{^qa}}each
   shipped story's lines from `## Not shipped` to `## Shipped`, under `### <version> — production
   YYYY-MM-DD`{{/qa}}.
2. **Status `prod`** in each story's `story.md`; its row leaves `tasks/INDEX.md`, and its folder
   moves whole to `tasks/shipped/` (`git mv`).
3. **Each story's `log.md`**, before the move — `## YYYY-MM-DD — D3: prod <version>`: the sha, the
   bookmark, the migration and what it printed, the check, the release approval.
4. **The bug sweep** — `npm run sweep` from `code/`, its file in this commit. A failure is its first
   line, never a stop.
5. **Report**: what is live, `https://{{domain}}`, and what sits on `main` unreleased.
