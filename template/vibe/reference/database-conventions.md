# Relational Database Conventions and Recommendations

## 0. Scope

This document defines how database objects are named, how tables relate to each other, how schema
changes are versioned and applied, and how application code is expected to read and write data. It
applies to any relational database: the only assumptions are SQL, primary keys, foreign keys,
indexes, transactions, and a versioned migration tool.

Examples use portable SQL. Where engines differ, the text says "check your engine" rather than
prescribing one. Rules are phrased as **must** / **never** (hard rules) and **prefer** (the default
unless a documented reason says otherwise).

---

## 1. Principles

1. **The schema is code.** The versioned migration chain applied to an empty database *is* the
   schema. There is no second copy: no init script, no DDL dump, no wiki page.
2. **One fact, one owner.** When the same value exists in several places (a column definition, a
   code constant, a client-side list, a test fixture), the database wins, and every copy is updated
   in the same change.
3. **Structure over discipline.** A rule that every developer must remember on every query will be
   forgotten on one of them. Put the rule in the query builder, the base model or the request
   chokepoint so that breaking it takes extra effort.
4. **Merged is not applied.** A migration file on the main branch says the SQL was written and
   reviewed. Only the migration history table on the target database says it ran.
5. **Humans execute migrations.** Tooling and automation author migration files; a person decides
   when they run, on every environment.
6. **The test database is not the production database.** A substitute engine used in tests accepts
   things the real engine rejects. Tests assert what the real engine would enforce.
7. **Fail loudly where a value is used; stay usable where a value is set.**
8. **Prefer deletion.** A vestigial column, a stale script or an unused table each cost a wrong
   answer later. Remove it, and record in the documentation why it is gone.

---

## 2. Naming

### 2.1 General rules

- All identifiers are lowercase `snake_case`, ASCII letters, digits and underscores only.
- Identifiers must not need quoting: no spaces, no reserved words, no leading digits.
- Keep identifiers at or below 63 characters (the tightest common engine limit).
- No abbreviations in table or column names except the fixed suffixes below (`_id`, `_guid`,
  `_rel_`, `_ref_`). Write `description`, not `desc`; `quantity`, not `qty`.
- Names describe what the object *is*, not how it is used today.

### 2.2 Tables

| Object | Convention | Example |
|---|---|---|
| Entity table | singular noun | `customer`, `order`, `product` |
| Relationship (join) table | `<entity1>_rel_<entity2>` | `user_rel_user_group`, `product_rel_tag` |
| One-to-one extension table | `<parent>_<aspect>` | `user_setting`, `order_shipping` |
| Child collection table | `<parent>_<child>` | `order_item`, `project_task` |
| Append-only log table | `<subject>_log` | `user_log`, `payment_log` |
| Reference (lookup) table | singular noun, same as any entity | `country`, `currency`, `file_type` |

Singular everywhere. `order`, not `orders`; `order_item`, not `order_items`.

### 2.3 Columns

Every column is prefixed with its table name. The prefix makes joined SELECTs unambiguous without
aliases and makes a search for a column's usage exact.

| Column kind | Convention | Example |
|---|---|---|
| Primary key | `<table>_id` | `order_id` |
| Public identifier | `<table>_guid` | `order_guid` |
| Attribute | `<table>_<attribute>` | `order_status`, `product_name` |
| Foreign key | `<parent_table>_id` (no own-table prefix) | `customer_id` on `order` |
| Foreign key with a role | `<parent_table>_id_as_<role>` | `user_id_as_approver`, `user_group_id_as_parent` |
| Boolean flag | `<table>_<flag>`; the three managed flags are `_active`, `_hidden`, `_block` | `product_active`, `product_hidden`, `product_featured` |
| Date only | `<table>_<event>_date` | `order_delivery_date` |
| Date and time | `<table>_<event>_time` or `_datetime` | `order_create_time` |
| Amount | `<table>_<what>_amount`; currency in a sibling `_currency` column | `order_total_amount`, `order_total_currency` |
| Count | `<table>_<what>_count` | `order_item_count` |
| Structured document (JSON) | `<table>_settings`, `_data`, `_content`, `_config`, `_snapshot` | `customer_settings`, `attempt_snapshot` |
| Enumerated value | `<table>_type`, `_status`, `_kind`, `_mode` | `order_status`, `payment_type` |
| Polymorphic reference | `<table>_ref_type` + `<table>_ref_id` | `attachment_ref_type`, `attachment_ref_id` |

Foreign-key columns are the one exception to the own-table prefix: they carry the *parent's* name
so that the same column name means the same thing in every table that has it (`customer_id` is
always the customer's primary key wherever it appears).

### 2.4 Constraints and indexes

Segments are separated by a **double underscore**. The column segment carries the **full column
name**, `_id` included.

| Object | Convention | Example |
|---|---|---|
| Primary key | engine default, or `PK__<table>` if the engine requires a name | `PK__order` |
| Unique index / constraint | `UNQ__<table>__<col>[__<col>]` | `UNQ__user__user_email`, `UNQ__order_item__order_id__product_id` |
| Non-unique index | `IDX__<table>__<col>[__<col>]` | `IDX__order__customer_id`, `IDX__order__customer_id__order_create_time` |
| Foreign key constraint | `FK__<child_table>__<parent_table>[__<role>]` | `FK__order__customer`, `FK__task__user__approver` |
| Check constraint | `CHK__<table>__<what>` | `CHK__order__order_total_amount_nonnegative` |

Rules:

- The FK name's second segment is the **parent table**, never the column. `FK__user__language`,
  not `FK__user__language_id`.
- Two FKs from the same child to the same parent get a role suffix on both the column and the
  constraint: `FK__task__user__owner` (`user_id_as_owner`) and `FK__task__user__approver`
  (`user_id_as_approver`).
- **Name the index that backs a foreign key explicitly.** If you declare an FK without one, engines
  that auto-create the index name it after the constraint, and an "index" called `FK__…` appears.
- Index and constraint names are unique per schema, not per table; the table segment guarantees it.
- Tables owned by a framework or a library (authorisation tables, job queues, migration history)
  keep the names the library wrote. Do not rename them and do not report them as drift.
- To fix a wrong index name, rename it in place (`ALTER TABLE … RENAME INDEX`, `ALTER INDEX …
  RENAME TO`, depending on the engine). Do not drop and recreate: when the index is the only one
  backing an FK, the drop fails or silently degrades the FK.
- To fix a wrong FK name on engines without rename-constraint syntax: drop the constraint and add
  it again with identical columns and actions, in one migration.

### 2.5 Polymorphic references

When one column must point at rows in different tables depending on a discriminator:

- Name the pair `<table>_ref_type` (an enumerated column listing the allowed target tables) and
  `<table>_ref_id` (the target row's primary key).
- `_ref_id` carries **no foreign key**: a single FK cannot be polymorphic. The pairing is enforced
  in the application layer, and the table's documentation says so.
- The table's own primary key still follows `<table>_id`.
- Prefer a real FK per target (`order_id NULL`, `invoice_id NULL`, with a CHECK that exactly one is
  set) when the set of targets is small and stable. Use the polymorphic pair when the set is open.

### 2.6 Complete example

```sql
CREATE TABLE order_item
(
    order_item_id           INTEGER      NOT NULL,        -- auto-generated, see 3.1
    order_item_guid         CHAR(36)     NOT NULL,
    order_id                INTEGER      NOT NULL,
    product_id              INTEGER      NOT NULL,
    user_id_as_packer       INTEGER      NULL,
    order_item_quantity     INTEGER      NOT NULL DEFAULT 1,
    order_item_unit_amount  DECIMAL(12,2) NOT NULL,
    order_item_unit_currency CHAR(3)     NOT NULL,
    order_item_status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    order_item_gift         BOOLEAN      NOT NULL DEFAULT FALSE,
    order_item_hidden       BOOLEAN      NOT NULL DEFAULT FALSE,
    order_item_options      JSON         NULL,
    order_item_create_time  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT PK__order_item PRIMARY KEY (order_item_id),
    CONSTRAINT UNQ__order_item__order_item_guid UNIQUE (order_item_guid),
    CONSTRAINT UNQ__order_item__order_id__product_id UNIQUE (order_id, product_id),
    CONSTRAINT CHK__order_item__order_item_quantity_positive CHECK (order_item_quantity > 0),
    CONSTRAINT CHK__order_item__order_item_status
        CHECK (order_item_status IN ('PENDING', 'PACKED', 'SHIPPED', 'CANCELLED')),
    CONSTRAINT FK__order_item__order
        FOREIGN KEY (order_id) REFERENCES "order" (order_id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK__order_item__product
        FOREIGN KEY (product_id) REFERENCES product (product_id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT FK__order_item__user__packer
        FOREIGN KEY (user_id_as_packer) REFERENCES "user" (user_id)
        ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE INDEX IDX__order_item__product_id ON order_item (product_id);
CREATE INDEX IDX__order_item__user_id_as_packer ON order_item (user_id_as_packer);
-- No IDX__order_item__order_id: the unique (order_id, product_id) already leads with order_id.
```

(`order` and `user` are reserved words in several engines; avoid both as table names in a new
schema. They are used here only because they are familiar.)

---

## 3. Keys and identifiers

### 3.1 Primary keys

- Every table has a primary key.
- Entity tables use a **surrogate integer** primary key, `<table>_id`, generated by the engine
  (identity column, sequence or auto-increment). Choose a 64-bit integer for any table that can
  grow past two billion rows.
- **Composite natural keys** are correct for relationship tables (`(user_id, user_group_id)`),
  per-parent child rows (`(order_id, product_id)`) and append-only logs
  (`(user_id, user_log_time, user_log_action)`). They need no surrogate id and no GUID.
- **One-to-one extension tables reuse the parent's primary key** (`user_setting.user_id` is both
  primary key and foreign key).
- An auto-generated key never moves backwards. Once an explicit value is inserted, the generator
  remembers the highest value. Never rely on "the next id" after seeding with explicit ids.

### 3.2 Public identifiers

- Integer primary keys are **internal**: they join, they index, they never appear in a URL, an API
  response, a client-side type or a log meant for users.
- Every entity that is addressed from outside the database carries `<table>_guid` (UUID, 36
  characters, unique index). External callers work in GUIDs end to end.
- Small global lookup tables (countries, currencies, file types) may expose their integer ids when
  those ids are identical on every environment. Document the exception per table.
- A GUID that is *copied* from an external document and therefore repeats (one value per parent)
  must be documented as non-unique, and every lookup on it is prefixed by the parent's key.

### 3.3 Seed and reference ids

- Keep seed ids of reference rows identical on every environment when code, tests or integrations
  depend on them.
- Everything created by hand (through an administration screen) has different ids per
  environment. Any script or migration that refers to such rows resolves them **by their natural
  key** (name, code, key column), never by integer id.

---

## 4. Column types

| Kind | Rule |
|---|---|
| Boolean | Use one boolean type everywhere (`BOOLEAN`, or the engine's equivalent). Never `CHAR(1)` with `'Y'`/`'N'`, never a nullable boolean when two states are meant. |
| Date and time | Store UTC. Use a type without zone (`TIMESTAMP`/`DATETIME`) with every writer converting to UTC, or a zone-aware type with the session fixed to UTC. Never store local time. |
| Date only | A date type, not a datetime at midnight. |
| Text | `VARCHAR(n)` with a real limit for names, codes and keys; `TEXT` for free prose. The limit is validated in the application with the same value. |
| Unicode | Full 4-byte UTF-8 on the database, every table, and **every connection**. Some engines have a 3-byte "utf8" that fails on emoji and other supplementary characters the first time one appears in a comparison. Verify the connection charset of every new component that talks to the database. |
| Money and quantities | `DECIMAL(p,s)`, never floating point. Currency in a sibling column when more than one currency is possible. |
| Enumerated values | Prefer `VARCHAR` + `CHECK (col IN (...))`, or a lookup table when values carry attributes or change at runtime. Native `ENUM` types are acceptable where the engine has them, but altering them is expensive; decide once per schema. Values are `UPPER_SNAKE_CASE`. |
| Structured documents (JSON) | For configuration whose shape evolves and for write-once snapshots. Never for anything the application aggregates or filters on. See section 10. |
| Binary | Store files outside the database (object storage) and keep the key, size, content type and checksum in a row. Prefer one JSON column per file, `{ key, byteCount, contentType, checksum }`, validated in code; a field that is *filtered on* still earns its own column beside the document (section 10). |
| NULL | `NOT NULL` with a default unless the absence of a value is meaningful. Document the meaning of NULL when it is allowed ("NULL = platform default", "NULL = not yet assigned"). |

Rules for enumerated columns wherever they live:

- The allowed values exist in at least three places: the database constraint, the application
  constant, and any client-side list that drives a picker. Adding or removing a value updates all of
  them in the same change.
- Constants live in the generated or base layer of the model, never in a hand-written subclass that
  a regeneration can wipe.

---

## 5. Relations

### 5.1 Foreign keys

- Every reference between tables is a declared foreign key. Application-enforced "soft" references
  are allowed only where a real FK is impossible (polymorphic targets, references into a row that is
  deleted and recreated) and are documented as such.
- Every foreign key column has an index, named explicitly (2.4).
- Referential actions default to `ON UPDATE NO ACTION ON DELETE NO ACTION`. `CASCADE` and
  `SET NULL` are opt-in, decided per relation, and recorded in the migration's comment as a design
  decision ("deleting a thread hard-deletes its replies, reactions and mentions").
- Where the application also deletes children explicitly inside the same transaction (so that
  behaviour is identical on a test engine without FK enforcement), say so next to the cascade.
- A foreign key to a lookup table whose rows are cached in the application is still declared; the
  cache is a read optimisation, not a substitute for integrity.

### 5.2 Relationship (join) tables

- Composite primary key `(a_id, b_id)`, in the order that matches the most common lookup, plus an
  index on the second column alone for the reverse lookup.
- FKs to both parents.
- Optional `<a>_rel_<b>_settings` (JSON) for per-relation configuration and
  `<a>_rel_<b>_create_time` when the UI shows when the link was made.
- A column that a never-built feature left behind is either dropped or documented as vestigial
  ("always 0, never written, never read; kept to avoid a no-value migration"). Never gate behaviour
  on a vestigial column.
- Business uniqueness that an index cannot express ("one primary group per account") is enforced at
  the single point in code that creates the row, and the table's documentation names that point.

### 5.3 One-to-one extensions

- Split a wide entity into `<parent>` and `<parent>_<aspect>` (settings, statistics, secrets) when
  the aspect is optional, large, differently secured or differently cached.
- The extension's primary key is the parent's key; there is no second surrogate id and no second
  GUID.
- The parent's row is created first; the extension row is created in the same transaction when the
  application requires it to exist.
- **The extension holds what cannot have a system default.** A value with a system default is
  configuration and belongs in the settings rows (section 10.2), not in a column — otherwise the same
  value has two homes.
- **An extension table carries no foreign key besides its parent's.** It holds values — credentials,
  counters, documents — not relations. A column that points at another table belongs on the parent,
  however optional it is.

### 5.4 Self-references and trees

- A tree stores only the direct edge: `<table>_id_as_parent NULL` (NULL = root).
- Resolve ancestry, descendants and inherited rights **at read time** with a recursive query seeded
  from the direct rows. Do not materialise inherited rows; there is then nothing to re-materialise
  when the tree changes, and every change takes effect on the next read.
- Use `UNION` (not `UNION ALL`) in the recursive part so a cycle cannot loop forever, and validate
  at write time that a node is not made its own ancestor.
- Inactive intermediate nodes stay in the walk (rights still flow through them) but are not returned
  as rows.
- Counts that roll up (members under a subtree) are computed by the same walk; counts that must not
  roll up (items attached at exactly this node) are direct-edge counts. Name both distinctly.

```sql
WITH RECURSIVE ancestor AS (
    SELECT g.user_group_id, g.user_group_id_as_parent
    FROM user_rel_user_group m
    JOIN user_group g ON g.user_group_id = m.user_group_id
    WHERE m.user_id = :user_id
  UNION
    SELECT p.user_group_id, p.user_group_id_as_parent
    FROM user_group p
    JOIN ancestor a ON p.user_group_id = a.user_group_id_as_parent
)
SELECT DISTINCT user_group_id FROM ancestor;
```

### 5.5 Scoping column (owner, account, organisation, workspace)

When rows are partitioned by an owner (an account, an organisation, a workspace), the following
applies to every table that holds owned data. Global reference tables do not carry the column.

- The scoping column (`account_id` in these examples) is on **every** owned table, including child
  tables that could reach it through the parent. Denormalising it onto children keeps aggregation
  queries free of the parent join and lets every index lead with it.
- Every query on an owned table filters on the scoping column. The value comes from the verified
  session, never from a request parameter.
- The data-access layer applies the filter by default (9.2). Passing an empty scope to a scoped
  finder **throws**; it never silently returns everything. A deliberate unscoped read is spelled out
  explicitly so it can be found by search.
- Composite indexes on owned tables lead with the scoping column:
  `IDX__order__account_id__order_create_time`.
- Compound foreign keys that include the scoping column
  (`FOREIGN KEY (user_id, account_id) REFERENCES "user" (user_id, account_id)`) let the database
  itself refuse a row that mixes owners. They require a composite unique index on each parent.
  Decide once, schema-wide, whether to adopt them; if not, the application layer is the sole
  enforcement, and the review checklist (14.3) covers the ways code escapes it.
- A row whose scoping column is NULL means "the global default" only where the table's
  documentation says so; such a column is a *scope*, not an owner, and is the one case where a
  migration may touch rows in a table that has the column (8.5).
- The scoping column decides what a migration may contain (8.5): tables without it hold system
  data, tables with it hold content.

### 5.6 Fan-out versus a shared row

When one write must be visible in several scopes (a post to every group, a notice to every member),
choose deliberately and document the choice in the table comment:

- **Shared row keyed by a NULL scope column**: `user_group_id NULL` means "every group",
  a value means "that group only". One write; reactions and counters pool; per-scope replies carry
  their own scope.
- **Fan-out, one row per target**: only when the author chose a hand-picked subset. Each copy is
  independent afterwards.
- **Recipient on the row, audience resolved at read**: the row carries `recipient_type` +
  `recipient_id`; who can see it is computed from the existing membership graph at read time. No
  materialised inbox table. A per-(row, reader) "seen" table is written lazily on first sight, never
  pre-populated.

### 5.7 Append-only logs

- Composite primary key `(subject_id, <log>_time, <log>_action)`, no GUID, no soft delete, no
  updates ever.
- Written through a fail-safe wrapper that never lets a logging failure break the caller.
- Facts are derived from the log (`MAX(user_log_time) WHERE user_log_action = 'LOGIN'`) rather than
  copied into a column on the subject that will drift.

### 5.8 Snapshots versus rows

For a "run", "attempt" or "execution" record:

- The record is created at start and finalised at end; repeats append new rows (history per run).
- Anything analytics will **aggregate** (per-item scores, per-step results) lives as **rows** in a
  child table with the scoping column denormalised onto it.
- Anything that is **display-only** (a transcript, the configuration at run time, a result blob)
  lives as a **JSON snapshot** on the record, written once at finalise.
- The record carries the **external correlation key** (session id, job id) used by logs and caches,
  so a row always joins to its diagnostics. Do not snapshot what the log system already holds;
  snapshot what the log system will expire and the UI still needs.
- A re-run replaces the child rows and the snapshot unless a reader needs the history of runs; the
  table comment says which.

---

## 6. Lifecycle columns

### 6.1 Soft delete and the active toggle

Two flags, two meanings. A table gets one or both according to what it needs.

| Flag | Meaning | Who reads past it |
|---|---|---|
| `<table>_hidden` | soft-delete tombstone; hidden is gone | nobody |
| `<table>_active` | enable/disable toggle an administrator can reverse | administration screens, cache loaders that must hold every row, write-before-read paths that must find the row in any state |

- The data-access layer applies `<table>_hidden = FALSE` and `<table>_active = TRUE` by default on
  the query's root table. Opt-outs are explicit and named (`showHidden()`, `showInactive()`).
- `delete()` on the model writes **both** flags. A table with only `_active` therefore gets a
  one-flag tombstone from `delete()`, and deleted rows become indistinguishable from deactivated
  ones. Give a table both columns if it needs both deletion and deactivation.
- Default filters apply to the **root table only**, never to joined tables. Every joined table that
  has the flags needs its own explicit conditions.
- Raw SQL has no default filters. When raw SQL is required, it carries both conditions explicitly
  and a comment saying why it is raw.
- Shared read functions are active-only by default and take a trailing `show_inactive` flag that
  only administrative callers set. Never create a parallel `get_active_x()` beside `get_x()`.
- On an end-user path the active filter is an **access boundary**: deactivating a user, archiving a
  record or disabling an account takes effect on the next request. The failure mode is silent
  (nothing throws), which is why it has its own review list (14.4).
- Hard-delete is reserved for rows whose absence is the whole point (thread cascade, expired
  tokens, log retention) and is stated in the table's comment.

### 6.2 Audit timestamps

Choose one change-tracking strategy for the schema and apply it uniformly:

- **Audit log strategy**: a central hook on the model base emits one structured log line per
  insert/update/delete with a per-column `{old, new}` diff. Tables then carry **no**
  `created_by` / `updated_at` / `updated_by` columns for audit purposes. A `<table>_create_time` is
  added only when the UI must render or sort by it, and the column comment marks it as an
  "audit exception" so nobody adds the full set by habit.
- **Audit columns strategy**: every table carries `<table>_create_time`, `<table>_update_time`, and
  where users act, `user_id_as_creator` / `user_id_as_updater`, maintained by the model base, never
  by hand and never by triggers.

Either way:

- Timestamps are UTC (section 4).
- Derived facts ("last login") are computed from logs, not stored on the entity.

---

## 7. Indexes and constraints

- Every foreign key has an explicitly named index (2.4).
- Do not add a single-column index on a column that is already the leading column of the primary
  key or of another index. It duplicates the work for write and space cost.
- Composite indexes are ordered by selectivity of the query they serve, with the scoping column
  first where one exists (5.5).
- A unique constraint exists for every uniqueness the application assumes. The application's own
  uniqueness validation exists to produce a friendly message *before* the constraint fires, not
  instead of it.
- A unique index on a nullable column behaves differently per engine (most allow many NULLs). When
  you rely on that (pending rows without an external id coexist), say so in a comment.
- CHECK constraints guard invariants that do not depend on other rows: non-negative amounts, a
  closed set of status values, "exactly one of these two columns is set".
- Partial or filtered indexes (where supported) are the right tool for "unique among active rows".
- **No stored procedures, functions or triggers** for business logic. Logic lives in the
  application or in explicit migrations, where it is reviewed, tested and versioned. If a trigger
  is unavoidable (an engine-specific integrity rule), it must be idempotent, cheap, documented with
  purpose / inputs / side effects, and free of session state.
- Views are acceptable for read models; they are versioned like any other object and named
  `<name>_view`.

---

## 8. Migrations

### 8.1 Tooling

**Two things about D1 that a generated rebuild gets wrong**, both found in FND and both worth
knowing before the next table changes shape:

1. **`PRAGMA foreign_keys` does nothing.** A migration runs inside a transaction and SQLite refuses
   to change that pragma in one, so the twelve-step rebuild's first instruction is unavailable and
   drizzle emits it anyway. `PRAGMA defer_foreign_keys=ON` is what D1 offers instead.
2. **Deferring defers the check, not the counting.** `DROP TABLE <parent>` raises the deferred
   counter once per referencing child row, and re-creating the parent under the same name never
   lowers it again — so the COMMIT fails with `FOREIGN KEY constraint failed` and
   `PRAGMA foreign_key_check` reports nothing. **Rename the parent instead of dropping it**: the
   rename moves no rows and rewrites the children's `REFERENCES` clauses to follow it, the new table
   is built beside it, each child is rebuilt to point back at the new name, and the old table is
   dropped last, referenced by nobody.

**`drizzle-kit` generates; `wrangler d1 migrations apply` executes.**

Three behaviors are the reason to use a tool at all, and this pair provides them: a recorded history
of what was applied, a stable order, and a refusal to re-run or re-order what is already in. Drizzle
keeps `migrations/meta/_journal.json` beside the files; wrangler keeps the `d1_migrations` table on
each database.

Keep two things separate: the **files in the repository** and the **history on each database**. Only
the second is environment state, and only the second answers *did it run* (8.7).

### 8.2 File naming

`drizzle-kit` owns the filename. Always pass `--name`, or it invents one:

```bash
npx drizzle-kit generate --name {{prefix}}_12_add_order_note
```

```
{NNNN}_{{prefix}}_{n}_{snake_case_description}.sql

0003_{{prefix}}_12_add_order_note.sql
0004_{{prefix}}_12_backfill_order_note.sql
0005_{{prefix}}_18_drop_order_legacy_note.sql
```

- `NNNN` is drizzle's own sequence. It is assigned at generation, never chosen and never edited.
- The description **leads with the story index**, `{{prefix}}_<n>`, then a short `snake_case` summary. The
  index is the traceability. A version names a ship, never a file (`ENVIRONMENTS.md`).
- **No date in the filename.** Git has the date, and `_journal.json` has the timestamp.
- One story may generate several files; they keep their sequence and apply in it.

### 8.3 One sequence, assigned at generation

There is no release cut and no promotion step: a version is cut per ship and carries
whatever files are on `main`, so no file waits for one. A file is numbered the moment it is
generated, and that number is its place in the chain forever.

1. The developer generates the file with `--name` as in 8.2, on the story's branch.
2. Review is on the SQL content (8.6), not on the number.
3. **Two branches that both generate migrations collide**, and the collision is real: two files with
   the same `NNNN`, and two `_journal.json` entries git cannot merge meaningfully. With one
   developer this does not arise. When it does — keep one, regenerate the other against the merged
   schema, and never hand-edit the journal.
4. The chain applies to each environment in order — the story's preview copy, dev, QA, production —
   by the pipeline (8.6).

### 8.4 Immutability

**Never edit, rename or delete a migration that has been applied to any environment.** Drizzle's
journal and wrangler's `d1_migrations` table both key on the filename; the only *fix* afterwards is
hand-editing history on a live database.

An unapplied file — generated on a branch, approved by nobody, run nowhere — is still mutable, and
regenerating it beats patching it. The moment it runs anywhere, local included, it is frozen.

There is no CI gate on this today (`TECH-STACK.md` §9 rules out GitHub Actions for now). The rule
is enforced at review, and by the pipeline reading the target's history rather than the repository
(8.7).

### 8.5 What a migration may contain

A migration contains **structure** (tables, columns, indexes, constraints, views) and **system
data** (rows in reference tables that are identical on every environment). It never contains
content data.

| Kind | Test | Examples |
|---|---|---|
| System data: allowed | the table has **no** scoping column; rows are the same everywhere | `country`, `currency`, `file_type`, `setting_catalog`, authorisation items |
| Content data: never | the table **has** a scoping column; rows belong to an owner and differ per environment | `customer`, `order`, `user`, `document` |

- Content changes are performed by an administrator through the application and documented as a
  **runbook** (target, value, per environment). A migration that inserts or edits owned rows is
  unreviewable (a fix and a data leak look the same), unrepeatable (ids and GUIDs differ per
  environment) and invisible to the application's caches and consistency logic.
- System-data statements are **idempotent**: `INSERT … WHERE NOT EXISTS`, `MERGE` / upsert, or an
  `UPDATE … WHERE col = '<old value>'` guard per key so a deliberate per-environment change made by
  an administrator survives the migration.
- References to other rows are resolved **by natural key** inside the migration (`SELECT … WHERE
  code = 'X'`), and the statement skips cleanly when the target does not exist.
- The runbook that accompanies a data migration lists the application caches to clear afterwards;
  raw SQL bypasses the application's invalidation hooks (section 10).
- No migration for "no value" changes: a harmless vestigial column stays and is documented; an
  unused scaffold table with no readers or writers is dropped.
- A file that exists on a release branch and is deliberately absent from the trunk is not a gap.
  Check ancestry, then ask the author, before restoring anything a commit message does not explain.

### 8.6 The SQL is approved, then the pipeline runs it

The gate is on the **SQL**, not on the keystroke: nobody should be hand-running commands the pipeline exists to run.

Migration files are **authored** by developers and by tooling (scripts, code generators, AI
assistants). They are **approved** by the product owner, reading the SQL. They are then **executed by
the pipeline**, as part of delivering the change to an environment.

- **Approval is once, for every environment.** The story's decision card (`/run` R2) shows the
  file and names where it applies — the preview's copy, dev, QA, production — and that answer carries
  it everywhere; the user reads the SQL once, and the pipeline runs it. *(FND first approved per
  environment — three yeses on the same file, because the rows differ and so does the cost of being
  wrong. That argument stands as the reason the one approval shows every statement, what it does to
  rows that already exist, and production by name.)*
- **Approval is of a specific file.** SQL edited after approval is unapproved SQL.
- **What approval requires being shown:** every statement, what it does to rows that already exist,
  whether it is reversible, and the pending list from the target itself (8.7) so the set being
  applied is the set that was read.
- **Unapproved SQL is never applied.** No mechanism is exempt: not the migration CLI, not a raw
  database client, not *just locally*, not *to keep the history consistent*.
- Generating a file, or loading it into a throwaway SQLite to check it, is not executing it and
  needs no approval.

The pipeline skills that carry this are `run` (the approval, R2; the preview copy, R4; dev, R5),
and `ship` — `/ship qa` and `/ship prod`, with a D1 Time Travel bookmark before production's.

### 8.7 Merged is not applied

A migration on `main` and a closed story say the SQL was written and reviewed. Neither says it ran.
The only authority is the target database's own history:

```bash
npx wrangler d1 migrations list {{name}}-prod -c apps/api/wrangler.jsonc --env production --remote
```

```sql
-- or read it directly
SELECT id, name, applied_at FROM d1_migrations ORDER BY id DESC LIMIT 5;
```

- Before writing "applied", "fixed live", "dropped" or "gone" about any object, query the target.
- For an environment nobody can query from a working session, claims are **inferred** and written
  as inferred ("it is on `main`, therefore expected on production"), never as observed.
- Read the migration that shipped, not the story that planned it.
### 8.8 Schema change and code sync

Every migration that adds, removes or retypes a column updates, **in the same pull request**:

| Copy | What changes |
|---|---|
| Model / entity definition | property and type, nullability, validation rule (`required` if `NOT NULL` without default, length limit, FK existence, allowed values), label |
| Any subclass that redeclares validation rules | mirror the rule, or the base rule is shadowed and never runs |
| Enumeration constants | on the base or generated layer |
| Client-side mirrored lists | the array behind any user-facing picker |
| Test fixture builder | the helper that creates the table and seed rows for the test engine |
| API schema | response shapes, sort enumerations, allowed values |
| Data-model documentation | purpose, relations, JSON contracts, behavioural rules (not column lists; the schema is the column list) |

A schema change without the code sync is an incomplete change and is rejected at review.

### 8.9 Forward-only

- Migrations are forward-only. A mistake is corrected by a new migration, never by editing or
  reverting an applied one.
- **Destructive changes (drop column, drop table) ship after the code that stopped reading the
  object is live** — a later story, or at minimum a later deploy — so rolling the application back
  does not need a schema rollback. This is why the pipeline runs additive migrations *before* the
  deploy and destructive ones *after* it.
- Renames are done as add-new, backfill, switch the code, drop-old, across separate stories — never
  as a single `RENAME COLUMN` on a live table with running code.
- Large backfills run in batches, outside the transaction that changes structure, with a resumable
  cursor.

### 8.10 Tool configuration

- `drizzle.config.ts` generates only; it holds no credentials and needs no `driver`. Wrangler holds
  the connection, per environment, in `../code/apps/api/wrangler.jsonc`. Secrets are never in either
  (`dev/SETUP.md`).
- **Always list the pending set before applying.** `wrangler d1 migrations apply` applies **every**
  pending file, not just the story's — and the list is what gets shown for approval (8.6).
- The local database is `{{name}}-local --local`, a SQLite file of its own. Applying
  locally proves the SQL parses and runs; it proves nothing about production's data.

---

## 9. Data access

### 9.1 Parameterised queries

All SQL is parameterised. Values are never concatenated into SQL text, regardless of where the
value came from. This is a review blocker.

### 9.2 One access layer per table

- Every table has one access class (repository, helper) that owns its queries. Application code
  calls it; it never calls the ORM's raw finders (`Model.find()`, `findOne(...)`) directly.
- The access class applies the scoping filter (5.5), the lifecycle defaults (6.1), caching (section
  10) and the table's bespoke joins. A raw finder skips all four silently.
- The scoped finder `find(scope_id)` puts the scope in the query **structurally**; an
  `and_where(scope_id = …)` added by hand is incidental and gets dropped in the next refactor.
- Access classes are side-effect free so that request handlers, background jobs and command-line
  tools can share them.
- Models that carry a scoping column receive it in the constructor, never as a later property
  assignment.

### 9.3 Know the ORM's silent behaviours

Every query builder has cases where a wrong shape produces a wrong result without an error. Learn
the ones yours has and write a regression test for each. Typical shapes:

- A result set indexed by primary key silently collapses joined rows (one row per parent survives).
  Leave the primary key out of the SELECT, or index explicitly.
- A keyed condition placed where a positional operand is expected loses its key, and the filter
  disappears (`WHERE (5) AND …` is always true). Each column filter is its own sub-condition. A test
  with rows for two owners catches the leak; a single-owner test cannot.
- A composite `IN` on several columns expects rows keyed by column name; positional rows silently
  match nothing.
- A subclass that redeclares validation rules shadows the base class's rules (8.8).

### 9.4 Reader and writer connections

If reads go to a replica:

- Every request that writes reads from the **writer** for its whole lifetime. Route by request
  shape at one chokepoint, first match wins: any non-read HTTP verb → writer, unconditionally;
  administrative or impersonation sessions → writer; a read-verb action that is known to write
  (declared per action) → writer; everything else → reader.
- A read-verb endpoint that writes (a `GET` that creates a progress row on first access) **must**
  declare the writer, or its pre-write read runs on the lagging replica and the second call inserts
  a duplicate key.
- A negative gate on an unpinned read ("not registered", "no access") that depends on a row a
  *previous* request wrote re-checks a miss **once** on the writer. No sleep, no retry loop.
- A read whose result the same request then modifies and writes back must read the writer
  explicitly; a stale-but-present row passes a null check and corrupts the merge.
- **Never** add timed retries or sleep loops around reads to paper over replica lag. They cannot
  be swept and production lag outruns them.
- Bulk static writes (`update_all`, `delete_all`) must route to the writer explicitly; on many
  ORMs they dispatch through the default (reader) connection and fail only where the reader user is
  read-only, which is production.
- Background jobs that read their own writes swap the read connection to the writer for the job's
  lifetime and restore it in `finally`.
- A log line whenever a write executes on a request that was not routed to the writer, with an
  alert on it, keeps the routing map from rotting. A test that walks every registered route and
  checks its routing does the same in CI.

### 9.5 Transactions and validation

- Validation that queries the database (FK existence, uniqueness) runs on the read connection and
  cannot see rows inserted but not yet committed on the write connection. Inside a write
  transaction, validate before the transaction or save without validation for rows the code
  constructs itself, and only for those.
- Replace-then-insert in one transaction (delete all children, re-insert) saves without validation
  for the same reason: the uniqueness check still sees the old rows.
- Denormalised counters and "last activity" columns on a parent are updated inside the same
  transaction as the child row.
- Writes are idempotent where the operation allows it: a toggle adds if absent and removes if
  present and returns the resulting state; removing something already removed returns
  `removed: false`, not "not found"; re-running a soft-delete cascade is a no-op.
- Lifecycle hooks that fan out further writes are documented; where they would deadlock inside an
  outer explicit transaction, the outer transaction is deliberately omitted, upstream validation is
  the integrity gate, and the method's comment says so.

### 9.6 Lists: search, sort, pagination

- Every list endpoint filters, sorts and paginates **server-side**. No client-side filtering of an
  in-memory array, however small the table; no "fetch all rows" flag on a list endpoint.
- Offset pagination (`page`, `limit`, `sort`, `order`, `search`) for administrative lists; keyset
  pagination (`before` cursor + `limit`, returning `has_more` and `next_cursor`) for feeds ordered
  by a computed key such as `COALESCE(last_reply_time, create_time) DESC` plus the id as a
  tiebreaker.
- Mark "seen" or "delivered" only for the page actually returned.
- Clients debounce search input, skip one-character terms, and keep the previous page visible while
  the next request is in flight, so the server sees a sane request rate.

### 9.7 What leaves the server

- No internal integer primary keys in any response; select them internally, map them out
  explicitly before serialising.
- No backend-only fields on end-user payloads (rubrics, prompts, internal configuration).
- Timestamps leave as UTC (ISO-8601 with `Z`, or a documented naive-UTC format), and clients parse
  them as UTC. A zone-less string handed to a client date parser is interpreted as local time and
  every rendered time shifts by the viewer's offset. One shared `parse_server_date()` on the client
  appends the zone marker to naive values; no raw `new Date(string)` on server timestamps.
- Wire keys for privileged UI gates are opaque and display-only; the server check is the boundary.

---

## 10. Reference data and configuration rows

### 10.1 Caching reference tables

- Global lookup tables are cached whole (one document per table, keyed `table:<name>`), loaded
  through the table's access class with lifecycle filters switched off (the cache must hold every
  row).
- Reads of reference data go through the access class's cache method, never a direct query. A
  direct query is one database round-trip per request on a hot path.
- Request validation of a reference id uses the cached id set, not a per-request existence query.
- The model base clears the table's cache key on every write. Raw SQL (migrations, manual edits)
  bypasses that hook; the runbook names the keys to clear.
- Cache values are strings (serialise on write, deserialise on read) unless the cache layer
  serialises for you; know which, and write a test that pins it.
- Caches of owned data include the scoping id in the key.
- An administration page that lists cached tables (with presence and row count, without warming
  cold keys), peeks at one, clears one, or clears all, replaces shell access for routine operations.
- Cache invalidation is best-effort: a failure in the cache layer never breaks the write path.

### 10.2 Configuration stored in rows

- The stored row **is** the configuration. Changing a default in code does nothing on an environment
  that already stores a value. A "change the default" task ships a guarded data migration for
  system tables (8.5) or a runbook for owned rows, plus the cache clear.
- Two reads, and the difference matters:

  | Read | Used by | Behaviour |
  |---|---|---|
  | `resolve()` | everything that *consumes* a setting | **strict**: a missing key or an invalid value throws an error that names the setting and the key |
  | `resolve_for_editing()` | the settings screen and the write path's base document | **lenient, but reports**: every key resolves (falling back to the catalog default) and the unset keys are returned as a `missing` list the screen shows as "not applied yet" |

- The write path starts from the stored document, not from the request body, so a client that
  predates a key cannot wipe it.
- Documents are normalised on read: merge the stored document over the catalog default, coerce
  types, drop unknown keys.
- Every new configuration key ships with a control on the settings screen in the same release, and
  the deployment checklist verifies the target environment holds a value before promotion.
- Secrets inside configuration documents are encrypted at rest with a key from the environment; the
  encrypt step is idempotent, the decrypt step tolerates plaintext, and read responses mask the
  value. Rotation is by re-entry.

---

## 11. Testing

### 11.1 The test engine masks the real engine

A lightweight substitute engine in tests accepts things the real engine rejects. Design tests that
would fail on the real engine's behaviour:

| Masked behaviour | Test-side mitigation |
|---|---|
| Datetime format (the substitute stores any string) | assert the stored string's format |
| Arrays or objects assigned to a JSON column | always serialise before write |
| Charset and collation mismatches | one integration test with a supplementary-plane character in a comparison |
| Bulk write on the read connection | force the read connection read-only in the test harness |
| Validation inside a write transaction seeing uncommitted rows | read and write connections must be **separate sessions** in the harness, never one shared handle |
| No foreign-key enforcement | delete children explicitly in the transaction so the code path is identical |
| Read-replica lag | a local replica with a deliberate, fixed delay (11.4) |

### 11.2 Fixtures

- The fixture builder creates every table in FK-safe order from the model definitions and applies a
  base seed. A new table or column updates it in the same pull request (8.8).
- Seed rows that persist across tests within a class leak any mutation to later tests. Mutate a
  dedicated row with its own id, or restore state at the end of the test.
- Base-class ladder for database tests: no database (pure logic) → one shared schema per run
  (read-only assertions) → fresh schema per class (tests that write) → fresh schema per test (write
  then read in the same test). Default to the shared schema; escalate only when writes pollute.

### 11.3 A regression guard per class of bug

Every database defect leaves behind one test that fails if the *class* of bug returns, not just the
instance: routing of bulk writes, validation inside transactions, two-owner tests for every
operator-format condition, a route-walk test for read/write routing, a stored-format assertion for
datetime writes, a serialisation assertion for cache writes.

### 11.4 Local replica with a fixed delay

Run a real second database instance locally, replicating from the primary with a deliberate delay
of about one second, and point the application's read connection at it. Read-after-write races that
are intermittent in production become deterministic locally. Do not remove the delay; change it only
by hand for a specific reproduction.

---

## 12. Operations

- **Read-only by default, writes explicit.** Two database users (reader, writer). Do not assume the
  reader is privilege-restricted on every environment; the query wrapper script enforces read-only
  and requires an explicit flag to write with the writer user. Any tool-driven SQL access is
  configured with writes disabled at the tool layer as well.
- **Do not hard-code environment facts.** Schema names, hosts, ports and credentials come from the
  environment. A rolling schema name is resolved at run time, never typed into a script.
- **After a manual edit** to a reference table, clear that table's cache key; do not flush the whole
  cache. Saving through the application clears the key itself.
- **Before claiming a migration ran**, query the history table (8.7).
- **Read-after-write fingerprints**: a create that returns an error while the row exists; a false
  "no access" right after a grant with nothing in the logs; a UI that keeps the old state until
  refresh after a successful save; a duplicate-key error on the second call to a read-verb endpoint
  that writes. All four are routing gaps (9.4), reproducible only with a lagging replica (11.4).
- **Change tracking** is queried from the audit log by entity id and time; manual business events go
  through one helper, never ad-hoc log calls.

---

## 13. Security

- The scope (owner, account, organisation) comes from the verified session, never from a request
  parameter, path identifier or body field. A client-supplied scope hint is acceptable only for
  anonymous pre-login endpoints; when a session is present it is validated and it outranks the hint,
  and a hint that disagrees with the session is rejected, not overridden.
- An unresolved scope is a **rejection, never a default**. A placeholder scope is `0` or `NULL`,
  never a real id.
- Self-service endpoints ("my profile", "my organisation's settings") derive their target from the
  session. Only explicitly cross-scope routes accept a target identifier, and they are gated to the
  role allowed to cross scopes. The two families share bodies through private helpers; only the row
  resolution differs.
- Every authenticated request re-checks at one chokepoint that the subject (and its owner) is still
  active, using the already active-only access methods, uncached. A long-lived token otherwise
  keeps working after deactivation until it expires. The refusal is the same generic "invalid
  session" response as a bad signature. The same re-check applies wherever an issued credential
  outlives the decision (password-reset links, invitation links).
- An impersonation or preview session that has no identity in the viewed scope gets an explicit
  empty identity, never a cross-scope lookup, and every write on that surface is refused
  server-side.
- Parameterised queries everywhere (9.1).
- Secrets at rest are encrypted, masked on read, rotated by re-entry (10.2).
- No internal ids, no backend-only fields, no descriptive privilege flags on the wire (9.7).
- Server-side fetches of stored URLs (link previews, callbacks) are guarded against internal
  addresses on every redirect hop, with a short timeout and a size cap.

---

## 14. Checklists

### 14.1 New table

- [ ] Singular `snake_case` name; every column prefixed with the table name (2.3).
- [ ] `<table>_id` surrogate key, or a documented composite / parent-reuse key (3.1).
- [ ] `<table>_guid` with a unique index if the entity is addressed from outside (3.2).
- [ ] Scoping column if the data is owned (5.5); composite indexes lead with it.
- [ ] `_hidden` and/or `_active` with the meaning of each decided (6.1).
- [ ] Timestamps per the schema's audit strategy (6.2); UTC.
- [ ] Every FK declared, with `NO ACTION` unless cascade is a recorded decision, and an explicitly
      named backing index (5.1, 7).
- [ ] Index and constraint names follow the grammar (2.4).
- [ ] Enumerated columns constrained; constants and client lists updated (section 4).
- [ ] JSON columns have a shape validator and a normaliser (10.2).
- [ ] Full UTF-8 charset (section 4).
- [ ] No stored programs, no triggers (7).
- [ ] A header comment in the migration explains the design: rows versus snapshots, what is
      deliberately absent, which references are soft.
- [ ] Model, subclass rules, fixture builder, API schema, documentation updated in the same pull
      request (8.8).

### 14.2 New migration

- [ ] Generated with `drizzle-kit generate --name {{prefix}}_<n>_<description>`; the number is drizzle's (8.2, 8.3).
- [ ] Structure and system data only; owned rows are changed by a runbook (8.5).
- [ ] System-data statements are idempotent and guarded on the previous value.
- [ ] Cross-row references resolved by natural key.
- [ ] Runbook lists caches to clear and the history-table check.
- [ ] No migration file that has run anywhere was touched (8.4).
- [ ] The SQL was shown in full and approved at the story's decision card before it ran anywhere (8.6).

### 14.3 Review of a data-access change

- [ ] Reads go through the table's access class with the scope supplied; no scope opt-out where the
      scope is known; no opt-out on global tables (9.2).
- [ ] Joined tables carry their own lifecycle conditions; raw SQL carries both and says why it is
      raw (6.1).
- [ ] Bulk writes route to the writer; read-verb actions that write declare the writer; negative
      gates writer-confirm once; no sleeps, no retries (9.4).
- [ ] Writes inside transactions skip validation only for rows the code constructs (9.5).
- [ ] Operator-format conditions have each filter as its own sub-condition; the test covers two
      owners (9.3).
- [ ] JSON serialised before write; datetimes in the stored format; cache values serialised (11.1).
- [ ] No internal ids in the response mapper or the client types (9.7).
- [ ] Reference-data reads use the cache method; validators use the cached id set (10.1).

### 14.4 Review of an end-user read path (access boundary)

- [ ] Any raw SQL on the path lacking the `_active` / `_hidden` conditions?
- [ ] Any joined table lacking them?
- [ ] Any shared function hard-coding "show inactive"? Make it a flag only administrative callers
      set.
- [ ] Does the chokepoint re-check the subject's active state on every request, uncached?
- [ ] Any response carrying an internal id, a backend-only field or a descriptive privilege flag?
- [ ] For every filter *added*: does a legitimate administrative caller (admin screen, preview,
      write-before-read re-enable) read the same function and now lose the row?

### 14.5 Deployment (database part)

- [ ] `info` before `migrate`; only the expected versions are pending.
- [ ] A person runs `migrate`; tooling does not.
- [ ] The history table on the target confirms success before anyone writes "applied".
- [ ] Caches named in the runbook are cleared after raw-SQL data changes.
- [ ] New configuration keys hold a value on the target before promotion; a person confirms.
- [ ] Claims about an environment nobody queried are written as inferred.

---

## Appendix A: SQL patterns

Idempotent system-data insert:

```sql
INSERT INTO file_type (file_type_id, file_type_code, file_type_hidden)
SELECT 15, 'CAPTION', FALSE
WHERE NOT EXISTS (SELECT 1 FROM file_type WHERE file_type_id = 15);
```

Guarded retune of a stored default (replaces only the stale seed value; an administrator's own
value survives):

```sql
UPDATE setting
SET    setting_value = 'low'
WHERE  setting_key   = 'analysis.eagerness'
  AND  setting_value = 'medium';
```

Reference by natural key inside a migration:

```sql
INSERT INTO setting_default (setting_key, model_id)
SELECT 'transcription.model', m.model_id
FROM   model m
WHERE  m.model_code = 'transcribe-v2'
  AND  NOT EXISTS (SELECT 1 FROM setting_default d WHERE d.setting_key = 'transcription.model');
```

Rename an index in place and fix an FK name:

```sql
ALTER TABLE task RENAME INDEX idx_task_owner TO IDX__task__user_id_as_owner;   -- engine syntax varies

ALTER TABLE "user" DROP CONSTRAINT FK__user__language_id;
ALTER TABLE "user"
    ADD CONSTRAINT FK__user__language
    FOREIGN KEY (language_id) REFERENCES language (language_id)
    ON UPDATE NO ACTION ON DELETE NO ACTION;
```

Exactly one of two nullable references set:

```sql
ALTER TABLE attachment
    ADD CONSTRAINT CHK__attachment__one_target
    CHECK ((order_id IS NULL) <> (invoice_id IS NULL));
```

## Appendix B: Engine-specific points to verify

Check these once per engine and record the answers in the project's own documentation:

- The boolean type, and how it is written in DDL and in literals.
- Identity / sequence / auto-increment syntax, and whether the generator can be reset.
- Whether native enumerated types exist and how costly it is to alter them.
- Whether JSON is validated, indexable, or both.
- The datetime types available and whether any of them carry a zone.
- The default character set of a new database and of a new connection; whether a 3-byte "utf8"
  exists.
- Rename syntax for indexes and constraints.
- How a unique index treats NULLs.
- Support for recursive CTEs and partial (filtered) indexes.
- Identifier length limit and case folding.
- How to configure a replica with a deliberate apply delay for local testing.

## Appendix C: Vocabulary

| Term | Meaning in this document |
|---|---|
| Scoping column | the column that partitions owned rows (`account_id`, `organisation_id`, `workspace_id`) |
| System data | reference rows with no scoping column, identical on every environment |
| Content data | owned rows; never touched by migrations |
| Reader / writer | the two database connections when a replica serves reads |
| Writer-confirm | re-checking a reader miss once on the writer; no sleep, no loop |
| Access class | the one class per table that owns its queries (repository, helper) |
| Promote | move a feature SQL file into the versioned migration folder with its version prefix |
| Runbook | the human steps that accompany a change: administrative edits, cache clears, history checks |
| Audit exception | a `_create_time` column added for display under the audit-log strategy |
