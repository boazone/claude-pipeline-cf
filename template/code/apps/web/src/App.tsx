import { ENVIRONMENT } from "./env";

/**
 * The shell. The first story of each app replaces its placeholder; the environment marker stays on
 * every environment but production, so nobody mistakes dev for the real thing.
 */
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
      {ENVIRONMENT !== "production" && <p>{ENVIRONMENT}</p>}
    </main>
  );
}
// {{/multiapp}}
// {{^multiapp}}
export function App(_: { path: string }) {
  return (
    <main>
      <h1>{{marketing}}</h1>
      {ENVIRONMENT !== "production" && <p>{ENVIRONMENT}</p>}
    </main>
  );
}
// {{/multiapp}}
