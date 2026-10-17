import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

/**
 * `node scripts/render.mjs <answers.json> <target>` — `template/` into a new project folder.
 *
 * 1. `{{key}}` is an answer. An unknown key throws: a typo never reaches a project.
 * 2. `{{#flag}}…{{/flag}}` is kept when the flag is on, `{{^flag}}…{{/flag}}` when it is off. A line
 *    holding only a tag (after `//`, `#`, `*` or `<!--` if any) goes with it, so JSON and code stay valid.
 * 3. `{{#apps}}…{{/apps}}` repeats per app, with `{{app}}` and `{{App}}` inside.
 * 4. A path with `__app__` is written once per app. A file that renders empty is not written.
 * 5. `docs/PIPELINE.md` and `docs/SETUP.md` become the project's `vibe/dev/PIPELINE.md` and
 *    `vibe/dev/SETUP.md`, their `<P>`, `<name>`, … filled.
 */

const ROOT = join(import.meta.dirname, "..");
const TEMPLATE = join(ROOT, "template");
const FLAGS = ["qa", "r2", "ai", "google", "routines", "i18n"];

/** The answers, checked, plus what derives from them. */
export function context(answers) {
  for (const key of ["name", "PREFIX", "marketing", "domain", "root", "email", "gh_owner", "dev_subdomain"]) {
    if (typeof answers[key] !== "string" || !answers[key]) throw new Error(`answers.${key} is missing`);
  }
  if (!/^[a-z][a-z0-9-]*$/.test(answers.name)) throw new Error("name: lowercase letters, digits and -");
  if (!/^[A-Z][A-Z0-9]*$/.test(answers.PREFIX)) throw new Error("PREFIX: uppercase letters and digits");
  const apps = answers.apps?.length ? answers.apps : [answers.name];
  for (const app of apps) if (!/^[a-z][a-z0-9-]*$/.test(app)) throw new Error(`app ${app}: lowercase and -`);
  const flags = Object.fromEntries(FLAGS.map((flag) => [flag, Boolean(answers.flags?.[flag])]));
  return {
    values: {
      ...answers,
      root: answers.root.replaceAll("\\", "/"),
      NAME: answers.name.toUpperCase().replaceAll("-", "_"),
      prefix: answers.PREFIX.toLowerCase(),
      purpose: answers.purpose ?? "",
      description: answers.description ?? "",
      app_list: apps.join(" · "),
      app_paths: apps.join("|"),
      app_first: apps[0],
      today: answers.today ?? new Date().toISOString().slice(0, 10),
    },
    flags: { ...flags, multiapp: apps.length > 1 },
    apps,
  };
}

const TAG_LINE = /^[ \t]*(?:\/\/ ?|# ?|<!-- ?|\* ?)?(\{\{[#^/]\w+\}\})(?: ?-->)?[ \t]*\r?\n/gm;
const SECTION = /\{\{([#^])(\w+)\}\}((?:(?!\{\{[#^]\2\}\})[\s\S])*?)\{\{\/\2\}\}/;

/** One text through the rules above. */
export function fill(text, { values, flags, apps }, extra = {}) {
  let out = text.replace(TAG_LINE, "$1");
  for (let match = out.match(SECTION); match; match = out.match(SECTION)) {
    const [whole, kind, name, body] = match;
    let replacement;
    if (name === "apps") {
      if (kind === "^") throw new Error("{{^apps}} is not a section");
      replacement = apps.map((app) => body.replaceAll("{{app}}", app).replaceAll("{{App}}", title(app))).join("");
    } else {
      if (!(name in flags)) throw new Error(`unknown flag {{${kind}${name}}}`);
      replacement = flags[name] === (kind === "#") ? body : "";
    }
    out = out.replace(whole, () => replacement);
  }
  const all = { ...values, ...extra };
  return out.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in all)) throw new Error(`unknown placeholder {{${key}}}`);
    return all[key];
  });
}

const title = (app) => app.charAt(0).toUpperCase() + app.slice(1);

function* files(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else yield path;
  }
}

/** Every file to write, as `{ path, text }`, `path` relative to the target. */
export function render(answers, template = TEMPLATE) {
  const ctx = context(answers);
  const out = [];
  const add = (path, text, extra) => {
    const body = fill(text, ctx, extra);
    if (body.trim()) out.push({ path, text: body });
  };
  for (const source of files(template)) {
    const path = relative(template, source).replaceAll("\\", "/");
    const text = readFileSync(source, "utf8");
    if (path.includes("__app__")) {
      for (const app of ctx.apps) add(path.replaceAll("__app__", app), text, { app, App: title(app) });
    } else add(path, text);
  }
  const angle = {
    "<P>": ctx.values.PREFIX,
    "<name>": ctx.values.name,
    "<domain>": ctx.values.domain,
    "<dev_subdomain>": ctx.values.dev_subdomain,
    "<owner>": ctx.values.gh_owner,
    "<root>": ctx.values.root,
  };
  for (const doc of ["PIPELINE", "SETUP"]) {
    let text = readFileSync(join(ROOT, "docs", `${doc}.md`), "utf8");
    for (const [from, to] of Object.entries(angle)) text = text.replaceAll(from, to);
    // The project's copy is `/start`'s state: each step that passes is a line here, never ticked in place.
    if (doc === "SETUP") {
      text +=
        "\n## Log\n\nWritten by `/start`, one line per step as its check passes, oldest first — " +
        "`- S<k>.<i> — YYYY-MM-DD — <what the check showed>`. A step with no line is not done.\n\n";
    }
    out.push({ path: `vibe/dev/${doc}.md`, text });
  }
  // The answers themselves, so a later `/start` resumes here and a template upgrade can re-render.
  out.push({ path: "vibe/dev/start.json", text: `${JSON.stringify(answers, null, 2)}\n` });
  return out;
}

if (import.meta.main) {
  const [answersFile, target] = process.argv.slice(2);
  if (!answersFile || !target) {
    console.error("node scripts/render.mjs <answers.json> <target>");
    process.exit(1);
  }
  if (existsSync(target) && readdirSync(target).some((name) => name !== ".git")) {
    console.error(`${target} is not empty — render writes a new project only.`);
    process.exit(1);
  }
  const written = render(JSON.parse(readFileSync(answersFile, "utf8")));
  for (const { path, text } of written) {
    const to = join(target, path);
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, text);
  }
  console.log(`render: ${written.length} files into ${target}`);
}
