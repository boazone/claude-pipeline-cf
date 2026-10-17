import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

/**
 * `npm run verify`: typecheck, Biome, the tests, then every check script of every workspace
 * — named `check`, `check:*` or `*:check`, so a new one joins by its name. In that order,
 * one at a time; the first red step stops it and is named. `.githooks/pre-commit` runs it on every commit that stages
 * `code/`. `node --run` runs each script without npm's second of startup. Last, the Claude Code guard's
 * own check (`.claude/hooks/guard.check.mjs`). The tests are two steps: test protection
 * (`tests.check.mjs`), then `npm test` — every Vitest project with coverage,
 * which fails under `coverage-floor.json`.
 */
const code = import.meta.dirname;
const isCheck = (name) => name === "check" || name.startsWith("check:") || name.endsWith(":check");
const workspaces = ["apps", "packages", "tools"].flatMap((dir) =>
  (existsSync(`${code}/${dir}`) ? readdirSync(`${code}/${dir}`) : [])
    .map((name) => `${dir}/${name}`)
    .filter((path) => existsSync(`${code}/${path}/package.json`)),
);
const steps = [
  ["typecheck", ".", ["--run", "typecheck"]],
  ["biome", ".", ["--run", "lint"]],
  ["test protection", ".", ["tests.check.mjs"]],
  ["test", ".", ["--run", "test"]],
  ...workspaces.flatMap((path) =>
    Object.keys(JSON.parse(readFileSync(`${code}/${path}/package.json`, "utf8")).scripts ?? {})
      .filter(isCheck)
      .map((script) => [`${path} ${script}`, path, ["--run", script]]),
  ),
  ["hooks guard", "..", [".claude/hooks/guard.check.mjs"]],
];

for (const [name, cwd, args] of steps) {
  console.log(`verify: ${name}`);
  const { status } = spawnSync(process.execPath, args, { cwd: `${code}/${cwd}`, stdio: "inherit" });
  if (status !== 0) {
    console.error(`verify: ${name} failed`);
    process.exit(1);
  }
}
console.log(`verify: ok, ${steps.length} steps`);
