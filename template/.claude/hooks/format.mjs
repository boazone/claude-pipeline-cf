// A PostToolUse hook on Write, Edit and MultiEdit (`.claude/settings.json`): a file the agent
// writes under `code/` is formatted by Biome as it is written. A file that does not parse is reported
// to the agent (exit 2); anything else — a file outside `code/`, a type Biome does not know, a
// worktree without `npm install` — passes quietly: `npm run verify` at the commit still checks it.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

const code = resolve(import.meta.dirname, "../../code");
const biome = join(code, "node_modules/@biomejs/biome/bin/biome");

let input = "";
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input).tool_input?.file_path;
const inside = file ? relative(code, resolve(file)) : "..";
if (inside.startsWith("..") || isAbsolute(inside) || !existsSync(biome)) process.exit(0);

const { status, stdout, stderr } = spawnSync(
  process.execPath,
  [biome, "format", "--write", "--files-ignore-unknown=true", "--no-errors-on-unmatched", inside],
  { cwd: code, encoding: "utf8" },
);
if (status !== 0) {
  process.stderr.write(`Biome could not format ${inside}:\n${stdout}${stderr}`);
  process.exit(2);
}
