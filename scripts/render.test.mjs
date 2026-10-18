import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { context, fill, render } from "./render.mjs";

const answers = {
  name: "shop",
  PREFIX: "SHP",
  marketing: "Shoply",
  domain: "shoply.app",
  root: "C:\\dev\\shop",
  email: "me@example.com",
  gh_owner: "me",
  dev_subdomain: "shop-dev",
  apps: ["admin", "store"],
  flags: { qa: true, r2: false },
};
const ctx = context(answers);

test("placeholders, derived values, and an unknown key", () => {
  assert.equal(fill("{{name}} {{NAME}} {{root}} {{app_paths}}", ctx), "shop SHOP C:/dev/shop admin|store");
  assert.throws(() => fill("{{nmae}}", ctx), /unknown placeholder \{\{nmae\}\}/);
  assert.equal(fill("style={{color: 1}}", ctx), "style={{color: 1}}");
});

test("flags keep or drop, tag lines vanish, an unknown flag throws", () => {
  const text = '{\n  // {{#qa}}\n  "qa": 1,\n  // {{/qa}}\n  // {{#r2}}\n  "r2": 1,\n  // {{/r2}}\n  "x": 0\n}\n';
  assert.equal(fill(text, ctx), '{\n  "qa": 1,\n  "x": 0\n}\n');
  assert.equal(fill("a{{^r2}}b{{/r2}}{{^qa}}c{{/qa}}", ctx), "ab");
  assert.equal(fill("{{#multiapp}}many{{#qa}} qa{{/qa}}{{/multiapp}}", ctx), "many qa");
  assert.throws(() => fill("{{#nope}}x{{/nope}}", ctx), /unknown flag/);
});

test("the apps loop", () => {
  assert.equal(fill("{{#apps}}[{{app}}/{{App}}]{{/apps}}", ctx), "[admin/Admin][store/Store]");
});

test("render: one file per app, an empty file skipped, the docs copied", () => {
  const dir = mkdtempSync(join(tmpdir(), "render-"));
  mkdirSync(join(dir, "specs"));
  writeFileSync(join(dir, "specs", "SPEC-__app__.md"), "# {{App}} for {{marketing}}\n");
  writeFileSync(join(dir, "r2.md"), "{{#r2}}\nonly with R2\n{{/r2}}\n");
  const out = render(answers, dir);
  const paths = out.map((file) => file.path).sort();
  assert.deepEqual(paths, [
    "specs/SPEC-admin.md",
    "specs/SPEC-store.md",
    "vibe/dev/PIPELINE.md",
    "vibe/dev/SETUP.md",
    "vibe/dev/start.json",
  ]);
  assert.match(out.find((f) => f.path === "vibe/dev/SETUP.md").text, /\n## Log\n/);
  assert.equal(JSON.parse(out.find((f) => f.path === "vibe/dev/start.json").text).PREFIX, "SHP");
  assert.equal(out.find((f) => f.path === "specs/SPEC-store.md").text, "# Store for Shoply\n");
  assert.match(out.find((f) => f.path === "vibe/dev/SETUP.md").text, /shop-dev\.shop-dev\.workers\.dev/);
});

test("answers are checked", () => {
  assert.throws(() => context({ ...answers, name: "Shop" }), /name/);
  assert.throws(() => context({ ...answers, email: "" }), /email/);
  assert.equal(context({ ...answers, apps: [] }).flags.multiapp, false);
  assert.equal(context({ ...answers, domain: "a.app" }).flags.www, true);
  assert.equal(context({ ...answers, domain: "a.b.app" }).flags.www, false);
});
