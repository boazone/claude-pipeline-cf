# Setup — what must exist, and who creates it

Generalized from FND's `vibe/dev/PLAN-environments.md` §3–§10 and `vibe/ENVIRONMENTS.md`. `/start`
walks these steps in order; each step names **who acts** — *agent* runs it, *user* does it in a
browser or types a credential — and **the check** that proves it done. The new project's
`vibe/dev/SETUP.md` is this list with the answers filled, each row ticked as it passes: it is
`/start`'s only state.

Names follow one rule: **the environment is in every name**, so no command run in the wrong shell
hits the wrong one. `<name>` is the technical name, `<domain>` the production domain.

## The environments

| Environment | Domain | Branch | Deployed by | Database · bucket |
|---|---|---|---|---|
| Local | `https://local.<domain>` (`<local_ip>`, mkcert TLS) — the user's | any | `npm run dev` in `code/`, on the user's word | `<name>-local`, `--local` |
| Local, per story | `http://<name>-<n>.localhost:<8700 + n>` | `features/<P>-<n>` | `wrangler.mjs dev --story <n>` | a copy of local's state, in the worktree |
| Dev | `https://<name>-dev.<dev_subdomain>.workers.dev`, behind Access | `main` | `npm run deploy:dev`, from the laptop, on the dev account's token | `<name>-dev` · `<name>-dev` |
| Preview, per story | `https://<name>-<n>-<name>-dev.<dev_subdomain>.workers.dev`, behind dev's Access | `features/<P>-<n>` | `npm run preview:dev -- <n>` | dev's, or `<name>-preview-<n>` when the story carries a migration |
| QA — optional | `https://qa.<domain>` | `env/qa` | a fast-forward of `env/qa`; Workers Builds | `<name>-qa` · `<name>-qa` |
| Production | `https://<domain>` (+ `www` redirect) | `env/prod` | a fast-forward of `env/prod`; Workers Builds | `<name>-prod` · `<name>-prod` |

## S0 — The interview (agent asks, user answers)

| Answer | Example | Used for |
|---|---|---|
| Technical name | `fnd` | identifiers, folders, packages, every resource name |
| Ticket prefix | `FND` | `features/FND-<n>`, `tasks/FND-<n>/` |
| Marketing name | `Pobelo` | user-facing surfaces only |
| Purpose, description | one line, one paragraph | `vibe/CLAUDE.md`, the PRD's first draft |
| Production domain | `pobelo.app` | routes, OAuth, cookies |
| GitHub owner | `boazone` | the repository |
| Local folder | `C:\dev\personal\fnd` | the root checkout, which stays on `main`. It may exist: its `.git` is kept, the render is copied in without overwriting (a collision stops it), and the user's own files move under `vibe/` where the interview agreed |
| The user's email | | Access's one-time code; never a test account |
| Where it starts | a folder with material — documents, a design, code — or only an idea | material: read whole, filed under `vibe/`; an idea: the discovery, written to `vibe/prd/discovery.md` for P1 |
| Who signs in | nobody (a public site) · only a team (an admin area) · everyone | the Google sign-in toggle, and its scope; the routines' default |
| Apps | `admin, host, game` — or one | one path per app, `/<app>/*` |
| Several languages and directions | yes / no | `vibe/reference/i18n-and-rtl.md` and the rules |
| QA | yes / no | `env/qa`, `/ship qa`, the QA resources |
| Toggles | R2, Durable Objects, AI Gateway, Google sign-in, Claude routines — each only if the app needs it | what is created and bound |
| Dev account | new, or one another project's dev already uses | `dev_subdomain`; shared → `dev_shared_with`, that project's root, and S4 reuses what exists |

## S1 — The machine

| # | What | Who | Check |
|---|---|---|---|
| 1 | Node 22 or newer, git | user installs | `node -v`, `git --version` |
| 2 | `gh`, signed in | user: `gh auth login` | `gh auth status` |
| 3 | gitleaks | user: `winget install Gitleaks.Gitleaks` | `gitleaks version` |
| 4 | mkcert, its CA trusted | user: `winget install FiloSottile.mkcert`, then `mkcert -install` | `mkcert -CAROOT` |
| 5 | `wrangler login` on the **main** account | user, in an interactive terminal | `npx wrangler whoami` names the account |

## S2 — GitHub

| # | What | Who | Check |
|---|---|---|---|
| 1 | Private repository `<owner>/<name>` — or the one that exists, when it is empty (not empty: stop) | agent: `gh repo create <owner>/<name> --private`, or `git remote add origin` | `gh repo view` |
| 2 | The scaffold committed and pushed to `main` | agent | `git ls-remote origin main` |
| 3 | `env/prod` (and `env/qa`) at the same commit | agent: `git push origin main:env/prod` | `git ls-remote origin 'env/*'` |
| 4 | The orphan branch `decisions` | agent: `npm run decisions` in `code/` | `git ls-remote origin decisions` |
| 5 | `core.hooksPath .githooks` in the root checkout | agent | `git config core.hooksPath` |

## S3 — Cloudflare, the main account

| # | What | Who | Check |
|---|---|---|---|
| 1 | The domain on Cloudflare — bought there, or its nameservers moved | user | `npx wrangler whoami` lists the account; the zone is *Active* in the dashboard |
| 2 | A payment method — R2 asks for one even on its free tier (only with R2) | user | — |
| 3 | The account id, into `wrangler.jsonc`'s top-level `account_id` (and the gateway URLs) | agent: `npx wrangler whoami` | the id written |
| 4 | D1 `<name>-prod` (and `<name>-qa`) | agent: `npx wrangler d1 create <name>-prod` — the guard asks | the `database_id` written into its block |
| 5 | R2 `<name>-prod` (and `<name>-qa`) — with R2 | agent: `npx wrangler r2 bucket create <name>-prod` | `wrangler r2 bucket list` |
| 6 | AI Gateway `<name>-prod` (and `<name>-qa`) — with AI Gateway | user, in the dashboard: authenticated, a token with *AI Gateway Run* only | the gateway URL written into `vars` |
| 7 | The first deploy, once, from the laptop — it creates the Workers and their custom domains. **The only laptop deploy ever made to production**; recorded as such | agent: `npx wrangler deploy -c apps/api/wrangler.jsonc --env production` from `code/` — the guard asks | `https://<domain>/api/health` answers 200 |
| 8 | Workers Builds on each Worker: path (root directory) `code`, build `npm ci && npm run build`, deploy `npx wrangler deploy -c apps/api/wrangler.jsonc --env production` (`--env qa`), production branch `env/prod` (`env/qa`), **non-production branch builds off** (the connect form's *Enable Preview builds*, unchecked; *Builds for Preview branches* in the settings after). The *Cloudflare Workers and Pages* GitHub App must see the repository | user, in the dashboard: *Workers & Pages → the Worker → Settings → Build → Connect* | `env/prod` fast-forwarded to `main` — which has the real ids — gets a successful check run |
| 9 | `www.<domain>` → apex, when the domain is a zone's apex: a custom domain on the Worker for the record and certificate, then a Redirect Rule on the zone — *Rules → Overview → Create rule → Redirect Rule*, wildcard `http*://www.<domain>/*` → `https://<domain>/${1}`, 301, query string kept | user | `curl -sI https://www.<domain>` → 301 to the apex |
| 10 | Secrets per environment — a session secret, the model keys, the OAuth pair, as the toggles need | user: `npx wrangler secret put <NAME> --env production` — the value from stdin, never on a command line | agent: `wrangler secret list --env production` shows the names |

## S4 — Cloudflare, the dev account

A second, free account: the agent's. Its token reaches that account and nothing else, and carries no
Access permission, so the agent cannot lower the wall in front of dev.

An account another project's dev already uses may be named instead (S0, `dev_shared_with`): then
1, 2, 6 and the service token exist, the user copies 3's file from that project (without its
`CLOUDFLARE_SWEEP_TOKEN=` line), and 7 attaches the account's reusable policies on the Worker's
**Access** tab — *Manage Worker access*, all traffic.

| # | What | Who | Check |
|---|---|---|---|
| 1 | A new Cloudflare account, its workers.dev subdomain chosen | user: the account switcher → *Create Account* (Free; the login 7 days old, at most 5 Free accounts), then *Workers & Pages* asks for the subdomain | the subdomain, written as `dev_subdomain` |
| 2 | An **account** API token: Workers Scripts Edit, D1 Edit, Workers R2 Storage Edit, Workers Tail Read, Account Settings Read | user, in *Manage account → Account API tokens → Create Token* | — |
| 3 | `code/apps/api/.dev-account.env` in the root checkout, git-ignored: `CLOUDFLARE_API_TOKEN=` | user pastes it | agent: `npm run wrangler:dev -w @<name>/api -- whoami` names the dev account; its id into `env.dev.account_id` (and dev's gateway URL) |
| 4 | D1 and R2 `<name>-dev` | agent: `npm run wrangler:dev -w @<name>/api -- d1 create <name>-dev` | the id written into `env.dev` and `env.dev.previews` |
| 5 | The first deploy — the build, dev's migrations, then the Worker `<name>-dev` on workers.dev, previews on. It ends red at its last step, the Access check: expected this once, since Access cannot exist before the Worker | agent: `npm run deploy:dev -w @<name>/api`, from a clean `main` that is `origin/main` | `https://<name>-dev.<dev_subdomain>.workers.dev/api/health` answers 200 — open, until 7 |
| 6 | Zero Trust on the free plan, a team name `<name>-dev-team` | user: *Zero Trust*, its onboarding (it may ask for a payment method) | — |
| 7 | A service token, then two policies — *Zero Trust → Access controls → Service credentials → Service Tokens → Create Service Token*; *Access controls → Policies → Add a policy*: *Allow*, include *Emails* = the user's; *Service Auth*, include *Service Token*. Then the Worker's **Access** tab → *Protect this Worker behind Access*: **All traffic** (workers.dev and every preview), both policies → *Apply Access*. Not the built-in *Email domain* with a public mail domain: it lets everyone at it in. Worker-level Access answers a WebSocket upgrade with 403 | user | — |
| 8 | The service token's id and secret into `.dev-account.env`: `CF_ACCESS_CLIENT_ID=`, `CF_ACCESS_CLIENT_SECRET=` — shown once, at *Generate token* | user | — |
| 9 | The Access team domain and the application's AUD — the AUD is the `kid` in the login redirect's URL — into `vibe/RESOURCES.md` §1. The first dev-only route checks Access's JWT against them; re-adding Access makes a new AUD | agent reads them from the redirect | `npm run deploy:dev -w @<name>/api`: 302 without Access, 200 with the service token |
| 10 | Dev's secrets, the same names as production, their own values | user: `npm run wrangler:dev -w @<name>/api -- secret put <NAME>`; for previews `-- preview base-config secret put <NAME>` | names listed |

## S5 — Local

| # | What | Who | Check |
|---|---|---|---|
| 1 | `<local_ip>  local.<domain>` in `C:\Windows\System32\drivers\etc\hosts` — an address no other line of the file uses, so no other project's local server answers for it | user, as administrator | `ping -n 1 local.<domain>` resolves to `<local_ip>` |
| 2 | The certificate: `mkcert -cert-file code/certs/local.<domain>.pem -key-file code/certs/local.<domain>-key.pem local.<domain>` | agent, in the root checkout | the two files exist, git-ignored |
| 3 | `code/apps/api/.dev.vars` — local's secrets, never a production value | user | — |
| 4 | Local's migrations, then `npm run dev` | user runs it — local is the user's | `https://local.<domain>/api/health` answers 200 |

**`local.<domain>` gets no DNS record at Cloudflare.** Universal SSL covers the apex and one label,
and local's certificate is mkcert's.

## S6 — Google sign-in (toggle)

One Google Cloud project, **one OAuth client per environment**, each with its own redirect URI
`https://<host>/api/auth/callback/google`, the consent screen in *Testing*, the user listed under
*Audience → Test users*. Local may share dev's client, both hosts on it. Google accepts a workers.dev
redirect URI. Its pair, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, goes in as secrets (S3.10,
S4.10, S5.3); a preview gets `none` — pick-a-user signs in there.

| # | What | Where, at console.cloud.google.com |
|---|---|---|
| 1 | The project and the consent screen | project picker → *New project*; *Google Auth Platform → Get started*: app name, support email, *Audience* **External**, contact email → *Create* |
| 2 | Testing, and who may sign in | *Audience*: status **Testing**; *Test users → Add users* — anyone not listed is refused, which reads like a code bug |
| 3 | A client per environment | *Clients → Create client* → **Web application**: *Authorized JavaScript origins* `https://<host>`, *Authorized redirect URIs* `https://<host>/api/auth/callback/google` → *Create*. The secret is viewable only then; a changed URI can take minutes to hours to apply |

## S7 — The cloud routines (toggle)

| # | What | Who |
|---|---|---|
| 1 | A read-only token on the main account, *D1 Read*, for the bug sweep — `CLOUDFLARE_SWEEP_TOKEN=` in `.dev-account.env` on the laptop, and a network secret of the project's own cloud environment, never in the repository | user: *Manage account → Account API tokens → Create Token*; claude.ai/code → the environment selector → *New environment* (*Limited*, `api.cloudflare.com` allowed, package managers on) → *Network secrets → Add secret*: *Bearer*, `api.cloudflare.com`, `Authorization` · `Bearer` · the token |
| 2 | *Bug sweep*, daily 03:00 UTC, and *Weekly review*, Mondays 03:00 UTC, on `<owner>/<name>`, in that environment, with the prompts in `tasks/ROUTINES.md` — the sweep's command carries `NODE_USE_ENV_PROXY=1`, or Node's `fetch` skips the proxy that adds the token and Cloudflare answers 401. The *Claude* GitHub App must see the repository; each routine's connectors cleared | agent, through `/schedule`; the sweep fired once, its first line names rows; their URLs into `vibe/RESOURCES.md` |
| 3 | The cleanup queue — a local scheduled task, daily 09:00, `npm run cleanup --prefix code` from the root checkout | agent, through the scheduled-tasks tool; the user sets its folder to the root checkout |

## S8 — Done

| Check | Expected |
|---|---|
| `https://local.<domain>/api/health` | 200 |
| `https://<name>-dev.<dev_subdomain>.workers.dev/api/health` | 302 without Access, 200 with the service token |
| `https://qa.<domain>/api/health` (with QA) | 200 |
| `https://<domain>/api/health` | 200; `www` redirects to the apex |
| `git ls-remote origin` | `main`, `env/prod`, (`env/qa`), `decisions` |

Then the report: the links, what was left undone and why, and the next step — a new session in
`<root>`, `/pipeline`, which starts at P1.
