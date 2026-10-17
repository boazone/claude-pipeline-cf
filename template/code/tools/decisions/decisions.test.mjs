import { expect, it } from "vitest";
import { items, page, pick, story, waiting } from "./index.mjs";

// The decisions page from the repo alone: fixture logs and plans, no git.

const KEY = "Database: a column for the cover";
const plan = `# {{PREFIX}}-9 — plan

## Decisions

### ${KEY}

### Security: who sees it

## Defaults

1. Copy *Cover* — rules out *image*.
2. A long one that wraps
   onto a second line. To overturn: say *no wrap*.

## Out of scope
`;
const log = (...lines) => `# {{PREFIX}}-9 — log\n\n${lines.map((l) => `## 2026-10-10 — ${l}\n`).join("\n")}`;
const make = (index, status, entries, p = plan) => ({
  index,
  url: `https://github.com/o/r/blob/main/tasks/${index}/story.md`,
  title: `Title of ${index}`,
  status,
  log: log(...entries),
  plan: p,
});

it("picks the branch's copy only when its log is strictly longer", () => {
  const main = { log: log("R1: plan") };
  expect(pick(main, { log: log("R1: plan") })).toBe(main);
  const branch = { log: log("R1: plan", "R3: point 1") };
  expect(pick(main, branch)).toBe(branch);
  expect(pick(undefined, branch)).toBe(branch);
});

it("reads a story's title and status", () => {
  expect(story("# {{PREFIX}}-9 — A title\n\n| | |\n| --- | --- |\n| **Status** | in progress |\n")).toEqual({
    title: "A title",
    status: "in progress",
  });
});

it("a decision waits until answered, refused or no longer planned", () => {
  const other = "Security: who sees it";
  const entries = [`R2: B1 ${KEY} — waiting`, `R2: B2 ${other} — waiting`, `R2: B3 Architecture: gone — waiting`];
  expect(waiting(log(...entries), plan)).toEqual([KEY, other]);
  expect(waiting(log(...entries, `R2: B1 ${KEY} answered — "B1 1"`), plan)).toEqual([other]);
  expect(waiting(log(...entries, `R2: B2 ${other} refused — "no"`), plan)).toEqual([KEY]);
  // An answer with text after its quote is still an answer.
  expect(waiting(log(...entries, `R2: B2 ${other} answered — “yes” on the phone`), plan)).toEqual([KEY]);
  // A plan heading's backticks are not in the log's key ({{PREFIX}}-69's B3); a `###` outside *Decisions* is no decision.
  const ticked = "Architecture: rollback moves `env/prod` back";
  const plan2 = `## Decisions\n\n### ${ticked}\n\n## Verification\n\n### Security: a heading, not a decision\n`;
  const entries2 = [
    "R2: B3 Architecture: rollback moves env/prod back — waiting",
    "R2: B4 Security: a heading, not a decision — waiting",
  ];
  expect(waiting(log(...entries2), plan2)).toEqual([ticked]);
});

it("joins a default's continuation lines", () => {
  expect(items(plan, "Defaults")).toEqual([
    "Copy *Cover* — rules out *image*.",
    "A long one that wraps onto a second line. To overturn: say *no wrap*.",
  ]);
});

it("the page lists each kind, and each default with its story and how to overturn it", () => {
  const text = page(
    [
      make("{{PREFIX}}-1", "in progress", [`R2: B1 ${KEY} — waiting`]),
      make("{{PREFIX}}-2", "blocked", ["R3: blocked — the same failure three times"], ""),
      make("{{PREFIX}}-3", "dev", ["R5: on dev abc"]),
      make("{{PREFIX}}-4", "open", ["opened"], ""),
      make("{{PREFIX}}-5", "accepted", ["R7: accepted"], ""),
      make("{{PREFIX}}-6", "qa", [], ""),
      make("{{PREFIX}}-7", "prod", [], plan),
    ],
    "2026-10-10 20:00 UTC",
  );
  const part = (title) => text.split(`## ${title}\n`)[1].split("\n## ")[0];

  expect(text).toContain("Generated 2026-10-10 20:00 UTC");
  expect(part("Decision cards waiting")).toContain(
    `{{PREFIX}}-1](https://github.com/o/r/blob/main/tasks/{{PREFIX}}-1/story.md) — Title of {{PREFIX}}-1: **${KEY}**`,
  );
  expect(part("Blocked")).toContain("{{PREFIX}}-2");
  expect(part("Blocked")).toContain("R3: blocked — the same failure three times");
  expect(part("Waiting for your accept — on dev")).toContain("`/pipeline {{PREFIX}}-3 accepted`");
  expect(part("Accepted — waiting to ship")).toContain("`/pipeline {{PREFIX}}-5 ship`");
  expect(part("Open")).toContain("{{PREFIX}}-4");

  const defaults = part("Defaults the agent took");
  expect(defaults).toContain("### [{{PREFIX}}-1]");
  expect(defaults).toContain(
    "To overturn one: reply in {{PREFIX}}-1's session — *default <k>: <what instead>*.\n\n1. Copy *Cover*",
  );
  expect(defaults).toContain("### [{{PREFIX}}-3]");
  expect(defaults).toContain("To overturn one: `/pipeline {{PREFIX}}-3 notes default <k>: <what instead>`.");
  expect(defaults).toContain("2. A long one that wraps onto a second line. To overturn: say *no wrap*.\n");
  expect(defaults).not.toContain("{{PREFIX}}-7");
  expect(part("Bug candidates — `tasks/SWEEP.md`")).toContain("Not on `main` yet.");
  expect(text).toContain("On QA, waiting for production: 1 stories.");
});

it("copies the sweep's and the review's files in, their title dropped and their headings one level down", () => {
  const sweep =
    "# Bug candidates\n\nLast run: 2026-10-13 03:05 UTC — 2 rows\n\n| Kind | Count |\n| --- | --- |\n| QA · ERROR · API · `boom` | 2 |\n";
  const review =
    "# Weekly review\n\nLast run: never\n\n## Security\n\n### A sub-heading\n\nNothing yet. A `# ` inside a line stays.\n";
  const text = page([], "2026-10-13 04:00 UTC", { sweep, review });
  const part = (title) => text.split(`## ${title}\n`)[1].split("\n## ")[0];
  expect(part("Bug candidates — `tasks/SWEEP.md`")).toBe(
    "\nLast run: 2026-10-13 03:05 UTC — 2 rows\n\n| Kind | Count |\n| --- | --- |\n| QA · ERROR · API · `boom` | 2 |\n",
  );
  expect(part("Weekly review — `tasks/REVIEW.md`")).toContain(
    "Last run: never\n\n### Security\n\n#### A sub-heading\n\nNothing yet. A `# ` inside a line stays.",
  );
  expect(text).not.toContain("# Weekly review\n");
});
