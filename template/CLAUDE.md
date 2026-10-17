# {{PREFIX}} — repo root

**Everything an LLM needs is in [`vibe/`](vibe/).** Read [`vibe/CLAUDE.md`](vibe/CLAUDE.md) first —
it is the real instruction file, and its table says which document to open for what. Then
[`vibe/TERMINOLOGY.md`](vibe/TERMINOLOGY.md), which is binding and outranks every other document in
this repo, including the PRD.

```
vibe/    every document — PRD, terminology, specs, design, stack, environments, changelogs
tasks/   one folder per story; tasks/INDEX.md is the register
code/    the npm workspace — apps/, tools/ — see code/README.md
```

This file exists only because tools look for a `CLAUDE.md` at the repo root. It is a signpost, not
the instructions.

Two rules that hold even if you read nothing else:

- **The technical name is `{{name}}`** (`{{PREFIX}}` for stories), in identifiers, folders and
  package names. **{{marketing}}** is the marketing name, on user-facing surfaces only.
- **`/pipeline` is the one command.** It reads where the project and each story are from the repo
  alone, never from memory or the thread.
