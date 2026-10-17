export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  // {{#r2}}
  /** One bucket per environment, keyed by prefix — never public; files are served through the Worker. */
  FILES: R2Bucket;
  // {{/r2}}
  /** `POST /api/system-log` is open, so it is limited per IP (`wrangler.jsonc`). */
  SYSTEM_LOG_RATE_LIMIT: RateLimit;

  // Vars (`wrangler.jsonc`), one per environment block.
  ENVIRONMENT: "LOCAL" | "DEV" | "QA" | "PRODUCTION";
  // {{#ai}}
  /** The AI Gateway this environment calls; the provider keys are secrets (`vibe/TECH-STACK.md`). */
  AI_GATEWAY_URL: string;
  // {{/ai}}
}
