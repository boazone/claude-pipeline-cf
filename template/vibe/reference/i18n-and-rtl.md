{{#i18n}}
# Several languages and both directions — how to build it

> **Terminology.** This document uses the locked vocabulary of [`TERMINOLOGY.md`](../TERMINOLOGY.md).

| | |
|---|---|
| **Status** | binding for every app; written by `/start` {{today}} from what FND learned building it |

**Read this before you write any interface string, layout or stylesheet.** Each rule is stated once,
here. The PRD's §5 names the languages; the design documents point here. An app the PRD exempts —
an internal admin app, English and left to right — says so in its own design document, and nothing
below leaks into it.

## 1. What the requirements fix — written at P1

1. **The day-one languages**, and the right-to-left one the mirror pass is run in.
2. **A language is a release**: it ships with every string translated, or it does not ship. No
   runtime loading, no fallback chain, no missing-key path, no translation table.
3. **No string is built in code.**
4. **RTL is verified, not assumed** — a screen-by-screen pass per story that touches a screen.
5. **The interface language and a content's language are two things** when users write content:
   never read one from the other.
6. **User content is never translated.**

## 2. Strings

1. **One typed dictionary per language.** One file holds the `Copy` interface and nothing else; each
   language is a module typed by it. The compiler is the completeness check — a missing key does
   not build. **No i18n library.**
2. **A component reads copy through a hook**, never an imported constant — a constant does not
   re-render when the language changes.
3. **A sentence is one entry.** Never join a label, a number and another label in a component: word
   order moves between languages.
4. **A sentence with a number is a function** in the dictionary — `items: (n) => …` — and **the
   plural rule lives in that language's file**, next to the sentence.
5. **A sentence with a link or a control keeps its whole text** and marks the slot — `{terms}` — and
   the component renders it through one `fill()` that returns the pieces in the sentence's order. An
   unknown slot stays visible as `{oops}` rather than vanishing.
6. **Paragraphs are arrays**, not one string.
7. **Each language file opens with its glossary** — the word it uses for each term of
   `TERMINOLOGY.md` — and holds to it in every string.
8. **A language is named in itself** — *English*, *עברית*, *Español*. **No flags**: a flag is a
   country, not a language.
9. **Translate the meaning, not the words**; record such a choice in the file's header.
10. **Write every string 2× longer than English will fit.** Nothing is sized to its English length.

## 3. Which language is showing

1. **One store** (`useSyncExternalStore`), no context provider. One list of the languages the build
   ships.
2. **Resolution, in order:** the account's choice → the last language this device used
   (`localStorage`) → the first of `navigator.languages` the build ships, matched on the base code
   (`he-IL` is `he`) → English.
3. **Every switch writes the device**, so a screen shown before the account is known still opens in
   the user's language.

## 4. Direction

1. **`dir` and `lang` go on `<html>`, from the language, and nowhere else.** Never a per-component
   `dir` for layout, never from a hostname or a locale guess.
2. **Restore both when an app unmounts** when several apps share one document — what was there
   before the app mounted.
3. **Switching is live**: the store changes, `<html dir>` follows, every screen mirrors in place. No
   reload.

## 5. CSS

1. **Logical properties only** — `margin-inline-start`, `padding-inline`, `inset-inline-end`,
   `text-align: start`. **No `left` or `right` in any stylesheet**, and no `translateX` for a layout
   position. This one rule is what makes `<html dir>` enough.
2. **Flex and grid with `gap`**, never sibling margins — flex rows follow `dir` by themselves.
3. **No physical `background-position`** for an icon that should mirror.
4. **Leading and trailing, not left and right**, in class names, comments and documents.
5. **A value inside a `transform` does not mirror** — the one place logical properties stop
   working. Flip its sign under `[dir="rtl"]`, and re-derive it rather than negate it when the
   element's borders have already mirrored.

## 6. Content that is not ours

1. **User content is `dir="auto"`**, rendered exactly as typed. **A field the user types into** opens
   in the content's language — `dir="rtl"` or `dir="ltr"` from it — because `auto` reads the text
   already in the control, so an empty one is always left to right.
2. **Our sentence around user content takes the frame's direction; the content is isolated inside
   it** — `<bdi>`, or first-strong isolates. `dir="auto"` on our own sentence lets a user's name pick
   the direction and reads it backwards.
3. **Numerals stay left to right inside RTL text** — in their own inline element with
   `unicode-bidi: isolate`, or `<bdi>`.
4. **Brand names do not translate or mirror.**

## 7. Icons

**Icons that point mirror; icons that depict do not.** A back chevron, a *next* arrow and a progress
direction flip under `dir="rtl"`; a camera, a gear and a check mark do not.

## 8. Fonts

A face per script the languages need, checked against the weight ramp the design uses, in one font
stack so per-glyph fallback does the split. A new script needs its face checked before its language
ships.

## 9. Adding a language

1. A module beside the others, typed by `Copy`, with its glossary header and its plural rules.
2. Its code in the list the build ships.
3. A face for its script, if the stack does not cover it.
4. The passes in §10, in that language.
5. A release — the language is offered only once it is out.

## 10. Verifying — every story that adds or changes a screen, in its `log.md`

1. **The mirror pass** — in the RTL language, every screen the story touches: `<html dir="rtl">`;
   leading items on the right; pointing icons flipped, depicting icons not; numerals in order; user
   content in its own direction.
2. **The length pass** — in the longest language, at phone width: nothing clipped, nothing past the
   gutter, no button label wrapped.
3. **The switch** — change the language with a sheet open: everything flips in place.
4. **Keyboard and targets** — in each language, Tab reaches every control with a visible ring, and
   every target is at least 44px.
5. **The typecheck** — a dictionary missing a key fails here.
6. **The copy read** — the user reads new strings in each language; a draft that merges unread is
   recorded as such.
{{/i18n}}
