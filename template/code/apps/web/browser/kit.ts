import { AxeBuilder } from "@axe-core/playwright";
import { type BrowserContext, test as playwright, expect, type Page } from "@playwright/test";

/** What the browser tests share: the way through Access, and the accessibility check. */

/**
 * Dev and a preview sit behind Access (`*.workers.dev`). The agent's service token is added to every
 * request to that host and to no other — a font host or any third party must never see it. Read from
 * `.dev-account.env` through `dev.mjs`, only when the server is behind Access.
 */
export async function throughAccess(context: BrowserContext) {
  const base = new URL(process.env.{{NAME}}_BASE_URL ?? "http://localhost");
  if (!base.hostname.endsWith(".workers.dev")) return;
  // A path in a variable keeps `dev.mjs` out of this project's typecheck; it is the api's, in JSDoc.
  const devMjs = new URL("../../api/dev.mjs", import.meta.url).href;
  const headers: Record<string, string> = (await import(devMjs)).accessHeaders();
  await context.route(
    (url) => url.host === base.host,
    (route) => route.continue({ headers: { ...route.request().headers(), ...headers } }),
  );
}

/** Playwright's `test`, with every page's context through Access when the server needs it. */
export const test = playwright.extend({
  context: async ({ context }, use) => {
    await throughAccess(context);
    await use(context);
  },
});

/** axe on the page as it stands; fails on a `serious` or `critical` violation. */
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
  expect(serious).toEqual([]);
}
