import { expect, it } from "vitest";
import { BATCH, kind, merge, parse, render, since, sweep } from "./index.mjs";

// The sweep over fixtures and a fake fetch: no database, no git.

const NOW = new Date("2026-10-13T03:05:00Z");
const row = (time, message, extra = {}) => ({
  time,
  level: "ERROR",
  source: "API",
  message,
  ray: "8a1b2c3d4e5f6071",
  ...extra,
});
const empty = render(new Map(), "2026-10-01 03:00:00", "nothing yet");


/** The environments a project with QA sweeps; `index.mjs` reads the real list from `wrangler.jsonc`. */
const BOTH = ["QA", "PRODUCTION"];
it("masks what changes between two rows of one kind, and what is personal", () => {
  const a = kind(
    "QA",
    row("", "Verdict 12 timed out after 30 s for 3f2a9c1e-0000-4000-8000-0000000000aa ray 8a1b2c3d4e5f6071"),
  );
  const b = kind(
    "QA",
    row("", "Verdict 7 timed out   after 45 s for 11111111-2222-4333-8444-555555555555 ray 0000ffff0000ffff"),
  );
  expect(a).toBe(b);
  expect(a).toBe("QA · ERROR · API · `Verdict # timed out after # s for <guid> ray <hex>`");
  expect(kind("PRODUCTION", row("", "a | pipe"))).toContain("a \\| pipe");
  expect(
    kind("QA", row("", "sign-in failed for host@example.com at https://{{domain}}/host?x=1 sha 0123456789abcdef0123")),
  ).toBe("QA · ERROR · API · `sign-in failed for <email> at <url> sha <hex>`");
  // The cut comes before the escaping, so a trailing pipe never leaves a bare backslash.
  expect(kind("QA", row("", `${"x".repeat(119)}|y`))).toContain(`${"x".repeat(119)}\\|\``);
});

it("round-trips the file", () => {
  const kinds = new Map([
    ["QA · ERROR · API · `boom`", { count: 3, first: "2026-10-10", last: "2026-10-12", ray: "abc" }],
  ]);
  const text = render(kinds, "2026-10-13 03:05:00", "3 rows");
  expect(parse(text)).toEqual({ lastRun: "2026-10-13 03:05:00", kinds });
  expect(parse(empty).kinds.size).toBe(0);
  expect(parse("# nothing")).toEqual({ lastRun: "never", kinds: new Map() });
  expect(parse(render(new Map(), "never", "seeded"))).toEqual({ lastRun: "never", kinds: new Map() });
});

it("reads from the last run, or seven days back on the first", () => {
  expect(since("2026-10-12 03:05:17", NOW)).toBe("2026-10-12 03:05:17");
  expect(since("never", NOW)).toBe("2026-10-06 03:05:00");
});

it("counts a known kind up, adds a new one, drops a kind not seen for 30 days", () => {
  const known = "QA · ERROR · API · `boom`";
  const kinds = new Map([
    [known, { count: 3, first: "2026-10-10", last: "2026-10-12", ray: "old" }],
    ["QA · FATAL · RUN · `stale`", { count: 9, first: "2026-08-01", last: "2026-09-01", ray: "x" }],
  ]);
  const rows = [
    { environment: "QA", row: row("2026-10-13 01:00:00", "boom") },
    { environment: "QA", row: row("2026-10-09 01:00:00", "boom", { ray: "earlier" }) },
    { environment: "PRODUCTION", row: row("2026-10-13 02:00:00", "new thing 42", { level: "FATAL" }) },
  ];
  const out = merge(kinds, rows, NOW);
  expect(out.get(known)).toEqual({ count: 5, first: "2026-10-09", last: "2026-10-13", ray: "8a1b2c3d4e5f6071" });
  expect(out.get("PRODUCTION · FATAL · API · `new thing #`")).toEqual({
    count: 1,
    first: "2026-10-13",
    last: "2026-10-13",
    ray: "8a1b2c3d4e5f6071",
  });
  expect(out.has("QA · FATAL · RUN · `stale`")).toBe(false);
});

it("sweeps both databases in a closed window and says what it did", async () => {
  const asked = [];
  const fetchRows = async (environment, from, to) => {
    asked.push([environment, from, to]);
    return environment === "QA" ? [row("2026-10-12 10:00:00", "boom")] : [];
  };
  const text = await sweep(empty, fetchRows, NOW, BOTH);
  expect(asked).toEqual([
    ["QA", "2026-10-01 03:00:00", "2026-10-13 03:05:00"],
    ["PRODUCTION", "2026-10-01 03:00:00", "2026-10-13 03:05:00"],
  ]);
  expect(text).toContain("Last run: 2026-10-13 03:05:00 UTC — 1 rows since 2026-10-01 03:00:00 UTC, 1 kinds, 1 new");
  expect(text).toContain("| QA · ERROR · API · `boom` | 1 | 2026-10-12 | 2026-10-12 | 8a1b2c3d4e5f6071 |");
});

it("stops the read point at a cut batch, so the rows behind it are read next time", async () => {
  const full = Array.from({ length: BATCH }, (_, i) =>
    row(`2026-10-12 10:${String(i % 60).padStart(2, "0")}:00`, "flood"),
  );
  full.at(-1).time = "2026-10-12 11:00:00";
  const text = await sweep(empty, async (environment) => (environment === "PRODUCTION" ? full : []), NOW, BOTH);
  expect(parse(text).lastRun).toBe("2026-10-12 11:00:00");
  expect(text).toContain(`| PRODUCTION · ERROR · API · \`flood\` | ${BATCH} |`);
});

it("keeps the table and the read point when a database fails", async () => {
  const before = render(
    new Map([["QA · ERROR · API · `boom`", { count: 3, first: "2026-10-10", last: "2026-10-12", ray: "r" }]]),
    "2026-10-12 03:05:00",
    "ok",
  );
  const text = await sweep(
    before,
    async (environment) => {
      if (environment === "PRODUCTION") throw new Error("401 on PRODUCTION");
      return [row("2026-10-12 10:00:00", "boom")];
    },
    NOW,
    BOTH,
  );
  expect(text).toContain(
    "Last run: 2026-10-12 03:05:00 UTC — failed at 2026-10-13 03:05:00 UTC: 401 on PRODUCTION — table unchanged",
  );
  expect(text).toContain("| QA · ERROR · API · `boom` | 3 | 2026-10-10 | 2026-10-12 | r |");
  // The next run reads from the last run that succeeded, so nothing between is lost.
  expect(parse(text).lastRun).toBe("2026-10-12 03:05:00");
});
