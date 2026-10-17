import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Env } from "./env";
import { messageOf, systemLog, systemLogRoute } from "./system-log";

/**
 * One Worker, one origin, split by path (`vibe/TECH-STACK.md`):
 * {{#multiapp}}
 * {{#apps}}
 *   /{{app}}/*  the {{app}} app
 * {{/apps}}
 * {{/multiapp}}
 * {{^multiapp}}
 *   /  the app
 * {{/multiapp}}
 *   /api/*  this router — everything else falls through to apps/web's build.
 */
const app = new Hono<{ Bindings: Env }>();

/**
 * Every page path. Any other path is a 404, not the app's shell with a 200 — which is why the assets
 * binding's `not_found_handling` is `none`. A new top-level page joins here.
 */
// {{#multiapp}}
export const PAGE_PATH = /^\/(({{app_paths}})(\/.*)?)?$/;
// {{/multiapp}}
// {{^multiapp}}
export const PAGE_PATH = /^\/$/;
// {{/multiapp}}

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/system-log", systemLogRoute);

app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

/**
 * **One handler for every uncaught exception in a route** — Hono keeps only the last `onError`.
 * It is a `FATAL` in the system log, with its stack and the `cf-ray` that finds the request in
 * Workers Logs. The body carries the message and stack on `LOCAL` only, so a failure is readable in
 * the network tab there; dev, QA and production get the bare 500. It follows the `ENVIRONMENT`
 * binding, never the hostname: a `Host` header is the caller's to write, and the binding is not.
 */
app.onError((error, c) => {
  if (error instanceof HTTPException) return error.getResponse();
  systemLog(c.env, c.executionCtx.waitUntil.bind(c.executionCtx), {
    level: "FATAL",
    source: "API",
    message: messageOf(error),
    stack: error.stack,
    ray: c.req.header("cf-ray") ?? null,
    data: { method: c.req.method, path: c.req.path },
  });
  if (c.env.ENVIRONMENT !== "LOCAL") return c.json({ error: "internal" }, 500);
  return c.json({ error: "internal", reason: messageOf(error), stack: error.stack }, 500);
});

app.all("*", async (c) => {
  // A real file — the bundle, an icon.
  const asset = await c.env.ASSETS.fetch(c.req.raw);
  if (asset.status !== 404) return asset;
  // A client route: serve the shell and let the app render it.
  const url = new URL(c.req.url);
  if (PAGE_PATH.test(url.pathname)) return c.env.ASSETS.fetch(new Request(new URL("/", url), c.req.raw));
  return c.text("Not found", 404);
});

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;
