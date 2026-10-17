# {{PREFIX}} — code

Docs live in [`../vibe/`](../vibe/); read `vibe/CLAUDE.md` and `vibe/TERMINOLOGY.md` first.

```
apps/api         Hono Worker; serves apps/web's build as assets. wrangler.jsonc holds every environment
apps/web         Vite + React — {{#multiapp}}{{app_list}}, one path each{{/multiapp}}{{^multiapp}}the app{{/multiapp}}
tools/decisions  the decisions page — `npm run decisions` writes DECISIONS.md to the branch `decisions`
tools/cleanup    the cleanup queue — `npm run cleanup` runs what R8 was refused, daily at 09:00
tools/sweep      the bug sweep — `npm run sweep` rewrites tasks/SWEEP.md from production's system log
```

## First time on a machine

```
git config core.hooksPath .githooks     # from the repo root: gitleaks and verify on every commit
npm install                             # here, in code/ — the workspace root, or nothing links
```

`code/certs/` holds mkcert's certificate for `local.{{domain}}` and `apps/api/.dev.vars` the local
secrets; both are git-ignored (`vibe/dev/SETUP.md` S5).

## Run it

```
npm run db:migrate:local -w @{{name}}/api    # once, and after each new migration
npm run dev                                  # https://local.{{domain}} — the user's, on request only
```

One process, no Vite dev server: `npm run dev` rebuilds the bundle and `wrangler dev` serves it as
the Worker's static assets, exactly as deployed.

## A server per story — for a test that needs one

```
npm run build -w @{{name}}/web
npm run dev:story -w @{{name}}/api -- 17     # http://{{name}}-17.localhost:8717
```

Plain HTTP on `127.0.0.1:<8700 + n>`; Chromium treats `*.localhost` as a secure context. Its database
is a copy of local's, made once, in the worktree. It refuses to start with less than
`{{NAME}}_MIN_FREE_GB` (default 3) of memory free.

## Dev

Dev is `main` in a Cloudflare account of its own, behind Access (`vibe/ENVIRONMENTS.md`). Every
command runs on the dev account's token, read from `apps/api/.dev-account.env` in the root checkout
(git-ignored) — `wrangler login` stays the user's, for production:

```
npm run deploy:dev -w @{{name}}/api              # main to dev: build, dev's pending migrations, deploy, the Access check
npm run preview:dev -w @{{name}}/api -- <n>      # this branch on Worker Preview {{name}}-<n>; `-- <n> --delete` removes it
npm run wrangler:dev -w @{{name}}/api -- <args>  # any wrangler command on dev
```

## Verify

`npm run verify` — typecheck, Biome, test protection, the tests with the coverage floor, every
workspace's `check` scripts, and the guard's own check. `.githooks/pre-commit` runs it on every commit
that stages `code/` or `.claude/hooks/`, after gitleaks.

## Tests

| Where | Runs in | What |
|---|---|---|
| `apps/api/test/` | workerd, on the real Worker, its own D1 per file with every migration | routes |
| `apps/api/node-test/`, `tools/*/*.test.mjs` | Node | the deploy scripts and the tools |
| `apps/web/src/**/*.test.tsx` | jsdom | components |
| `apps/web/browser/` | Playwright, against a running server | pages — `{{NAME}}_BASE_URL=<url> npx playwright test -c apps/web/browser` |

A browser test imports `test` from `./kit`, which carries the Access service token to dev and the
previews and to no other host. The evaluator's own specs go in `apps/web/browser/eval/`, git-ignored.

**No hand-written SQL.** A migration is generated from `apps/api/src/db/schema.ts`; a test writes
rows through the app's own routes or drizzle.
