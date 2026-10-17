# claude-pipeline-cf

A Claude Code project that sets up a new product repository and its CI/CD pipeline on Cloudflare,
from what FND learned. Read [`PLAN.md`](PLAN.md) first: what this is, the decisions and the
defaults. Then:

| You need | Read |
|---|---|
| to set up a new project | run `/start` — `.claude/skills/start/SKILL.md` |
| why the pipeline has the steps it has | `docs/PIPELINE.md` |
| what must exist on Cloudflare, GitHub and the machine, and who creates it | `docs/SETUP.md` |
| what the new project gets | `template/` — copied with the placeholders filled |

Placeholders in `template/` are `{{name}}`, `{{PREFIX}}`, `{{marketing}}`, `{{domain}}`,
`{{root}}`, `{{email}}`, `{{gh_owner}}`, `{{dev_subdomain}}`; `/start` fills every one. Nothing
in `template/` is run from here.

Rules that hold in every project this makes:

- **The repository is the only state.** A skill reads the repository, never memory or the thread.
- **Nothing is committed to `main` or an `env/*` branch directly** but the pipeline's bookkeeping.
- **Free tiers only.** Cloudflare Free, GitHub Free; the gates run on the laptop.
- **Dev is a separate Cloudflare account**, the agent's; production is reached through the
  pipeline, behind a guard that asks.
