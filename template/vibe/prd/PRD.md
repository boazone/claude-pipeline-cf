# {{marketing}} — product requirements

> **Terminology.** This document uses the locked vocabulary of [`TERMINOLOGY.md`](../TERMINOLOGY.md).

| | |
|---|---|
| **Status** | draft — `/plan` (P1) writes it with the user; *approved* is the user's word, logged here with its date |
| **Written** | {{today}} |
| **Approved** | — |

## 0. Map

| § | What |
|---|---|
| 1 | The problem |
| 2 | Who uses it — the roles |
| 3 | Goals, and what is deliberately not a goal |
| 4 | Functional requirements, `FR-nnn` |
| 5 | Non-functional requirements, `NFR-nnn` |
| 6 | Stages — what ships first |
| 7 | The data model |
| 8 | Open questions |

## 1. The problem

{{description}}

## 2. Who uses it

## 3. Goals and non-goals

## 4. Functional requirements

Numbered `FR-<area><nn>` — `FR-101`, `FR-102` for the first area. Each is one line a story can
name, with its acceptance in a sentence.

## 5. Non-functional requirements

`NFR-nnn` — performance, availability, security, accessibility, privacy, cost.
<!-- {{#i18n}} -->
Several languages and both directions are a requirement here: the day-one languages, the
right-to-left one the mirror pass is run in, and whether a language ships whole or not at all
(`reference/i18n-and-rtl.md` §1).
<!-- {{/i18n}} -->

## 6. Stages

What Stage 1 holds — the first production release — and what waits in `BACKLOG.md`.

## 7. The data model

Tables, their keys and relations, in the grammar of `reference/database-conventions.md`. The first
migration after the scaffold's `system_log` comes from here.

## 8. Open questions

None yet.
