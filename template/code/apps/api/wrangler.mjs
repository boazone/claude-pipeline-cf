import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, readdirSync, renameSync, rmSync, writeSync } from "node:fs";
import { createRequire } from "node:module";
import { freemem } from "node:os";
import { join, resolve } from "node:path";

/**
 * `wrangler` with one local database for every worktree, and one per story.
 *
 * Wrangler persists D1, R2 and Durable Object state under `.wrangler/state` **next to the config it
 * was run from**, so each worktree would grow its own database, and `local.{{domain}}` would show
 * whichever worktree's server held the port, with that worktree's rows. Here every worktree resolves
 * the root checkout through git's common dir and hands wrangler that one directory.
 *
 * **`--story <n>` is the other mode**: the story's own server at
 * `http://{{name}}-<n>.localhost:<8700 + n>`, on a duplicate of the main directory taken the first
 * time the story runs anything here, kept in this worktree under `.wrangler/story-<n>`. The main
 * directory is read to make the duplicate and never written from story mode — `local.{{domain}}`
 * and its rows stay the user's. The flag is stripped before wrangler sees the arguments.
 */
const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
  encoding: "utf8",
}).trim();
export const state = resolve(common, "..", "code", "apps", "api", ".wrangler", "state");

const args = process.argv.slice(2);
const story = takeStory(args);
const command = args[0];

let persistTo = state;
if (story) {
  persistTo = resolve(import.meta.dirname, ".wrangler", `story-${story}`);
  // The config is named because a story server is started from the worktree root
  // (`.claude/launch.json`), not from this directory. `.dev.vars` is read from beside it.
  args.push("--config", join(import.meta.dirname, "wrangler.jsonc"));
  if (command === "dev") {
    const own = args.find((arg) => /^--(ip|port|local-protocol|https-)/.test(arg));
    if (own) fail(`Story mode sets its own address; drop ${own} — \`npm run dev:story -w @{{name}}/api -- ${story}\`.`);
    // One instance is about 0.7 GB, 1.9 GB while the bundle builds; below this much free memory the
    // start is refused rather than the machine slowed for every other story. `npm run dev` is the
    // user's and is never refused.
    const minFreeGb = Number(process.env.{{NAME}}_MIN_FREE_GB) || 3;
    const freeGb = freemem() / 2 ** 30;
    if (freeGb < minFreeGb) {
      fail(`${freeGb.toFixed(1)} GB of memory free, under {{NAME}}_MIN_FREE_GB=${minFreeGb} — not starting story ${story}'s server.`);
    }
    args.push("--ip", "127.0.0.1", "--port", String(8700 + story));
  }
  await duplicate(state, persistTo);
}

// One dev server per address. Windows lets a second workerd bind beside a live one without an
// error, and the older server keeps answering — a stale build after a fresh `npm run dev`. Refuse
// to start while a socket listens on exactly that address. Not a connect probe: Docker Desktop
// listens on `0.0.0.0:443`, which answers every loopback address and would block every start.
if (command === "dev" && process.platform === "win32") {
  const address = story ? `127.0.0.1:${8700 + story}` : "127.0.0.2:443";
  const busy = new RegExp(`^\\s*TCP\\s+${address.replaceAll(".", "\\.")}\\s+\\S+\\s+LISTENING`, "m").test(
    execFileSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" }),
  );
  if (busy) {
    fail(
      story
        ? `Story ${story} is already served — something holds ${address}. Stop it first (preview_stop).`
        : "local.{{domain}} is already served — another `npm run dev` holds 127.0.0.2:443. Stop it first.",
    );
  }
}

// The package's own entry, run by this node — no shell and no PATH, so it works from npm scripts
// and by hand alike.
const wrangler = resolve(createRequire(import.meta.url).resolve("wrangler/package.json"), "..", "bin", "wrangler.js");
const child = spawn(process.execPath, [wrangler, ...args, "--persist-to", persistTo], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));

/**
 * `--story <n>` or `--story=<n>` out of the arguments, wherever it stands; the index, or `undefined`
 * when the flag is absent. A spelling this missed would fall through to the main state, so anything
 * that starts `--story` and is not one of the two is refused.
 */
function takeStory(argv) {
  const at = argv.findIndex((arg) => arg.startsWith("--story"));
  if (at < 0) return undefined;
  const inline = argv[at].startsWith("--story=");
  const index = Number(inline ? argv[at].slice("--story=".length) : argv[at] === "--story" ? argv[at + 1] : NaN);
  if (!Number.isInteger(index) || index < 1) fail("--story needs the story's index, as in `--story 17`.");
  argv.splice(at, inline ? 1 : 2);
  return index;
}

/**
 * The story's state, made once from the main directory — D1, R2 and Durable Objects; the main
 * server's request traces and Cache API store are not the story's and are most of the bytes. The
 * main directory is only ever read here, by a file copy that never opens its databases.
 *
 * The copy is staged: it lands in `<to>.partial`, every SQLite file in it is opened and checked, and
 * only then is it renamed into place — so an interrupted copy is never mistaken for a finished one.
 *
 * ponytail: a plain copy of a WAL-mode database while the main server is writing can miss the last
 * seconds of commits and still pass `integrity_check`. Accepted for a development duplicate. The
 * upgrade path is `backup()` from `node:sqlite` — but it has to open the main database.
 */
async function duplicate(from, to) {
  if (existsSync(to)) return;
  if (!existsSync(from)) {
    console.error(`No main state at ${from} — story state starts empty; apply the migrations with db:migrate:story.`);
    return;
  }
  const partial = `${to}.partial`;
  rmSync(partial, { recursive: true, force: true });
  const { DatabaseSync } = await import("node:sqlite");
  try {
    cpSync(from, partial, {
      recursive: true,
      filter: (source) => !/[\\/]v3[\\/](observability|cache)$/.test(source),
    });
    for (const file of sqliteFiles(partial)) {
      const db = new DatabaseSync(file);
      try {
        const verdict = db.prepare("PRAGMA integrity_check").all()[0]?.integrity_check;
        if (verdict !== "ok") throw new Error(`integrity_check says ${verdict}`);
      } finally {
        db.close();
      }
    }
    renameSync(partial, to);
  } catch (error) {
    rmSync(partial, { recursive: true, force: true });
    // Windows refuses a path over 260 characters, and SQLite and wrangler report it opaquely.
    fail(
      `The story state could not be duplicated: ${error.message}\n` +
        `The target is ${to} (${to.length} characters; Windows allows 260 for the files under it). ` +
        "If the main server is mid-write, run the command again.",
    );
  }
  console.error(`Story state duplicated from ${from}.`);
}

function sqliteFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sqlite"))
    .map((entry) => join(entry.parentPath, entry.name));
}

/** Synchronous on purpose: `console.error` then `process.exit` can lose the text on a Windows pipe. */
function fail(message) {
  writeSync(2, `${message}\n`);
  process.exit(1);
}
