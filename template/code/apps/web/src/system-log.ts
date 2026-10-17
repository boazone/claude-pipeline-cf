/**
 * **The browser's uncaught errors, to `POST /api/system-log`.** Every error goes to the console; at
 * most 20 per page load are sent, cut short enough to stay under the endpoint's 16 KB, and one that
 * fails to send is dropped — never logged, so a broken endpoint cannot loop.
 *
 * What it cannot catch: an error thrown before this module runs — a bundle that fails to load.
 */
const PER_PAGE_LOAD = 20;
let sent = 0;

export function report(message: string, stack?: string) {
  console.error(message, stack ?? "");
  if (sent >= PER_PAGE_LOAD) return;
  sent += 1;
  void fetch("/api/system-log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    // Behind Access (dev and its previews), a request without the cookie is turned away.
    credentials: "same-origin",
    body: JSON.stringify({
      level: "ERROR",
      message: message.slice(0, 2_000),
      stack: stack?.slice(0, 8_000),
      data: { path: location.pathname },
    }),
  }).catch(() => {});
}

export function reportUncaughtErrors() {
  window.addEventListener("error", (event) => report(event.message, event.error?.stack));
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    report(reason instanceof Error ? reason.message : String(reason), reason?.stack);
  });
}
