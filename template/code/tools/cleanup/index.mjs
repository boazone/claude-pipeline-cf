import { execFileSync, execSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, renameSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The cleanup queue. `/run` R8 appends a command it was refused, as `<tries> <command>`;
// a daily scheduled task runs this from the root checkout. A command that succeeds leaves the queue,
// one that fails stays with a try more, and the third failure leaves it anyway. No log (the user).

export const ROOT = "{{root}}";
const QUEUE = `${ROOT}/.claude/cleanup-queue.txt`;
const TRIES = 3;

// The exact shapes R8 queues, never a prefix: a prefix lets `& …`, `-c alias.x=!…` or
// `push --force` through (a security review's finding). Only story branches and worktrees.
const BRANCH = String.raw`(features/{{PREFIX}}-\d+|revert-{{PREFIX}}-\d+|claude/[\w-]+)`;
const ALLOWED = [
  new RegExp(String.raw`^git -C ${ROOT} worktree remove \.claude/worktrees/[\w-]+$`),
  new RegExp(String.raw`^git -C ${ROOT} branch -D( ${BRANCH})+$`),
  new RegExp(String.raw`^git -C ${ROOT} fetch --prune$`),
  /^npm run preview:dev -w @{{name}}\/api -- \d+ --delete$/,
];

/** Runs each allowed line through `run` (true on success) and returns the lines to keep. */
export function sweep(lines, run) {
  const keep = [];
  for (const line of lines) {
    const m = /^(\d+) (.+)$/.exec(line.trim());
    if (!m || !ALLOWED.some((r) => r.test(m[2]))) continue; // malformed or not allowed: dropped unrun
    if (run(m[2])) continue;
    const tries = Number(m[1]) + 1;
    if (tries < TRIES) keep.push(`${tries} ${m[2]}`);
  }
  return keep;
}

function runOnce(command) {
  // A minute each, and git never waits on a credential prompt, so the run ends inside the task's limit.
  const options = {
    cwd: `${ROOT}/code`,
    stdio: "ignore",
    timeout: 60_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
  };
  try {
    // git without a shell, so a timeout stops git itself; npm needs one on Windows.
    if (command.startsWith("git ")) execFileSync("git", command.split(" ").slice(1), options);
    else execSync(command, options);
    return true;
  } catch {
    return false;
  }
}

const count = (file) => (existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).length : 0);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // The scheduled task's whole reply, so it runs this one command and nothing else.
  const before = count(QUEUE);
  if (existsSync(QUEUE)) {
    // Work from a renamed copy: a line R8 appends meanwhile starts a fresh queue, and is never lost.
    const running = `${QUEUE}.running`;
    renameSync(QUEUE, running);
    const keep = sweep(readFileSync(running, "utf8").split(/\r?\n/).filter(Boolean), runOnce);
    if (keep.length) appendFileSync(QUEUE, keep.map((l) => `${l}\n`).join(""));
    rmSync(running);
  }
  console.log(`cleanup queue: ${before} lines before, ${count(QUEUE)} after`);
}
