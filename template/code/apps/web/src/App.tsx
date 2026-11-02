import { ENVIRONMENT, VERSION } from "./env";

/**
 * The shell. The first story of each app replaces its placeholder; the bar at the foot of every
 * screen stays — `DEV - v0.2.0` — so nobody mistakes dev for the real thing, and production and dev
 * are compared by number (`vibe/ENVIRONMENTS.md`).
 */
function Bar() {
  return (
    <p className="environment">
      {ENVIRONMENT.toUpperCase()} - {VERSION}
    </p>
  );
}

// {{#multiapp}}
const APPS = [
  // {{#apps}}
  "{{app}}",
  // {{/apps}}
];

export function App({ path }: { path: string }) {
  const app = APPS.find((each) => path === `/${each}` || path.startsWith(`/${each}/`));
  return (
    <main>
      <h1>{app ? `{{marketing}} — ${app}` : "{{marketing}}"}</h1>
      {!app && (
        <ul>
          {APPS.map((each) => (
            <li key={each}>
              <a href={`/${each}`}>{each}</a>
            </li>
          ))}
        </ul>
      )}
      <Bar />
    </main>
  );
}
// {{/multiapp}}
// {{^multiapp}}
export function App(_: { path: string }) {
  return (
    <main>
      <h1>{{marketing}}</h1>
      <Bar />
    </main>
  );
}
// {{/multiapp}}
