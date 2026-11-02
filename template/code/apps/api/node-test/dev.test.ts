import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, expect, it } from "vitest";

// A path in a variable keeps `dev.mjs` out of the typecheck; it is a Node script, typed in JSDoc.
const devMjs = new URL("../dev.mjs", import.meta.url).href;
const { parentsFirst, nextVersion, commitVersion } = (await import(devMjs)) as {
  parentsFirst: (schema: string, data: string) => string;
  nextVersion: (latest: string | undefined, minor: boolean) => string;
  commitVersion: (git: (...args: string[]) => string, minor: boolean, versionFile?: string) => string;
};

/**
 * A throwaway repository for `commitVersion`: a bare `origin`, a clone with `VERSION` at `0.1.0` and
 * the tag `v0.1.0` on a file under `code/`, its `git` running from the clone's `code/apps/api`, where
 * npm runs `deploy:dev`. No `GIT_*` from the parent — the pre-commit hook exports `GIT_DIR`, which
 * would point every git below at the real repository — and git's user, global and system config set
 * here, so the laptop's hooks and signing stay out.
 */
const temp = mkdtempSync(join(tmpdir(), "{{name}}-deploy-"));
afterAll(() => rmSync(temp, { recursive: true, force: true, maxRetries: 3 }));
function repository() {
  const root = mkdtempSync(join(temp, "repo-"));
  const origin = join(root, "origin.git");
  const work = join(root, "work");
  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_CONFIG_GLOBAL: join(root, "no-global-config"),
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "test",
    GIT_AUTHOR_EMAIL: "test@{{name}}.test",
    GIT_COMMITTER_NAME: "test",
    GIT_COMMITTER_EMAIL: "test@{{name}}.test",
  };
  const run = (cwd: string, ...args: string[]) =>
    execFileSync("git", args, { cwd, encoding: "utf8", env, stdio: "pipe" }).trim();
  const commit = (file: string, message: string) => {
    mkdirSync(dirname(join(work, file)), { recursive: true });
    writeFileSync(join(work, file), `${message}\n`);
    run(work, "add", file);
    run(work, "commit", "-q", "-m", message);
  };
  run(root, "init", "-q", "--bare", "-b", "main", origin);
  run(root, "clone", "-q", origin, work);
  mkdirSync(join(work, "code", "apps", "api"), { recursive: true });
  commit("VERSION", "0.1.0");
  commit("code/apps/web/app.ts", "the build v0.1.0 ran");
  run(work, "tag", "v0.1.0");
  run(work, "push", "-q", "origin", "main", "v0.1.0");
  const git = (...args: string[]) => run(join(work, "code", "apps", "api"), ...args);
  const originMain = () => run(origin, "log", "-1", "--format=%s", "main");
  /**
   * `origin/main` moves — another session's deploy between the fetch and the push — and this
   * clone's `origin/main` stays where its fetch left it, as it would.
   */
  const moveOriginMain = () => {
    commit("tasks.md", "another session's bookkeeping");
    run(work, "push", "-q", "origin", "HEAD:main");
    run(work, "reset", "-q", "--hard", "HEAD~1");
    run(work, "update-ref", "refs/remotes/origin/main", "HEAD");
  };
  return { versionFile: join(work, "VERSION"), git, commit, originMain, moveOriginMain };
}

it.each([
  ["the next patch", false, "v0.1.1"],
  ["the next minor with --minor", true, "v0.2.0"],
])("commitVersion cuts %s for a change under code/ since the latest tag", (_, minor, expected) => {
  const repo = repository();
  repo.commit("code/apps/web/app.ts", "a story's code");
  expect(commitVersion(repo.git, minor, repo.versionFile)).toBe(expected);
  expect(readFileSync(repo.versionFile, "utf8")).toBe(`${expected.slice(1)}\n`);
  expect(repo.originMain()).toBe(expected);
});

it("commitVersion reuses the latest tag when nothing under code/ changed", () => {
  const repo = repository();
  repo.commit("tasks/{{PREFIX}}-3/log.md", "bookkeeping");
  const head = repo.git("rev-parse", "HEAD");
  expect(commitVersion(repo.git, false, repo.versionFile)).toBe("v0.1.0");
  expect(readFileSync(repo.versionFile, "utf8")).toBe("0.1.0\n");
  expect(repo.git("rev-parse", "HEAD")).toBe(head);
  expect(repo.originMain()).toBe("the build v0.1.0 ran");
});

it("commitVersion undoes its commit and moves to origin/main when it moved since the fetch", () => {
  const repo = repository();
  repo.commit("code/apps/web/app.ts", "a story's code");
  repo.moveOriginMain();
  expect(() => commitVersion(repo.git, false, repo.versionFile)).toThrow(
    /v0\.1\.1 was not pushed — origin\/main moved since the fetch.*non-fast-forward.*run deploy:dev again/s,
  );
  expect(readFileSync(repo.versionFile, "utf8")).toBe("0.1.0\n");
  expect(repo.git("log", "-1", "--format=%s")).toBe("another session's bookkeeping");
  expect(repo.originMain()).toBe("another session's bookkeeping");
});

/** The version `deploy:dev` cuts on a `main` deploy (`vibe/ENVIRONMENTS.md`). */
it.each([
  ["the first is v0.1.0, minor or not", undefined, false, "v0.1.0"],
  ["the first is v0.1.0 even for a feature", undefined, true, "v0.1.0"],
  ["a chore is a patch", "v0.1.0", false, "v0.1.1"],
  ["a feature is a minor, and the patch resets", "v0.1.7", true, "v0.2.0"],
  ["a major stays", "v2.9.9", false, "v2.9.10"],
])("nextVersion: %s", (_, latest, minor, expected) => {
  expect(nextVersion(latest, minor)).toBe(expected);
});

it("nextVersion refuses what is not a version", () => {
  expect(() => nextVersion("0.1", false)).toThrow("not a version");
});

/**
 * `parentsFirst`, which orders a preview's copy of dev's rows so D1's per-insert foreign key
 * check passes. The shape is
 * wrangler's `d1 export`: a schema dump of `CREATE` statements, and a rows dump of one `INSERT` per
 * statement, a row's text possibly spanning lines.
 */
const schema = `PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE \`game\` (
	\`game_id\` integer PRIMARY KEY,
	\`language_id\` integer NOT NULL,
	FOREIGN KEY (\`language_id\`) REFERENCES \`language\`(\`language_id\`)
);
CREATE TABLE \`language\` (
	\`language_id\` integer PRIMARY KEY
);
CREATE TABLE \`user\` (
	\`user_id\` integer PRIMARY KEY,
	\`language_id\` integer REFERENCES language(language_id)
);
CREATE TABLE IF NOT EXISTS "point" (
	\`point_id\` integer PRIMARY KEY,
	\`game_id\` integer NOT NULL,
	FOREIGN KEY (\`game_id\`) REFERENCES \`game\`(\`game_id\`)
);
CREATE INDEX \`IDX__game__language_id\` ON \`game\` (\`language_id\`);`;

const rows = `PRAGMA defer_foreign_keys=TRUE;
INSERT INTO "user" ("user_id","language_id") VALUES(1,1);
INSERT INTO "point" ("point_id","game_id") VALUES(1,1);
INSERT INTO "game" ("game_id","language_id") VALUES(1,1);
INSERT INTO "game" ("game_id","language_id") VALUES(2,'a
two-line value');
INSERT INTO "language" ("language_id") VALUES(1);`;

it("orders a dump's rows parents first, quoted references or bare", () => {
  expect(parentsFirst(schema, rows)).toBe(
    `PRAGMA defer_foreign_keys=TRUE;
INSERT INTO "language" ("language_id") VALUES(1);
INSERT INTO "user" ("user_id","language_id") VALUES(1,1);
INSERT INTO "game" ("game_id","language_id") VALUES(1,1);
INSERT INTO "game" ("game_id","language_id") VALUES(2,'a
two-line value');
INSERT INTO "point" ("point_id","game_id") VALUES(1,1);`,
  );
});
