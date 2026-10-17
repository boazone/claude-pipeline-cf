import { afterEach, describe, expect, it, vi } from "vitest";

/** The browser's logger: what it sends, and when it stops. A fresh module per test resets its count. */
async function load() {
  vi.resetModules();
  const fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  vi.stubGlobal("fetch", fetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
  return { fetch, ...(await import("./system-log")) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("report", () => {
  it("posts an ERROR with the message, the stack and the path", async () => {
    const { fetch, report } = await load();
    report("boom", "at x");
    const [path, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/system-log");
    expect(JSON.parse(init.body as string)).toEqual({
      level: "ERROR",
      message: "boom",
      stack: "at x",
      data: { path: "/" },
    });
  });

  it("sends at most 20 per page load", async () => {
    const { fetch, report } = await load();
    for (let i = 0; i < 25; i++) report(`error ${i}`);
    expect(fetch).toHaveBeenCalledTimes(20);
  });

  it("reports an uncaught error and an unhandled rejection", async () => {
    const { fetch, reportUncaughtErrors } = await load();
    reportUncaughtErrors();
    window.dispatchEvent(new ErrorEvent("error", { message: "uncaught", error: new Error("uncaught") }));
    const rejection = new Event("unhandledrejection") as Event & { reason: unknown };
    rejection.reason = new Error("rejected");
    window.dispatchEvent(rejection);
    const messages = fetch.mock.calls.map((call) => JSON.parse((call as unknown as [string, RequestInit])[1].body as string).message);
    expect(messages).toEqual(["uncaught", "rejected"]);
  });
});
