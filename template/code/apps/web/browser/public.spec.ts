import { expect } from "@playwright/test";
import { expectAccessible, test } from "./kit";

/**
 * The quick check `/ship` runs after a deploy, and `/run` R5 after the dev deploy: only what needs no
 * sign-in. It runs the same on a story server, a preview, dev, QA and production.
 */
test("the api answers its health check", async ({ page }) => {
  const health = await page.goto("/api/health");
  expect(health?.status()).toBe(200);
  expect(await health?.json()).toEqual({ ok: true });
});

test("the start page", async ({ page }) => {
  expect((await page.goto("/"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("{{marketing}}");
  await expectAccessible(page);
});

test("a path that is nothing is a 404, a page or the api", async ({ page }) => {
  expect((await page.goto("/no-such-page"))?.status()).toBe(404);
  expect((await page.goto("/api/no-such-path"))?.status()).toBe(404);
});
