# Changelog — the system

> **Terminology.** This document uses the locked vocabulary of [`TERMINOLOGY.md`](../TERMINOLOGY.md).

**This is the changelog users read.** What changed, in their words — what they can now do, what
they will see. Never a file name, a table name or a technical reason. The technical changelogs are
per app, beside this file{{#multiapp}}: {{#apps}}[`{{app}}.md`]({{app}}.md) · {{/apps}}{{/multiapp}}{{^multiapp}}: [`{{name}}.md`]({{name}}.md){{/multiapp}}.

1. **A change is carried by its story index**, `{{PREFIX}}-<n>`, at the start of the line. **A
   version names a ship.**
2. `## Not shipped` is what is built and not yet on `{{domain}}`. `## Shipped` is by version, newest
   first — `### v0.1.0 — {{#qa}}QA <date> · {{/qa}}production <date>`.
3. A change nobody outside the team would notice gets no line here.

## Not shipped

## Shipped
