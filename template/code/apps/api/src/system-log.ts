import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { SYSTEM_LOG_LEVEL, SYSTEM_LOG_SOURCE, systemLog as systemLogTable } from "./db/schema";
import type { Env } from "./env";

/**
 * **The system log's only writer.** Every line goes to `console`, so Workers Logs keeps it, and to
 * `system_log`, so the bug sweep reads it.
 *
 * **Logging never breaks the caller.** The insert runs in the background through `waitUntil`, and a
 * failed insert is written to `console.error` once and swallowed — never logged again, which is what
 * stops a broken table from logging its own failure forever.
 *
 * ponytail: every warning, error and fatal is kept, with no retention. Add a level setting and a
 * daily retention cron when the table grows — D1 Free holds 5 GB.
 */

type Level = (typeof SYSTEM_LOG_LEVEL)[number];
type Source = (typeof SYSTEM_LOG_SOURCE)[number];
type WaitUntil = (promise: Promise<unknown>) => void;

/** Truncated on write, never refused. */
const CAP = { message: 2_000, stack: 8_000, data: 8_000, ray: 64 } as const;

/** `POST /api/system-log`'s body, in bytes. Above it: 413. */
const BODY_CAP = 16_000;

interface Entry {
  level: Level;
  source: Source;
  message: string;
  stack?: string | null;
  ray?: string | null;
  data?: unknown;
}

/** One line, to the console now and to the table in the background. */
export function systemLog(env: Env, waitUntil: WaitUntil, entry: Entry) {
  (entry.level === "WARNING" ? console.warn : console.error)(`[${entry.level}] ${entry.message}`, entry.stack ?? "");
  waitUntil(insert(env, entry));
}

/** The message of whatever was thrown, which is not always an `Error`. */
export function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}

async function insert(env: Env, entry: Entry): Promise<void> {
  try {
    await drizzle(env.DB)
      .insert(systemLogTable)
      .values({
        systemLogGuid: crypto.randomUUID(),
        systemLogEnvironment: env.ENVIRONMENT,
        systemLogLevel: entry.level,
        systemLogSource: entry.source,
        systemLogMessage: cut(entry.message || "(no message)", CAP.message),
        systemLogStack: entry.stack ? cut(entry.stack, CAP.stack) : null,
        systemLogRay: entry.ray ? cut(entry.ray, CAP.ray) : null,
        systemLogData: json(entry.data),
      });
  } catch (failure) {
    // Once, to console, and never back through `systemLog` — see the file comment.
    console.error("system_log insert failed", failure);
  }
}

function cut(text: string, length: number) {
  return text.length > length ? text.slice(0, length) : text;
}

/** Always valid JSON or NULL, because `CHK__system_log__system_log_data_is_json` would refuse the row. */
function json(data: unknown): string | null {
  if (data === undefined || data === null) return null;
  let text: string;
  try {
    text = JSON.stringify(data);
  } catch {
    text = JSON.stringify({ unserializable: String(data) });
  }
  return text.length > CAP.data ? JSON.stringify({ truncated: text.slice(0, CAP.data) }) : text;
}

/**
 * **`POST /api/system-log`** — the browser's uncaught errors. Open, so it guards itself: a per-IP rate
 * limit (429), a body cap (413), and a closed set of levels (400). The GUID, the environment and the
 * ray are the server's; the source is always `WEB` — a browser never speaks for the api.
 */
export const systemLogRoute = new Hono<{ Bindings: Env }>();

systemLogRoute.post("/", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await c.env.SYSTEM_LOG_RATE_LIMIT.limit({ key: ip });
  if (!success) return c.body(null, 429);

  if (Number(c.req.header("content-length") ?? 0) > BODY_CAP) return c.body(null, 413);
  const body = await c.req.text();
  if (new TextEncoder().encode(body).length > BODY_CAP) return c.body(null, 413);

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(body);
  } catch {
    return c.json({ error: "invalid", reason: "json" }, 400);
  }
  if (!SYSTEM_LOG_LEVEL.includes(input?.level as Level)) return c.json({ error: "invalid", reason: "level" }, 400);
  if (typeof input.message !== "string") return c.json({ error: "invalid", reason: "message" }, 400);

  systemLog(c.env, c.executionCtx.waitUntil.bind(c.executionCtx), {
    level: input.level as Level,
    source: "WEB",
    message: input.message,
    stack: typeof input.stack === "string" ? input.stack : null,
    ray: c.req.header("cf-ray") ?? null,
    data: input.data,
  });
  return c.body(null, 204);
});
