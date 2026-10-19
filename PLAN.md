# claude-pipeline-cf — plan

| | |
|---|---|
| **Status** | shaped with the user 2026-10-17; built 2026-10-18 — every step of *Build order* landed. *Verified* below says what has run. |
| **Source** | what FND (`github.com/boazone/fnd`) learned: its `/pipeline`, `/open`, `/run`, `/ship` skills, `vibe/dev/PLAN-pipeline.md`, `vibe/dev/PLAN-environments.md`, `vibe/ENVIRONMENTS.md`, `tasks/README.md`, the hooks and `code/apps/api/dev.mjs` |

## What this repository is

A Claude Code project that sets up a new product repository and its CI/CD pipeline on Cloudflare.
`/start` runs here: it interviews the user, asks for what only the user can create on Cloudflare,
GitHub and the machine, and produces the new project in its own folder and its own GitHub
repository. The next session opens in that project and runs `/pipeline` there — planning, design,
then stories.

## Repository shape

```
CLAUDE.md                   what this is; run /start
PLAN.md                     this file
.claude/skills/start/       the interview and the setup runner
template/                   copied into the new project, placeholders filled:
                            CLAUDE.md · .githooks/ · .claude/ · vibe/ · tasks/ · code/
docs/PIPELINE.md            FND's pipeline plan, generalized — why each step exists
docs/SETUP.md               the Cloudflare, GitHub and local checklist, generalized
```

Placeholders: `{{name}}` (technical name, `fnd`), `{{PREFIX}}` (story index, `FND`),
`{{marketing}}`, `{{domain}}`, `{{root}}` (local folder), `{{email}}`, `{{gh_owner}}`, `{{dev_subdomain}}` (the dev account's workers.dev subdomain).

## What `/start` produces

1. **The repository skeleton** — `CLAUDE.md` signpost; `vibe/` (the map, a TERMINOLOGY skeleton,
   TECH-STACK, ENVIRONMENTS, BACKLOG, RESOURCES, `dev/SETUP.md`, `changelog/`, empty `prd/`,
   `specs/`, `design/`); `tasks/` (README, INDEX); `code/` — an npm workspace with a Hono Worker
   serving a Vite SPA, `verify.mjs`, Biome, Vitest, Playwright, `dev.mjs`, `wrangler.mjs`,
   `tools/decisions`, `tools/cleanup`, `tools/sweep`.
2. **The gates** — `.githooks/pre-commit` (gitleaks, then verify), `.claude/hooks/guard.mjs` and
   `format.mjs`, `.claude/settings.json` with the exact allow rules.
3. **The skills** — `/pipeline`, `/open`, `/run`, `/ship`, copied with the placeholders filled, plus
   the planning and design phases (open question 1).
4. **GitHub** — a private repository; `main` and `env/prod` (and `env/qa` when chosen) at the same
   first commit; the orphan `decisions` branch; the two cloud routines when chosen.
5. **Cloudflare, main account** — the domain on Cloudflare, a payment method, D1 and R2 per
   environment, Workers Builds on the `env/*` branches with non-production builds off, custom
   domains, the `www` redirect rule. Optional: AI Gateway per environment, an OAuth client per
   environment.
6. **Cloudflare, dev account** — a second free account: D1 and R2 `<name>-dev`, Access in front of
   the Worker (one-time code for the user, a service token for the agent), an account API token
   written to `.dev-account.env`. Dev is on `workers.dev`, behind Access.
7. **Local** — node, `gh auth`, `wrangler login`, gitleaks, mkcert, the hosts line
   `<local_ip> local.<domain>` (one loopback address per project), `core.hooksPath`; a story server per story at `<name>-<n>.localhost`.

The flow: the interview → a prerequisite check → the scaffold and first push → the Cloudflare and
GitHub steps, one Blocker table at a time, the agent running what `wrangler` and `gh` can and the
user doing what needs a browser or a credential, each step verified → the ids written into
`wrangler.jsonc` and `ENVIRONMENTS.md` → a report with the links and the next command.

Done means a hello page answers on local, dev and production (and QA when chosen).

## Decisions (the user, 2026-10-17)

1. **QA is optional.** Without it the path is `main` → dev → production: `/ship prod` ships `main`
   as the next version, the accept on dev being the check, and the version tag is cut at the
   production ship. `env/qa` and `/ship qa` are left out of the project.
2. **Local is part of the set** — mkcert TLS at `local.<domain>`, the hosts line, a story server per
   story.
3. **Dev is always a separate, free Cloudflare account**, where the agent has full control. Its
   token reaches that account and nothing else. There is no single-account option.
4. **`/start` asks whether the product needs several languages and both directions.** Yes → the
   i18n and RTL rules land as documents — `vibe/reference/i18n-and-rtl.md`, the TECH-STACK rules,
   the working-style line in `vibe/CLAUDE.md` — and no code.
5. **`/start` asks whether the project has several apps.** Yes → one Worker, one origin, each app
   under `/<app>/*` beside `/api/*` (FND's `TECH-STACK.md` §8), and the app names go into
   TERMINOLOGY.
6. **Two stops before the first story.** P1 — the PRD and TERMINOLOGY written and approved; P2 —
   the SPEC per app and the design documents written and approved; then stories. `/pipeline` in a
   project with no PRD starts at P1; with a PRD and no SPEC, at P2. Each phase's state is the
   document's own status header, in the repository.

## Decisions (the user, 2026-10-19, after the first real `/start`)

7. **`/start` says the journey first** — the steps, who acts, how long — and the stack in one table:
   the environments and what each is for, the code, GitHub, sign-in, the routines.
8. **Two opposite starts.** A folder that already holds material (documents, a design, code) is read
   whole and its answers proposed; an idea with nothing behind it gets a short discovery — who it is
   for, the first thing someone does, who signs in, apps, languages — written to
   `vibe/prd/discovery.md` for P1.
9. **Sign-in and routines only when the app needs them.** *Who signs in* decides Google: nobody (a
   public site) → off; a team (an admin area) → on, for that app alone; everyone → on. Routines are
   on for an app with signed-in users, off for a public site, optional either way.
10. **The closer is a celebration and a map**: a banner, the links by environment, what was left, and
    the next step — a new session in the project, `/pipeline`.

## Defaults — overturn by saying so

1. A generator, not a template to clone: `/start` runs here and creates `<root>` as its own
   repository.
2. The stack is FND's: Workers, D1, Hono, Vite + React, drizzle, Biome, Vitest, Playwright. R2,
   AI Gateway and Google sign-in are `/start` toggles: on, `/start` creates the resources and the
   bindings; the code that uses them is a later story's, behind its decision card. Durable Objects
   need no resource, so the first story that needs one adds it.
3. The skills are copied into the project, not shared as a plugin — the repository is the only
   state, and each project's skills evolve with it, as FND's did.
4. The pipeline in the new project covers planning and design before the first story (the user's
   vision, 2026-10-17).
5. FND's product stays out: its three apps, the simulator, the evaluation harness.
6. `/start` is resumable: its state is `vibe/dev/SETUP.md` in the new repository, never memory.
7. The `/start` toggles: QA, R2, AI Gateway, Google sign-in, cloud routines, several languages
   and directions; several apps is the app list. `scripts/render.mjs` applies them to `template/`
   (`{{key}}`, `{{#flag}}…{{/flag}}`, `{{^flag}}`, `{{#apps}}`, `__app__` in a path), then
   `npm install` and `npm run format` in the new project before its first commit.
8. Windows first, as FND; paths are placeholders.
9. The scaffold is a hello page per app, `/api/health`, and the system log (table, `POST
   /api/system-log`, the browser's uncaught errors) — what the pipeline's checks and the bug sweep
   need, nothing of a product.
10. The root folder's path stays short — Windows refuses paths over 260 characters and local D1
    reports it as an opaque *internal error*.
11. P1 and P2 work as `/open` does: the documents and the user's answers close the gaps, one
   question at a time; the design phase writes documents, and wireframes are artifacts only when
   the user asks, registered in `RESOURCES.md`.

## Build order

1. `docs/PIPELINE.md` and `docs/SETUP.md` — the generalized plans, the source every skill reads.
2. `template/` — FND's files with placeholders: the gates, `vibe/`, `tasks/`, `code/`.
3. The skills in `template/.claude/skills/` — `pipeline`, `open`, `run`, `ship`, and the two
   phases.
4. `/start` — the interview, the prerequisite check, the scaffold, the setup steps, the report.
5. A dry run: `/start` into a scratch folder, the hello page on local and dev.

## Verified

1. **Run, 2026-10-18:** both example answers rendered (several apps with every toggle; one app with
   none); `npm install`, `npm run format`, then the project's own pre-commit hook — gitleaks clean,
   `verify` green; a story server answering the hello page, the three browser checks passing on it,
   `POST /api/system-log` taking a line; `wrangler deploy --dry-run` binding the right database and
   environment for production, QA and dev (now a test in the template).
2. **Not run yet:** every step that needs a real account — the GitHub repository, the main and dev
   Cloudflare accounts, Access, Workers Builds, the first deploys, local's TLS at `local.<domain>`,
   the routines. The first real `/start` is their test; a defect it finds is fixed in `template/`.

## Open

None.
