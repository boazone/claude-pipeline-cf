import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

// A path in a variable keeps `dev.mjs` out of the typecheck; it is a Node script, typed in JSDoc.
const devMjs = new URL("../dev.mjs", import.meta.url).href;
const { readConfig } = (await import(devMjs)) as { readConfig: () => { env: Record<string, unknown> } };

const api = resolve(import.meta.dirname, "..");
const wrangler = resolve(createRequire(import.meta.url).resolve("wrangler/package.json"), "..", "bin", "wrangler.js");

/**
 * Every environment of `wrangler.jsonc` builds and binds what it must — a `wrangler deploy --dry-run`
 * each, so a config that would fail at the deploy fails here, at the commit. A named environment
 * inherits no binding, so each one is checked on its own.
 */
it.each(Object.keys(readConfig().env))("the %s environment builds, with its database and its name", (env) => {
  const out = mkdtempSync(join(tmpdir(), `wrangler-${env}-`));
  try {
    const printed = execFileSync(
      process.execPath,
      [wrangler, "deploy", "--dry-run", "-c", "wrangler.jsonc", "--env", env, "--outdir", out],
      { cwd: api, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } },
    );
    const name = env === "production" ? "PRODUCTION" : env.toUpperCase();
    expect(printed).toContain(`env.ENVIRONMENT ("${name}")`);
    expect(printed).toMatch(/env\.DB \(\S+\)\s+D1 Database/);
    expect(printed).toContain("env.SYSTEM_LOG_RATE_LIMIT");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
