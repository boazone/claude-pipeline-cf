---
name: start
description: Set up a new project and its CI/CD pipeline on Cloudflare — `/start` interviews the user (name, ticket prefix, purpose, apps, languages, toggles), renders the project from `template/` into its own folder, creates its GitHub repository and branches, walks the Cloudflare main and dev accounts and the local machine one step at a time, and ends with the hello page live on local, dev and production and the next step — `/pipeline` in a new session in the project. `/start <folder>` resumes a setup from that project's `vibe/dev/SETUP.md`. Use for "start", "new project", "set up a project", "bootstrap", "scaffold".
---

# start

Turns a conversation into a running project: **a repository with `vibe/`, `tasks/` and `code/`,
its gates, its skills, and a hello page on local, dev and production** — the setup FND took weeks to
learn, in one sitting. `docs/SETUP.md` is the checklist; `docs/PIPELINE.md` is why each piece exists;
`PLAN.md` holds the decisions this repository was built on.

**The new project is the state.** Before the render, the answers live in this thread; from the
render on, everything is in `<root>/vibe/dev/start.json` (the answers) and `<root>/vibe/dev/SETUP.md`
(its `## Log`, one line per step as its check passes). `/start <root>` resumes at the first step
with no line, whatever this thread remembers.

**One question at a time, and few of them.** Every question is a `## For you: <what>` message with
the question only; a value the agent can find or default is not asked. Every step the user does is
one **Blocker** table, as `template/vibe/CLAUDE.md` *Talking to the user* 2 shapes it: **Waits for**
· **Who acts** · **Where** · **Steps** (numbered, the exact clicks and names) · **Your action** —
*reply **done***; the text to paste in fenced code blocks under it.

**Credentials are the user's.** A token, a key or a secret is typed by the user — into a file, a
dashboard or `wrangler secret put` reading stdin — never into this chat and never by the agent. The
agent checks names and answers (`wrangler whoami`, `secret list`, an HTTP status), never values.

## 0. Load

1. `PLAN.md`, `docs/SETUP.md` — whole. `docs/PIPELINE.md` §10, the lessons.
2. **Resume?** `/start <folder>`, or an answer naming a folder that has `vibe/dev/start.json` →
   read it and that `SETUP.md`'s `## Log`, say in one line which step is next, and go there.

## 1. The interview — S0

Four questions, in order. Before the first, one line: *Four questions, then the setup — about an
hour, most of it Cloudflare's dashboard.*

1. **"What is the project — its name, and what it is for in a line or two?"** From the answer,
   propose the rest yourself: the technical name (lowercase, short), the ticket prefix (2–4
   capitals), the marketing name, a one-line purpose and a paragraph of description.
2. **"Does it have several apps — for example an admin app and a customer app? Name them; each gets
   its own path, `/<app>/*`, on one domain."** One app is the default: it lives at `/`.
3. **"Does it need several languages, including a right-to-left one such as Hebrew or Arabic?"**
   Yes → the rules land as documents (`vibe/reference/i18n-and-rtl.md`, the stack, the working
   style), no code.
4. **The rest, as one table to confirm** — *reply **ok**, or change a row by its number*:

   | # | What | Default |
   |---|---|---|
   | 1 | Technical name · prefix · marketing name | from question 1 |
   | 2 | Production domain — bought on Cloudflare, or moved there | `<name>.app`, if the user has none |
   | 3 | GitHub owner | `gh api user -q .login` |
   | 4 | Local folder — the root checkout; keep the path short (Windows, 260 characters) | beside this repository: `<parent of this folder>/<name>` |
   | 5 | The user's email — Access's one-time code goes there | `git config user.email` |
   | 6 | QA — a `qa.<domain>` between dev and production | off — dev is the check, `/ship prod` ships `main` |
   | 7 | R2 — file storage | off |
   | 8 | AI Gateway — model calls | off |
   | 9 | Google sign-in — the OAuth clients now, the code with its first story | off |
   | 10 | Cloud routines — a daily bug sweep and a weekly review | on |
   | 11 | The folder's own files — only when row 4's folder exists and holds some | each file to a place under `vibe/`: a design in `vibe/design/`, an offer or a pitch in `vibe/prd/`, rules and references in `vibe/reference/` |

   The domain must not be taken by another project of the user's: `wrangler whoami` and the zone
   list say what is there. The folder and `<owner>/<name>` may exist already — list the folder
   (row 11 is its files, by name, `.git` aside) and `gh repo view <owner>/<name>`; §4 and §5 say
   what follows.

## 2. The machine — S1

The agent checks, the user installs. Run each check; collect what fails into **one** Blocker table
with the install commands, one fenced block each; wait for **done**; check again.

```bash
node -v
git --version
gh auth status
gitleaks version
mkcert -CAROOT
npx -y wrangler@4 whoami
```

Node 22 or newer. `wrangler whoami` must name the **main** account — the one that holds (or will
hold) the domain; `wrangler login` is the user's, in an interactive terminal.

## 3. The dev account first — S4.1

The render needs dev's workers.dev subdomain, so the second account comes before anything is
written. One Blocker table: the account switcher (top left, the account's name) → **Create
Account** — a Free account, `<name> dev` (the user's login must be 7 days old; at most 5 Free
accounts); in it, **Workers & Pages** once, which asks for a workers.dev subdomain: `<name>-dev`, or
the nearest free one — **Account details → Subdomain** shows it later; *reply with the subdomain*. **Or an account that already is dev for another project** —
the user may name it (every resource name carries `<name>`, so projects share it without
colliding): its workers.dev subdomain is the answer, nothing is created, and the other project's
root goes into the answers as `dev_shared_with` — §7 reads it from `start.json`. Then the domain,
if it is not on Cloudflare yet (S3.1): bought there, or its nameservers moved — the zone *Active* before §6 needs it, not before the render.

## 4. Render — the project exists

1. The answers as JSON in the scratchpad, in the shape of `scripts/example-answers.json` — `apps`
   empty for one app, `flags` with `qa`, `r2`, `ai`, `google`, `routines`, `i18n`, and `local_ip` — the
   first `127.0.0.N`, N ≥ 2, that no line of `C:\Windows\System32\drivers\etc\hosts` uses, because another
   project's local server may hold the others — then:

   ```bash
   node scripts/render.mjs <answers.json> <root>
   ```

   It refuses a folder that is not empty (a `.git` alone is empty to it). Read what it printed.

   **`<root>` already holds files** — render into an empty scratch folder instead, then copy in
   without overwriting: first every rendered path that already exists in `<root>` — any → stop and
   name them, the user decides; none → copy the scratch folder's contents in. Then move each of the
   user's files where row 11 agreed — a target that exists is a collision too.
2. In `<root>`: `git init -b main` — or, with a `.git` already there, keep it: no commits
   (`git rev-parse HEAD` fails) → `git symbolic-ref HEAD refs/heads/main`; commits → stop and ask.
   Then the user's identity if this repository's local one differs from
   the global (`git config user.name`, `user.email` — the GitHub account's), and
   `git config core.hooksPath .githooks`.
3. In `<root>/code`: `npm install`, then `npm run format` — the render's line lengths depend on the
   answers, and Biome settles them once. Then `npx -y npm@10 ci --dry-run`: Workers Builds installs
   with npm 10, whose `npm ci` refuses a lock that a newer local npm accepts (a peer range out of
   step) — red is a bug in `template/`'s versions.
4. **The first commit** — `git add -A` and `git commit -m "<PREFIX> — the scaffold, from claude-pipeline-cf"`.
   The pre-commit hook runs gitleaks and `verify`; green is the proof the render is sound. Red is a
   bug in `template/`: say so, fix it here, re-render into an empty folder — never patch the
   project by hand to get past it.
5. Log `S0` and `S1` and `S4.1` in `<root>/vibe/dev/SETUP.md`'s `## Log` — from here every step's
   line is committed and pushed (after §5, to `main`, as bookkeeping).

## 5. GitHub — S2

1. `gh repo create <owner>/<name> --private --source <root> --remote origin --push` — unless it
   exists: `gh repo view <owner>/<name> --json isEmpty,visibility`. Empty → it is `origin`
   (`git remote add origin https://github.com/<owner>/<name>.git`, or the kept `.git`'s own `origin`
   when it already points there), then `git push -u origin main`; say so if it is public. Not
   empty → stop and say so.
2. `git push origin main:env/prod` (and `main:env/qa` with QA) — the deploy branches, at the first
   commit.
3. `npm run decisions` in `code/` — the orphan branch `decisions`.
4. Check: `git ls-remote origin`. Log S2.

## 6. Cloudflare, the main account — S3

Each row of `docs/SETUP.md` S3 in order, skipping what the toggles leave out. The agent's commands
run from `<root>/code`. The project's own guard is not loaded in this session, so **say before each
command that changes production what it does**, and run it only on the user's word.

1. **The account id** — `npx wrangler whoami`; into `apps/api/wrangler.jsonc`, replacing
   `TODO-main-account-id` everywhere it stands.
2. **D1** — `npx wrangler d1 create <name>-prod` (and `<name>-qa`); each printed `database_id`
   replaces its `TODO-…-database-id`. Run from a terminal, `d1 create` asks *Would you like Wrangler
   to add it on your behalf?* — the answer is **no**: it adds a top-level binding with `"remote": true`,
   which points local dev at production's database, and reformats the file. **R2**, with the toggle — `npx wrangler r2 bucket create
   <name>-prod` (and `-qa`). **AI Gateway**, with the toggle — a Blocker table for the dashboard.
3. `npm run format` — a real id is longer than its `TODO-…`, and Biome wraps the line (each D1
   object stays on one line, as `dev.mjs` needs). Commit the ids (`<PREFIX> — the main account's ids`) and push to `main` directly — this is the
   project's setup, before any story — logged as S3.
4. **The first deploy, the only one ever made to production from a laptop** — it creates the Worker
   and its custom domains: `npm run build`, `npx wrangler d1 migrations apply <name>-prod -c
   apps/api/wrangler.jsonc --env production --remote` (the scaffold's `system_log`, approved by this
   setup), then `npx wrangler deploy -c apps/api/wrangler.jsonc --env production`. Check:
   `https://<domain>/api/health` answers 200. The same for QA with the toggle.
5. **Workers Builds** — a Blocker table, per Worker: **Workers & Pages → `<name>-production`
   (`<name>-qa`) → Settings → Build → Connect**; Git provider GitHub, the repository — the
   *Cloudflare Workers and Pages* GitHub App may see only selected repositories: add this one at
   github.com/settings/installations → *Configure* → *Repository access*; **Production branch**
   `env/prod` (`env/qa`); **Disable builds** off; **Build command** `npm ci && npm run build`;
   **Deploy command** `npx wrangler deploy -c apps/api/wrangler.jsonc --env production` (`--env qa`);
   **Enable Preview builds unchecked** — the non-production branch builds (the Preview command is
   then unused); **Advanced settings → Path** `code`. After the connect, Settings → Build shows these
   as *Root directory* `/code/` and *Builds for Preview branches*, off.
   Check: `env/prod` fast-forwarded to `main` (`git push origin main:env/prod`, on the user's word)
   shows a successful check run. `main`, not an empty commit on `env/prod`'s tip: that tip is the
   first commit, whose `wrangler.jsonc` still has the `TODO-…` ids, and its build fails.
6. **`www`**, when the domain is a zone's apex (not a subdomain such as `app.example.com`) — a
   Blocker table: the zone → **Rules → Overview → Create rule → Redirect Rule**; rule name
   `www to apex`; *When incoming requests match* **Wildcard pattern**: Request URL
   `http*://www.<domain>/*`, Target URL `https://<domain>/${1}`, Status code **301**, **Preserve
   query string** on → **Deploy**. The custom domain `www.<domain>` on the Worker gives the record
   it needs (proxied). Check: `curl -sI https://www.<domain>` → 301 to the apex.
7. **Secrets**, for what the toggles turned on — a Blocker table with each `npx wrangler secret put
   <NAME> --env production` (the value typed into its prompt); check with `secret list`.

## 7. Cloudflare, the dev account — S4.2 to S4.10

1. **The token** — a Blocker table, in the dev account: **Manage account → Account API tokens →
   Create Token**, name `<name>-dev-agent`, the five permissions of S4.2 → **Continue to summary** →
   **Create Token** (an account token reaches this account only); the user pastes it into
   `<root>/code/apps/api/.dev-account.env` as `CLOUDFLARE_API_TOKEN=<token>`. Check:
   `npm run wrangler:dev -w @<name>/api -- whoami` names the dev account; its id replaces
   `TODO-dev-account-id`. **With `dev_shared_with`** the token exists: a Blocker table in which the
   user copies `<dev_shared_with>\code\apps\api\.dev-account.env` to the same path in `<root>` —
   the user, never the agent — and deletes its `CLOUDFLARE_SWEEP_TOKEN=` line, which is the other
   project's main account. The same check.
2. **D1 and R2** — `npm run wrangler:dev -w @<name>/api -- d1 create <name>-dev`; its id replaces
   `TODO-dev-database-id` in both of `env.dev`'s lines. R2 with the toggle. `npm run format`, commit, push.
3. **The first deploy** — S4.5's one command; its red Access check is expected this once. Check:
   dev's `/api/health` answers 200.
4. **Access** — one Blocker table for S4.6–S4.8, in the dev account, in this order:
   1. **Zero Trust** (the dashboard's sidebar) — its onboarding, once: team name `<name>-dev-team`,
      the **Free** plan (it may ask for a payment method all the same).
   2. **Zero Trust → Access controls → Service credentials → Service Tokens → Create Service
      Token**: name `<name>-agent`, duration non-expiring → **Generate token**. The Client ID and
      the Client Secret show once: the user pastes them into `.dev-account.env` as
      `CF_ACCESS_CLIENT_ID=` and `CF_ACCESS_CLIENT_SECRET=`.
   3. **Zero Trust → Access controls → Policies → Add a policy**, twice: `<name>-user`, action
      **Allow**, include **Emails** = the user's email; `<name>-agent`, action **Service Auth**,
      include **Service Token** = `<name>-agent`. (Not the dialog's built-in **Email domain**: with
      `gmail.com` it lets every Gmail address in.)
   4. **Workers & Pages → `<name>-dev` → Access** tab → **Protect this Worker behind Access**
      (*Manage Worker access*): scope **All traffic** (it covers workers.dev and every preview),
      **Authentication policy → Add policy**: both policies → **Apply Access**.

   The user signs in by a one-time PIN to the email — Access's login when no identity provider is
   set. **With `dev_shared_with`** 1–3 exist — the copied file holds the service token: only 4,
   attaching that account's two existing policies; nothing new. **Worker-level Access answers a
   WebSocket upgrade with 403** (Cloudflare's documented limit): a project whose live play needs
   WebSockets on dev meets it at that story, which decides the fix.
5. **The check** — `npm run deploy:dev -w @<name>/api`: 302 without Access, 200 with the service
   token. The team domain and the AUD (the `kid` in the login redirect's URL) into
   `vibe/RESOURCES.md` §1. Then the user opens dev in a browser and signs in by the one-time code.
6. **Dev's secrets**, for the toggles — as §6.7, through `npm run wrangler:dev -w @<name>/api --
   secret put <NAME>`, and `-- preview base-config secret put <NAME>` for the previews.

## 8. Local — S5

1. **The hosts line** — a Blocker table: Notepad as administrator, `C:\Windows\System32\drivers\etc\hosts`,
   add `<local_ip>  local.<domain>`. Check: `ping -n 1 local.<domain>` resolves to `<local_ip>`.
2. **The certificate** — in `<root>/code`: `mkdir certs` (git-ignored, so not in the render), then
   `mkcert -cert-file certs/local.<domain>.pem -key-file certs/local.<domain>-key.pem local.<domain>`.
3. **Local's secrets**, for the toggles — the user writes `code/apps/api/.dev.vars`, dev's values.
4. **The local database and the first run** — local is the user's: one Blocker table, run in a
   terminal of their own, from `<root>/code`:

   ```bash
   npm run db:migrate:local -w @<name>/api
   ```
   ```bash
   npm run dev
   ```

   Check: `curl -s https://local.<domain>/api/health` → `{"ok":true}`. The user stops it when done.

## 9. Google sign-in and the routines — S6, S7, with the toggles

- **Google** — one Blocker table a step, at console.cloud.google.com as the user:
  1. **The project and the consent screen** — project picker → **New project** `<name>` → select it;
     **Google Auth Platform → Get started**: app name `<marketing>`, support email, **Audience**
     **External**, contact email → agree → **Create**.
  2. **Testing** — **Audience**: publishing status stays **Testing**; **Test users → Add users**:
     the user's email, then each person who will sign in (up to 100). Anyone not listed is refused,
     and it reads like a code bug.
  3. **A client per environment** — **Clients → Create client → Web application**, name
     `<name>-prod` (`<name>-qa`, `<name>-dev`); **Authorized JavaScript origins** `https://<host>`;
     **Authorized redirect URIs** `https://<host>/api/auth/callback/google` → **Create**. The secret
     is viewable only now. Local may share dev's client (both hosts on it) — the user's choice. A
     changed redirect URI can take minutes to hours to apply.
  4. **The pair as secrets**, typed into each prompt — `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`:
     `npx wrangler secret put <NAME> -c apps/api/wrangler.jsonc --env production` (§6.7), `npm run
     wrangler:dev -w @<name>/api -- secret put <NAME>` (§7.6; previews get none), and the two lines
     in `code/apps/api/.dev.vars` (§8.3). Check: the names in each `secret list`, and in `.dev.vars`.
- **Routines** — the sweep's *D1 Read* token on the main account (**Manage account →
  Account API tokens → Create Token**, name `<name>-sweep`, one permission: Account · D1 · Read; it
  reads every database of the account, which says so), also as `CLOUDFLARE_SWEEP_TOKEN=` in `.dev-account.env`
  for the laptop; check `npm run sweep`. Then **a cloud environment of the project's own** — one
  environment carries one secret per host, and another project's may already hold
  `api.cloudflare.com`. At claude.ai/code, the new-session screen: the first control under the
  message box (the environment) → **New environment**, tab **Cloud**: **Name** `<name>`; **Network
  access** **Limited**, **Allowed domains** `api.cloudflare.com`, **Allow package managers** on;
  **Network secrets → + Add secret** — **Secret type** **Bearer**, **Allowed websites**
  `api.cloudflare.com`, **Path prefixes** empty, **Custom headers** `Authorization` · `Bearer` · the
  token as **Value** → add; then **Add environment**. The secret only reaches Node's `fetch` with
  `NODE_USE_ENV_PROXY=1` on the command (`tasks/ROUTINES.md` carries it). The *Claude* GitHub App must see `<owner>/<name>`
  (github.com/settings/installations) or the create is refused. Then the two routines from
  `<root>/tasks/ROUTINES.md` through `/schedule`, in that environment, and **`clear_mcp_connections`
  on each** — the create attaches every claude.ai connector. Fire the sweep once and read its run
  log: its first line names rows, not `401`. Their URLs into `vibe/RESOURCES.md` §3. The cleanup
  queue: a local scheduled task, daily 09:00, running `npm run cleanup --prefix code` from `<root>` —
  through the scheduled-tasks tool; the user sets its folder to `<root>` in the app.

## 10. Done — S8

Every check of `docs/SETUP.md` S8 run again and shown as one table, **Check** · **Expected** ·
**Seen**. Then `## For you: <name> is set up`:

1. **Links** — production, QA, dev, local, the repository, the decisions page.
2. **Left undone** — every step the user skipped or a toggle deferred, and why. Each is a row of
   `<root>/vibe/dev/CHECKLIST-production.md` when production needs it.
3. **Next** — *open a new Claude Code session in `<root>` and run `/pipeline`: it starts at P1, the
   PRD and the terminology.* Offer to start that session (`start_session`, `cwd` the root, the brief
   "run /pipeline"), and do it on a yes.

Log S8, commit, push.

## Rules

1. **Never past a red check.** A step's check fails → say what was seen, and the step again; three
   times → stop and say so.
2. **Every id the agent writes is one it read** from a command's output, never typed from memory.
3. **The template is fixed here, not only there.** A defect the setup finds in a rendered file is
   fixed in `template/` and committed in this repository, and the same change made in the project.
4. **Nothing of the user's is touched outside `<root>`** but the hosts file, by the user, and
   `~/.wrangler`, by `wrangler login`.
