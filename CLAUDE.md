# claude-pipeline-cf

A Claude Code project that sets up a new product repository and its CI/CD pipeline on Cloudflare,
from what FND learned. Read [`PLAN.md`](PLAN.md) first: what this is, the decisions and the
defaults. Then:

| You need | Read |
|---|---|
| to set up a new project | run `/start` — `.claude/skills/start/SKILL.md` |
| your own defaults for `/start` — email, accounts, folder | `start.local.json`, git-ignored; copy `start.local.example.json` |
| why the pipeline has the steps it has | `docs/PIPELINE.md` |
| what must exist on Cloudflare, GitHub and the machine, and who creates it | `docs/SETUP.md` |
| what the new project gets | `template/` — rendered with the answers |
| the decisions this repository was built on | `PLAN.md` |

`scripts/render.mjs` fills `template/` from the answers — `{{key}}` placeholders, `{{#flag}}…{{/flag}}`
and `{{^flag}}…{{/flag}}` blocks, `{{#apps}}…{{/apps}}` loops, `__app__` in a path — and refuses an
unknown key. `node --test scripts/render.test.mjs` is its check; `scripts/example-answers.json` and
`scripts/example-single.json` are the two shapes to render when `template/` changes, each into a
short, empty folder, then `npm install`, `npm run format` and `node verify.mjs` in its `code/`.
Nothing in `template/` is run from here.

Rules that hold in every project this makes:

- **The repository is the only state.** A skill reads the repository, never memory or the thread.
- **Nothing is committed to `main` or an `env/*` branch directly** but the pipeline's bookkeeping.
- **Free tiers only.** Cloudflare Free, GitHub Free; the gates run on the laptop.
- **Dev is a separate Cloudflare account**, the agent's; production is reached through the
  pipeline, behind a guard that asks.
