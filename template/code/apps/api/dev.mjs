import { execFileSync, execSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, writeSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";

/**
 * Dev, from the laptop, on the dev account's token and nothing else (`vibe/ENVIRONMENTS.md`).
 *
 *     npm run deploy:dev -w @{{name}}/api [-- --branch]       main to dev: build, migrate, deploy, check
 *     npm run preview:dev -w @{{name}}/api -- <n> [--delete]  a story's branch on its Worker Preview
 *     npm run wrangler:dev -w @{{name}}/api -- <command>      any other wrangler command, on dev
 *
 * `deploy:dev` is the one command that puts `main` on dev — `/run` R5 runs it after a merge. A
 * checkout with uncommitted changes, or whose tree is not `origin/main`'s, is refused; `--branch`
 * deploys it anyway, and dev runs it until the next `deploy:dev`. Then the bundle, every migration
 * dev has not run — `main`'s were approved before they merged — the deploy, and a check that dev
 * refuses a request without Access and answers one with the service token.
 *
 * Every wrangler call gets `--env dev`, whose `account_id` pins the dev account, and the token from
 * `.dev-account.env` — in the child's environment only, so `wrangler login` stays the user's, for
 * production.
 */
export const DEV_URL = "https://{{name}}-dev.{{dev_subdomain}}.workers.dev";
const CONFIG = join(import.meta.dirname, "wrangler.jsonc");

/** `wrangler.jsonc` as an object — comments and trailing commas dropped, strings kept. */
export function readConfig(file = CONFIG) {
  const text = readFileSync(file, "utf8")
    .replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_, string) => string ?? "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(text);
}

/**
 * `.dev-account.env` in the root checkout, shared by every worktree — git-ignored, written by the
 * user, read here. Refuses, by name, a key the caller needs and the file does not have.
 * @param {...string} keys
 * @returns {Record<string, string>}
 */
export function devAccount(...keys) {
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    encoding: "utf8",
  }).trim();
  const file = resolve(common, "..", "code", "apps", "api", ".dev-account.env");
  let account;
  try {
    account = parseEnv(readFileSync(file, "utf8"));
  } catch {
    fail(`No ${file} — the dev account's token and Access service token go there (vibe/dev/SETUP.md, S4).`);
  }
  const missing = keys.filter((key) => !account[key]);
  if (missing.length > 0) fail(`${file} has no ${missing.join(", ")}.`);
  return account;
}

/** Access lets the agent through on its service token, sent as these two headers. */
export function accessHeaders() {
  const account = devAccount("CF_ACCESS_CLIENT_ID", "CF_ACCESS_CLIENT_SECRET");
  return {
    "cf-access-client-id": account.CF_ACCESS_CLIENT_ID,
    "cf-access-client-secret": account.CF_ACCESS_CLIENT_SECRET,
  };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const { CLOUDFLARE_API_TOKEN: token } = devAccount("CLOUDFLARE_API_TOKEN");
  if (args[0] === "deploy") await deploy(args.includes("--branch"), token);
  else if (args[0] === "preview-story") await preview(Number(args[1]), args.includes("--delete"), token);
  else wrangler(args, token);
}

/** @param {boolean} branch @param {string} token */
async function deploy(branch, token) {
  const git = (/** @type {string[]} */ ...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
  git("fetch", "-q", "origin", "main");
  const head = git("rev-parse", "--short", "HEAD");
  const dirty = git("status", "--porcelain") !== "";
  const offMain = git("diff", "--name-only", "origin/main", "HEAD") !== "";
  if ((dirty || offMain) && !branch) {
    fail(
      `deploy:dev puts main on dev, and this checkout ${dirty ? "has uncommitted changes" : `(${head}) is not origin/main`}. ` +
        "Merge first — or pass --branch to deploy it anyway, until the next deploy:dev.",
    );
  }
  // Read before anything moves: a deploy that cannot be checked afterwards is not started.
  const headers = accessHeaders();

  execSync("npm run build -w @{{name}}/web", { cwd: resolve(import.meta.dirname, "..", ".."), stdio: "inherit" });
  wrangler(["d1", "migrations", "apply", "{{name}}-dev", "--remote"], token);
  wrangler(["deploy"], token);

  const bare = await checkAccess(DEV_URL, headers);
  console.log(
    `dev: ${head}${dirty ? " plus uncommitted changes" : ""}${dirty || offMain ? " (not main — --branch)" : ""} is on ${DEV_URL}. ` +
      `Without Access it answers ${bare}; with the service token, 200.`,
  );
}

/**
 * `features/{{PREFIX}}-<n>`, checked out and committed here, on the Worker Preview `{{name}}-<n>`
 * (`env.dev.previews`): its own Durable Objects, and dev's D1 and R2 — unless the branch adds a
 * migration. Then `{{name}}-preview-<n>` is made once as a copy of `{{name}}-dev` (wrangler's own
 * export, not SQL written by hand), the migrations dev has not run are applied to it — the story's,
 * approved at R2 — and the preview binds it through `wrangler.preview.jsonc`, a git-ignored copy of
 * the config. A migration edited after the copy needs `--delete` first. `--delete` removes the
 * preview and its database.
 * @param {number} story @param {boolean} remove @param {string} token
 */
async function preview(story, remove, token) {
  if (!Number.isInteger(story) || story < 1)
    fail("preview:dev needs the story's number: npm run preview:dev -w @{{name}}/api -- 12");
  const name = `{{name}}-${story}`;
  const database = `{{name}}-preview-${story}`;
  const info = () => {
    const answer = wrangler(["d1", "info", database, "--json"], token, { quiet: true });
    return answer.ok ? JSON.parse(answer.out) : null;
  };
  let copy = info();
  if (remove) {
    wrangler(["preview", "delete", "--name", name, "--skip-confirmation"], token, { quiet: true });
    if (copy) wrangler(["d1", "delete", database, "--skip-confirmation"], token);
    rmSync(join(import.meta.dirname, "wrangler.preview.jsonc"), { force: true });
    console.log(`preview: ${name} deleted${copy ? `, and ${database}` : ""}.`);
    return;
  }
  const git = (/** @type {string[]} */ ...args) =>
    execFileSync("git", args, { cwd: import.meta.dirname, encoding: "utf8" }).trim();
  const branch = git("branch", "--show-current");
  if (branch !== `features/{{PREFIX}}-${story}` && branch !== `hotfix/{{PREFIX}}-${story}`) {
    fail(`preview:dev ${story} deploys features/{{PREFIX}}-${story} (or its hotfix), and this worktree is on ${branch}.`);
  }
  if (git("status", "--porcelain") !== "") fail("preview:dev deploys what is committed: commit first.");
  git("fetch", "-q", "origin", "main");
  const migrates = git("diff", "--name-only", "origin/main...HEAD", "--", "migrations") !== "";
  const headers = accessHeaders();

  execSync("npm run build -w @{{name}}/web", { cwd: resolve(import.meta.dirname, "..", ".."), stdio: "inherit" });
  let config = CONFIG;
  if (migrates) {
    // A copy is one import, schema then rows: D1 runs a file whole or not at all, so a database with
    // tables is a whole copy, and one without — a run killed after `create` — is filled now. Rows go
    // parents first: D1 checks a foreign key on every insert, and wrangler's dump orders tables by name.
    if (!copy?.num_tables) {
      // Dev's rows, sessions included: a private folder, gone on any exit — `fail` exits too.
      const folder = mkdtempSync(join(tmpdir(), `${database}-`));
      process.on("exit", () => rmSync(folder, { recursive: true, force: true }));
      const schema = join(folder, "schema.sql");
      const rows = join(folder, "rows.sql");
      wrangler(["d1", "export", "{{name}}-dev", "--remote", "--no-data", "--output", schema], token);
      wrangler(["d1", "export", "{{name}}-dev", "--remote", "--no-schema", "--output", rows], token);
      const dump = readFileSync(schema, "utf8");
      writeFileSync(rows, `${dump}\n${parentsFirst(dump, readFileSync(rows, "utf8"))}`);
      if (!copy) wrangler(["d1", "create", database], token);
      const imported = wrangler(["d1", "execute", database, "--remote", "--file", rows, "--yes"], token, {
        quiet: true,
      });
      if (!imported.ok) fail(`The copy of {{name}}-dev into ${database} failed, and left it empty:\n${imported.err}`);
      copy = info();
    }
    // Every `{{name}}-dev` D1 line of `env.dev` — its own and its previews' — so `migrations apply`
    // and the preview both reach the copy. This file is for `preview` only; `deploy` never reads it.
    const id = readConfig().env.dev.d1_databases[0].database_id;
    const line = `"database_name": "{{name}}-dev", "database_id": "${id}"`;
    const source = readFileSync(CONFIG, "utf8");
    if (source.split(line).length !== 3) fail(`wrangler.jsonc no longer has env.dev's two lines ${line}.`);
    config = join(import.meta.dirname, "wrangler.preview.jsonc");
    writeFileSync(config, source.replaceAll(line, `"database_name": "${database}", "database_id": "${copy.uuid}"`));
    wrangler(["d1", "migrations", "apply", database, "--remote"], token, { config });
  }
  wrangler(["preview", "--name", name], token, { config });

  const url = `https://${name}-{{name}}-dev.{{dev_subdomain}}.workers.dev`;
  // A preview that answers without Access is taken down before the stop: it has dev's rows behind it.
  const bare = await checkAccess(url, headers, () =>
    wrangler(["preview", "delete", "--name", name, "--skip-confirmation"], token),
  );
  console.log(
    `preview: ${url} on ${migrates ? database : "{{name}}-dev's database"}. Without Access it answers ${bare}; with the service token, 200.`,
  );
}

/**
 * A rows-only dump, its `INSERT`s reordered so every table comes after the tables its foreign keys
 * name — read from the schema dump's `REFERENCES`. A table's own rows keep their order.
 * @param {string} schema @param {string} data
 */
export function parentsFirst(schema, data) {
  /** @type {Map<string, string[]>} */
  const parents = new Map();
  for (const create of schema.split(/\n(?=CREATE )/)) {
    const table = create.match(/^CREATE TABLE (?:IF NOT EXISTS )?[`"]?(\w+)/)?.[1];
    if (table)
      parents.set(
        table,
        [...create.matchAll(/REFERENCES\s+[`"]?(\w+)/g)].map((match) => match[1]),
      );
  }
  /** @type {Map<string, string[]>} */
  const rows = new Map();
  const [head, ...inserts] = data.split(/\n(?=INSERT INTO )/);
  for (const insert of inserts) {
    const table = insert.match(/^INSERT INTO "(\w+)"/)?.[1] ?? "";
    rows.set(table, [...(rows.get(table) ?? []), insert]);
  }
  /** @type {string[]} */
  const ordered = [];
  const seen = new Set();
  const visit = (/** @type {string} */ table) => {
    if (seen.has(table)) return;
    seen.add(table);
    for (const parent of parents.get(table) ?? []) if (parent !== table) visit(parent);
    ordered.push(...(rows.get(table) ?? []));
  };
  for (const table of rows.keys()) visit(table);
  return [head, ...ordered].join("\n");
}

/**
 * Refuses a host that answers without Access, or not through it with the service token. Returns what
 * it answered without.
 * @param {string} url @param {Record<string, string>} headers @param {() => void} [takeDown]
 */
async function checkAccess(url, headers, takeDown = () => {}) {
  const health = `${url}/api/health`;
  const bare = await fetch(health, { redirect: "manual" });
  if (bare.status === 200) {
    takeDown();
    fail(`${url} answered without Access — put it back (Workers & Pages → {{name}}-dev → Access) before anything else.`);
  }
  const through = await fetch(health, { headers, redirect: "manual" });
  const body = await through.text();
  if (through.status !== 200 || !body.includes('"ok":true')) {
    fail(`${url} did not answer through Access: ${through.status} ${body.slice(0, 200)}`);
  }
  return bare.status;
}

/**
 * wrangler, run by this node on dev's config and environment, with the dev token in its environment
 * only. A failure exits — unless `quiet`, which captures the output and reports instead of exiting.
 * @param {string[]} args @param {string} token
 * @param {{ config?: string, quiet?: boolean }} [options]
 */
function wrangler(args, token, { config = CONFIG, quiet = false } = {}) {
  const bin = resolve(createRequire(import.meta.url).resolve("wrangler/package.json"), "..", "bin", "wrangler.js");
  const { status, stdout, stderr } = spawnSync(process.execPath, [bin, ...args, "--env", "dev", "--config", config], {
    stdio: quiet ? "pipe" : "inherit",
    encoding: "utf8",
    env: { ...process.env, CLOUDFLARE_API_TOKEN: token },
  });
  if (status !== 0 && !quiet) process.exit(status ?? 1);
  return { ok: status === 0, out: stdout ?? "", err: stderr ?? "" };
}

/** Synchronous on purpose, as in `wrangler.mjs`: a Windows pipe can lose `console.error` before exit. */
function fail(/** @type {string} */ message) {
  writeSync(2, `${message}\n`);
  process.exit(1);
}
