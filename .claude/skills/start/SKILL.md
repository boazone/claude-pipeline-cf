---
name: start
description: Set up a new project and its CI/CD pipeline on Cloudflare — `/start` says the journey and the stack, then interviews the user — reading a folder that already holds material, or taking a bare idea through a short discovery (who it is for, who signs in, apps, languages, the toggles the app needs), renders the project from `template/` into its own folder, creates its GitHub repository and branches, walks the Cloudflare main and dev accounts and the local machine one step at a time, and ends with the hello page live on local, dev and production and the next step — `/pipeline` in a new session in the project. `/start <folder>` resumes a setup from that project's `vibe/dev/SETUP.md`. Use for "start", "new project", "set up a project", "bootstrap", "scaffold".
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

## 1. The welcome and the interview — S0

### The welcome — said first, before any question

The user may not know what `/start` is about to do. The first message says it, in this shape, then
asks the first question (*Understand the project* 1) under it:

````markdown
# Let's set up your project

**What happens now** — about an hour, most of it clicking in Cloudflare's dashboard. You answer, click
and paste secrets; I run every command and check every step before the next one.

| | Step | Who | Time |
|---|---|---|---|
| 1 | **Understand the project** — a few questions, or I read what your folder already holds | you, me | 5–15 min |
| 2 | **Your machine** — I check the tools; you install what is missing | me, you | 5 min |
| 3 | **The project** — rendered into its folder, the first commit, its GitHub repository | me | 5 min |
| 4 | **Production** — your Cloudflare account: the database, the first deploy, deploys from GitHub | you click, I run | 15 min |
| 5 | **Dev** — a second, free Cloudflare account that is mine to deploy to, behind a login wall | you click, I run | 15 min |
| 6 | **Local** — the app on your laptop, at its own HTTPS address | you, me | 5 min |
| 7 | **Extras, only if the app needs them** — Google sign-in; Claude routines | you click, I run | 10 min each |
| 8 | **Done** — every environment checked, and the next step: planning, in the new project | me | — |

**What you get**

| Piece | What it is for |
|---|---|
| **Local** — `https://local.<domain>` | You, on your laptop, any branch. Nobody else sees it. |
| **Dev** — `<name>-dev.<subdomain>.workers.dev` | Every finished change lands here first, and each story gets its own preview. Behind Cloudflare Access: you by a code to your email, me by a token. |
| **QA** — `qa.<domain>`, optional | A stop between dev and production, for a team that checks there. |
| **Production** — `https://<domain>` | Your users. Deployed only by moving a branch, never from a laptop. |
| **The code** | One Cloudflare Worker per environment: an API (Hono) and the app (React), on one domain; a D1 database (SQLite). Tests and checks run on your laptop before every commit. |
| **GitHub** | The repository. Its branches are the deploys: `main` → dev, `env/prod` → production. |
| **Google sign-in** — if people sign in | Users log in with their Google account. Not needed for a public site where everyone is a guest; for an admin area alone, only the admins sign in. |
| **Claude routines** — optional | A daily bug sweep (production's errors into a list), a weekly review (security, dependencies, needless code, stale docs), and a daily cleanup on your laptop. |

Free tiers only: Cloudflare Free, GitHub Free, your Claude plan.
````

`<domain>`, `<name>` and `<subdomain>` stay as written until they are known — it is a map, not the
answers.

### Understand the project

**Two opposite starts, one interview.** Either the user has a folder that already holds something —
documents, a design, notes, sometimes code — or nothing but an idea. The first question finds out
which, and the folder decides the rest.

1. **"What is the project called, and where should it live — a new folder, or one you already
   have?"** A name alone is enough: the folder defaults to beside this repository,
   `<parent of this folder>/<name>`, short (Windows, 260 characters). Then list the folder:
   - **It has `vibe/dev/start.json`** → it was set up before: resume (§0.2).
   - **It holds material** — read every document whole (a design export: its README and spec, not
     each screen). Propose every answer the material gives — name, purpose, users, sign-in, apps,
     languages — and ask only what it leaves open, one question at a time. Each file gets a place
     under `vibe/` (row 11). **Code of its own** (`package.json`, `src/`, …) is one question: it
     moves to `vibe/reference/legacy/` as reading for P1 and P2 — never run, never merged into
     `code/` — or `/start` stops and the user picks another folder.
   - **It is empty, or new** → the discovery below.
2. **Discovery — for an idea, not yet a project.** One question at a time, each with a proposal the
   user can accept as it stands; stop when the answers are enough for the table:
   1. *"Who is it for, and what does it do for them?"*
   2. *"Walk me through the first thing someone does with it — from opening it to the moment it is
      useful."*
   3. *"Who signs in?"* — **nobody** (a public site, every visitor a guest) · **only you or a team**
      (a closed admin area) · **everyone who uses it**.
   4. *"One app, or several on one domain — for example a public site and an admin area?"* —
      proposed from 2 and 3; each gets its own path, `/<app>/*`; one app lives at `/`.
   5. *"Several languages, including a right-to-left one such as Hebrew or Arabic?"* — yes → the
      rules land as documents (`vibe/reference/i18n-and-rtl.md`, the stack, the working style), no
      code.

   Then say it back in five lines — the name, what it is for, who uses it, the first thing they do,
   who signs in — and propose the technical name (lowercase, short), the ticket prefix (2–4
   capitals), the marketing name, a one-line purpose and a paragraph of description. The questions
   and the answers, word for word, go into `<root>/vibe/prd/discovery.md` with the render (§4.1):
   P1 writes the PRD from it.
3. **The rest, as one table to confirm** — *reply **ok**, or change a row by its number*. First
   read **`start.local.json`** at this repository's root when it exists (git-ignored;
   `start.local.example.json` is its shape): the user's own answers that repeat across projects —
   `email`, `gh_owner`, `gh_account` (the `gh` login to use when several are signed in),
   `cf_account` (the main Cloudflare account's name), `dev_account`, `dev_subdomain`,
   `dev_shared_with` (a project that already uses the dev account), `root_parent`. Each key it
   holds is that row's default; a key it lacks is asked. It holds names, emails and paths, never
   a token.

   | # | What | Default |
   |---|---|---|
   | 1 | Technical name · prefix · marketing name | from the name and what the interview found |
   | 2 | Production domain — bought on Cloudflare, or moved there | `<name>.app`, if the user has none |
   | 3 | GitHub owner · the `gh` account | `gh_owner` and `gh_account` from `start.local.json`, else `gh api user -q .login` |
   | 4 | Local folder — the root checkout; keep the path short (Windows, 260 characters) | the one named in question 1, else `<root_parent>/<name>`, else beside this repository: `<parent of this folder>/<name>` |
   | 5 | The user's email — Access's one-time code goes there | `email` from `start.local.json`, else `git config user.email` |
   | 6 | QA — a `qa.<domain>` between dev and production | off — dev is the check, `/ship prod` ships `main` |
   | 7 | R2 — file storage | off |
   | 8 | AI Gateway — model calls | off |
   | 9 | Google sign-in — the OAuth clients now, the code with its first story | from *who signs in*: nobody → **off**, every visitor a guest; only you or a team → **on, for the admin app alone** — its first story keeps every other path open; everyone → **on** |
   | 10 | Claude routines — a daily bug sweep, a weekly review, a daily cleanup | **on** when people sign in — production then has users whose errors deserve a daily look; **off** for a public site. Optional either way: they spend the user's Claude plan, and off renders no routine files — turning them on later is a story |
   | 11 | The folder's own files — only when row 4's folder exists and holds some | each file to a place under `vibe/`: a design in `vibe/design/`, an offer or a pitch in `vibe/prd/`, rules and references in `vibe/reference/`, code of its own in `vibe/reference/legacy/` |
   | 12 | Apps · languages | from the interview |

   The domain must not be taken by another project of the user's: `wrangler whoami` and the zone
   list say what is there. The folder and `<owner>/<name>` may exist already — list the folder
   (row 11 is its files, by name, `.git` aside) and `gh repo view <owner>/<name>`; §4 and §5 say
   what follows.

   After **ok**, when `start.local.json` is missing or lacks a key the table settled (rows 3–5;
   `cf_account` from `wrangler whoami`; the dev account's name and subdomain, and
   `dev_shared_with`, once §3 has them): one question — *write them to `start.local.json` for the
   next project?* — and write it on a yes.

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

Node 22 or newer. `wrangler whoami` must name the **main** account — `cf_account` when
`start.local.json` names it, else the one that holds (or will hold) the domain; with several
accounts on the login, ask which; `wrangler login` is the user's, in an interactive terminal.
`gh auth status` must list `gh_account` when `start.local.json` names it; another account active →
`gh auth switch --user <gh_account>`, and switch back when the setup ends if the user says the
other is their default.

## 3. The dev account first — S4.1

The render needs dev's workers.dev subdomain, so the second account comes before anything is
written. One Blocker table: the account switcher (top left, the account's name) → **Create
Account** — a Free account, `<name> dev` (the user's login must be 7 days old; at most 5 Free
accounts); in it, **Workers & Pages** once, which asks for a workers.dev subdomain: `<name>-dev`, or
the nearest free one — **Account details → Subdomain** shows it later; *reply with the subdomain*. **Or an account that already is dev for another project** —
the user may name it (every resource name carries `<name>`, so projects share it without
colliding): its workers.dev subdomain is the answer, nothing is created, and the other project's
root goes into the answers as `dev_shared_with` — §7 reads it from `start.json`. With
`dev_account`, `dev_subdomain` and `dev_shared_with` in `start.local.json` this is that case, and
the table is one line to confirm. Then the domain,
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
   After a discovery, write `<root>/vibe/prd/discovery.md`: a title, the date, each question and
   the user's answer word for word, and the five-line summary they confirmed — P1 starts from it.

   **`<root>` already holds files** — render into an empty scratch folder instead, then copy in
   without overwriting: first every rendered path that already exists in `<root>` — any → stop and
   name them, the user decides; none → copy the scratch folder's contents in. Then move each of the
   user's files where row 11 agreed — a target that exists is a collision too.
2. In `<root>`: `git init -b main` — or, with a `.git` already there, keep it: no commits
   (`git rev-parse HEAD` fails) → `git symbolic-ref HEAD refs/heads/main`; commits → stop and ask.
   Then the user's identity when the GitHub account's differs from
   the global (`git config user.name`, `user.email` — `gh_account`'s and row 5's), and
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

Both are extras: a toggle that is off skips its part, and the log says so (`S6 — off: a public site,
nobody signs in`). Google for an admin area alone is the same clients and secrets — the scope is the
first story's.

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

Every check of `docs/SETUP.md` S8 run again. Log S8, commit, push — then the closer, one message in
this shape, every value read from the project (a check that is not green says so in its row, and
the banner says *almost*):

````markdown
```
╔══════════════════════════════════════════════════╗
║                                                  ║
║   ★  <MARKETING>  ·  up and running  ★           ║
║                                                  ║
║   local ✓    dev ✓    production ✓               ║
║                                                  ║
╚══════════════════════════════════════════════════╝
```

## Your environments

| | Address | What it is for | How it changes |
|---|---|---|---|
| **Local** | https://local.<domain> | You, on your laptop | `npm run dev` in `<root>\code`, when you want it |
| **Dev** | https://<name>-dev.<subdomain>.workers.dev | Every merged story, before production; each story's own preview | Behind Access — a code to <email>. I deploy it after each merge |
| **QA** (with QA) | https://qa.<domain> | The stop before production | `/ship qa` |
| **Production** | https://<domain> | Your users | `/ship prod` moves `env/prod`; Cloudflare builds and deploys it |

| Also | |
|---|---|
| The repository | https://github.com/<owner>/<name> |
| The decisions page | https://github.com/<owner>/<name>/blob/decisions/DECISIONS.md |
| Routines (when on) | the bug sweep and the weekly review, by their claude.ai links |
| Sign-in (when on) | Google, in *Testing*: only the test users you added can sign in |

## Left for later

Each step skipped or toggle left off, one line with why — and its row of
`vibe/dev/CHECKLIST-production.md` when production needs it before launch.

## What to do next

1. **Open a new Claude Code session in `<root>`** — in the desktop app: a new session, folder
   `<root>`; in a terminal: `cd <root>` then `claude`. This session stays in claude-pipeline-cf;
   the project's own skills load only there.
2. **Run `/pipeline`.** It reads where the project stands and goes on from there:
   - **P1 — what to build**: the PRD and the terminology, from <what the interview gave: the
     discovery notes, the offer, the design>, written with you and approved by you.
   - **P2 — how it looks and works**: a spec per app and the design documents, approved.
   - **Then the stories**, one at a time — `/open` writes one, `/run` builds it onto dev, where you
     accept it; `/ship prod` takes the accepted ones live.
3. Keep this session for a setup question; the project never needs it again.
````

Then offer that session — `start_session`, `cwd` the root, the brief "run /pipeline" — and start it
on a yes.

## Rules

1. **Never past a red check.** A step's check fails → say what was seen, and the step again; three
   times → stop and say so.
2. **Every id the agent writes is one it read** from a command's output, never typed from memory.
3. **The template is fixed here, not only there.** A defect the setup finds in a rendered file is
   fixed in `template/` and committed in this repository, and the same change made in the project.
4. **Nothing of the user's is touched outside `<root>`** but the hosts file, by the user, and
   `~/.wrangler`, by `wrangler login`.
