import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Test protection, a step of `npm run verify`. Against the commit this branch shares with
 * `origin/main`: no test file that is there may be gone here — from the working tree or from what is
 * staged; a rename is not a deletion — and no number in `coverage-floor.json` may be lower here than
 * there, a glob's own numbers included. The floor itself is enforced by Vitest's thresholds
 * (`vitest.config.ts`); this only keeps it from going down.
 */
// A commit hook exports GIT_DIR and no GIT_WORK_TREE, so git below — run in code/ — takes code/
// for the work tree's top, finds no `code/...` path in it, and reads every test on main as deleted.
// Without GIT_DIR, git finds the worktree itself.
const { GIT_DIR: _hookGitDir, ...env } = process.env;
const git = (...args) =>
  execFileSync("git", args, { cwd: import.meta.dirname, encoding: "utf8", stdio: "pipe", env }).trim();
const fail = (failures) => {
  for (const failure of failures) console.error(`test protection: ${failure}`);
  process.exit(1);
};

let base;
try {
  base = git("merge-base", "HEAD", "origin/main");
} catch {
  fail(["no commit shared with origin/main — fetch it (`git fetch origin main`) and run again"]);
}
const failures = [];

const tests = ["--", "*.test.ts", "*.test.tsx"];
const deleted = new Set(
  [git("diff", "--name-only", "--diff-filter=D", "-M", base, ...tests)]
    .concat(git("diff", "--cached", "--name-only", "--diff-filter=D", "-M", base, ...tests))
    .flatMap((lines) => lines.split("\n"))
    .filter(Boolean),
);
for (const path of deleted) failures.push(`${path} is on main and deleted here`);

// Only a floor that is not on main yet is skipped; any other failure to read it fails the step.
const FLOOR = "code/coverage-floor.json";
const onMain = git("ls-tree", "--full-name", "--name-only", base, "coverage-floor.json") === FLOOR;
const floor = JSON.parse(readFileSync(`${import.meta.dirname}/coverage-floor.json`, "utf8"));
const below = (here, there, at) => {
  for (const [key, number] of Object.entries(there)) {
    if (typeof number === "object") below(here?.[key] ?? {}, number, `${at}${key} `);
    else if (!(here?.[key] >= number))
      failures.push(`coverage-floor.json ${at}${key} is ${here?.[key]}, below main's ${number}`);
  }
};
if (onMain) below(floor, JSON.parse(git("show", `${base}:${FLOOR}`)), "");

if (failures.length > 0) fail(failures);
console.log(`test protection: ok, against ${base.slice(0, 7)}`);
