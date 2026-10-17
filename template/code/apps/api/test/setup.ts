import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";
import type { Env as WorkerEnv } from "../src/env";

/**
 * Before each test file: every migration under `migrations/` on the file's own D1, in order, the way
 * `wrangler d1 migrations apply` does it. `vitest.config.ts` reads them in Node and hands them over
 * as `TEST_MIGRATIONS`. Storage is the file's own, so this runs once per file.
 */
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      TEST_MIGRATIONS: D1Migration[];
    }
    /** The Worker a test runs, so `exports.default` is its `fetch`. */
    interface GlobalProps {
      mainModule: typeof import("../src/index");
    }
  }
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
