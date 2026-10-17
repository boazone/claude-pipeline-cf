import { env, exports } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import { systemLog } from "../src/db/schema";

/** The Worker's own routes: the health check, the api's 404, and `POST /api/system-log`. */
const call = (path: string, init: RequestInit = {}) =>
  exports.default.fetch(new Request(`https://{{name}}.test${path}`, init));

const post = (body: unknown) =>
  call("/api/system-log", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("the Worker", () => {
  it("answers its health check", async () => {
    const answer = await call("/api/health");
    expect(answer.status).toBe(200);
    expect(await answer.json()).toEqual({ ok: true });
  });

  it("answers an unknown api path with a 404 in JSON", async () => {
    const answer = await call("/api/no-such-path");
    expect(answer.status).toBe(404);
    expect(await answer.json()).toEqual({ error: "not_found" });
  });
});

describe("POST /api/system-log", () => {
  it("writes the browser's error as a WEB row", async () => {
    expect((await post({ level: "ERROR", message: "boom", data: { page: "/" } })).status).toBe(204);
    // The insert runs in the background; give it a moment.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const [row] = await drizzle(env.DB).select().from(systemLog).orderBy(desc(systemLog.systemLogId)).limit(1);
    expect(row).toMatchObject({
      systemLogLevel: "ERROR",
      systemLogSource: "WEB",
      systemLogMessage: "boom",
      systemLogEnvironment: "LOCAL",
      systemLogData: '{"page":"/"}',
    });
  });

  it("refuses what is not JSON, a level it does not know, or no message", async () => {
    expect((await call("/api/system-log", { method: "POST", body: "{" })).status).toBe(400);
    expect((await post({ level: "DEBUG", message: "x" })).status).toBe(400);
    expect((await post({ level: "ERROR" })).status).toBe(400);
  });

  it("refuses a body over its cap", async () => {
    expect((await post({ level: "ERROR", message: "x".repeat(20_000) })).status).toBe(413);
  });
});
