import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import floor from "./coverage-floor.json" with { type: "json" };

/**
 * The workspace's one Vitest (`code/README.md`, *Tests*). A project per side: `api` runs `apps/api`
 * inside workerd, `web` is `apps/web`'s component tests (its own `apps/web/vitest.config.ts`), and
 * `node` is what needs Node itself — the deploy scripts and the tools. Coverage is Istanbul, the one
 * provider that works inside workerd; `coverage-floor.json` is the floor, and `tests.check.mjs`
 * keeps it from going down.
 */
export default defineConfig({
  test: {
    testTimeout: 20000,
    maxWorkers: "50%",
    coverage: {
      provider: "istanbul",
      include: ["apps/api/src/**/*.ts", "apps/web/src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/test-setup.ts", "apps/web/src/main.tsx"],
      reporter: ["text-summary"],
      thresholds: floor,
    },
    projects: [
      "apps/web",
      {
        plugins: [
          cloudflareTest(async () => ({
            main: "./apps/api/src/index.ts",
            wrangler: { configPath: "./apps/api/wrangler.jsonc" },
            miniflare: {
              bindings: { TEST_MIGRATIONS: await readD1Migrations("./apps/api/migrations") },
            },
          })),
        ],
        test: {
          name: "api",
          // An inline project does not inherit the root's `testTimeout`.
          testTimeout: 20000,
          include: ["apps/api/test/**/*.test.ts"],
          setupFiles: ["./apps/api/test/setup.ts"],
        },
      },
      {
        test: {
          name: "node",
          include: ["apps/api/node-test/**/*.test.ts", "tools/*/*.test.mjs"],
          environment: "node",
          testTimeout: 60_000,
        },
      },
    ],
  },
});
