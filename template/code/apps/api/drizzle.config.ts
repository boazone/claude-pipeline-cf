import { defineConfig } from "drizzle-kit";

/**
 * Generation only. `wrangler d1 migrations apply` is what executes a file — the pipeline runs it per
 * environment, once its SQL is approved (conventions §8.6), so drizzle-kit never needs credentials
 * here. Always generate with `--name {{prefix}}_<n>_<description>` (§8.2). `out` is wrangler's own
 * `migrations_dir` default, relative to `wrangler.jsonc`.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
