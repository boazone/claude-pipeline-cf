/**
 * Which environment this bundle is served from, read off the hostname. One build serves every
 * environment from the same commit, so the hostname is the only thing that differs. No `location`,
 * no throw: a module loaded in Node must not need a browser — there it is `preview`.
 */
export type Environment = "production" | "QA" | "dev" | "local" | "preview";

export function environmentOf(host: string): Environment {
  if (host === "{{domain}}" || host === "www.{{domain}}") return "production";
  if (host.startsWith("qa.")) return "QA";
  // A Worker Preview of dev stays `preview`.
  if (host.startsWith("{{name}}-dev.")) return "dev";
  // `{{name}}-<n>.localhost` is a story's server, local like the address it duplicates.
  if (host.startsWith("local.") || host === "localhost" || host.endsWith(".localhost")) return "local";
  return "preview";
}

export const ENVIRONMENT = environmentOf(globalThis.location?.hostname ?? "");
