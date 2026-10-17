import { defineConfig, devices } from "@playwright/test";

/**
 * The browser tests: the built system in a real browser, against the server at `{{NAME}}_BASE_URL` —
 * a story server (`http://{{name}}-<n>.localhost:<8700 + n>`), a preview, dev, QA or production. The
 * server is not started here: it is up already. `npm run browser -w @{{name}}/web`.
 */
const baseURL = process.env.{{NAME}}_BASE_URL;
if (!baseURL) throw new Error("{{NAME}}_BASE_URL is not set — the server to test, e.g. http://{{name}}-1.localhost:8701");

export default defineConfig({
  outputDir: "results",
  // One server, one database: tests do not race each other for its rows.
  workers: 1,
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
});
