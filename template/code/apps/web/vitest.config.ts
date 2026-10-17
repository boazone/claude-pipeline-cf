import { defineConfig } from "vitest/config";

// Component tests: a screen rendered in Node with a DOM (jsdom), asserted by what its reader
// reads. `browser/` is Playwright's, a different runner, and stays out.
export default defineConfig({
  test: {
    name: "web",
    environment: "jsdom",
    testTimeout: 15000,
    // A screen renders per test, beside the api's workerd: a busy machine races a few `findBy`s. Retried, not hidden: a test that needs it shows as flaky.
    retry: 2,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test-setup.ts"],
  },
});
