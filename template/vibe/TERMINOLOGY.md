# Terminology — authoritative

**Status:** draft — written at P1 (`/plan`), locked when the user approves the PRD. Until then every
word below except §1 and §2 is a proposal.
**Scope:** every document, spec, wireframe, artifact, screen, piece of UI copy, table name, column,
API field, event name, variable, branch and commit message in this project.

**This file outranks every other document.** Where it and any other doc disagree, this file is
right and the other doc is wrong — fix the other doc. `prd/PRD.md` stays authoritative for *what the
product does*; this file is authoritative for *what things are called*.

---

## 0. How every future process uses this file

1. **Read this file before writing anything** — a spec, a screen, a schema, a migration, a commit, a
   prompt to a model, a message to the user.
2. **The words here are not suggestions.** They are the only words. A synonym that reads better in a
   sentence is still wrong.
3. **A term that isn't here doesn't exist yet.** If you need one, propose it, get it confirmed, and
   add it to this file **in the same turn** — before the term appears anywhere else.
4. **If a term here turns out to be wrong, change it here first**, then everywhere else. Never work
   around it locally.
5. **Renaming is not optional cleanup.** When a doc is touched for any reason, its terminology is
   brought in line as part of that edit.

---

## 1. The name

**The technical name is `{{name}}`**, and stories are `{{PREFIX}}-<n>`. It is the name of the repo,
the folder, packages, identifiers, environment prefixes, hostnames, branches and every document.

**The marketing name is {{marketing}}.** It replaces `{{name}}` on user-facing surfaces only —
screens, copy, the site, anything a user reads. Nothing in code, folders or packages moves because
of it. Keeping the two apart is the reason the technical name exists.

---

## 2. The system

**system** = everything: every app, the API, the database.

<!-- {{#multiapp}} -->
| App | Path | What it is |
|---|---|---|
<!-- {{#apps}} -->
| **{{app}} app** | `/{{app}}/*` | *to be written at P1* |
<!-- {{/apps}} -->

One Worker serves every app on one origin, each under its own path, beside `/api/*`.
<!-- {{/multiapp}} -->
<!-- {{^multiapp}} -->
One app — the **{{app_first}} app** — at `/`, and the API at `/api/*`. A second app, when one comes,
takes a path of its own, `/<app>/*`, beside it.
<!-- {{/multiapp}} -->

---

## 3. Roles

*Written at P1: who uses the system, one word each, and what each may do.*

## 4. The domain

*Written at P1: the nouns of the product, each with a one-line definition.*

## 5. Retired words

| Never | Use | Why |
|---|---|---|

## 6. Code and the data model

A table, column or API field uses the word of this file, in `snake_case` in the database and
`camelCase` in TypeScript (`reference/database-conventions.md` §2).

## 7. Open

*A proposed word waiting for the user.*

## 8. Changelog

| Date | Change |
|---|---|
| {{today}} | Written by `/start`: §1 and §2. |
