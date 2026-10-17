// The decisions page (`vibe/dev/PLAN-pipeline.md` §8 rule 1). Reads every story from git as
// `/pipeline` §1 does — `origin/main` and every `origin/features/{{PREFIX}}-*`, the copy whose `log.md` has
// more entries — writes `DECISIONS.md`, and force-pushes it as the only file of the orphan branch
// `decisions`, read in the GitHub app. `npm run decisions` from `code/`; `-- --print` writes it to
// stdout instead. The skills run it after each step's push.
import { execFileSync } from "node:child_process";

const IN_FLIGHT = ["open", "in progress", "blocked", "dev", "accepted", "local", "merged"];

/** The `## ` entries of a `log.md`. */
export const headings = (log) => log.split(/\r?\n/).filter((line) => line.startsWith("## "));

/** `/pipeline` §1: the branch's copy only when its log has strictly more entries. */
export const pick = (main, branch) => {
  if (!branch) return main;
  if (!main) return branch;
  return headings(branch.log).length > headings(main.log).length ? branch : main;
};

/** `story.md`'s title and status. */
export const story = (text) => ({
  title: (text.match(/^# {{PREFIX}}-\d+ — (.+)$/m)?.[1] ?? "").trim(),
  status: (text.match(/^\| \*\*Status\*\* \| (.+?) \|/m)?.[1] ?? "").trim(),
});

/** A `plan.md` section's list items, each with its indented continuation lines joined. */
export const items = (plan, section) => {
  const lines = plan.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${section}`);
  if (start < 0) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    const item = line.match(/^(?:-|\d+\.) (.+)$/);
    if (item) out.push(item[1].trim());
    else if (/^\s+\S/.test(line) && out.length) out[out.length - 1] += ` ${line.trim()}`;
  }
  return out;
};

/** The decisions `plan.md` lists — the `### <area>: <decision>` headings under `## Decisions`. */
export const planned = (plan) => {
  const lines = plan.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "## Decisions");
  if (start < 0) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .filter((line) => line.startsWith("### "))
    .map((line) => line.slice(4).trim());
};

/** A decision's key, as `/pipeline` matches it — a log heading may drop the plan's backticks. */
const key = (text) => text.replaceAll("`", "");

/** `/run` R2: the decisions whose latest entry in the whole log is `waiting` and which the plan still lists. */
export const waiting = (log, plan) => {
  const latest = new Map();
  for (const line of headings(log)) {
    const r2 = line.match(/ — R2: B\d+ (.+)$/);
    if (!r2) continue;
    const entry = r2[1];
    const answer = entry.match(/^(.+?) (answered|refused) — /);
    if (answer) latest.set(key(answer[1]), answer[2]);
    else if (entry.endsWith(" — waiting")) latest.set(key(entry.slice(0, -" — waiting".length)), "waiting");
  }
  return planned(plan).filter((decision) => latest.get(key(decision)) === "waiting");
};

const link = (s) => `[${s.index}](${s.url}) — ${s.title}`;
const last = (log) => (headings(log).at(-1) ?? "").replace(/^## /, "");

/** A whole file as a part of the page: its first `# ` title dropped, every heading one level down. */
export const inline = (text) =>
  text
    .split(/\r?\n/)
    .filter((_line, i, lines) => i !== lines.findIndex((l) => l.startsWith("# ")))
    .map((line) => (/^#{1,5} /.test(line) ? `#${line}` : line))
    .join("\n")
    .trim();

/**
 * The page. `stories` are the picked copies, each `{ index, url, title, status, log, plan }`;
 * `files` is `{ sweep, review }` — `tasks/SWEEP.md` and `tasks/REVIEW.md` on `main`.
 */
export const page = (stories, generated, files = {}) => {
  const flight = stories.filter((s) => IN_FLIGHT.includes(s.status));
  const by = (...statuses) => flight.filter((s) => statuses.includes(s.status));
  const out = [`# Decisions`, "", `Generated ${generated} from the repo — \`npm run decisions\`.`, ""];
  const section = (title, rows) => {
    out.push(`## ${title}`, "");
    out.push(...(rows.length ? rows : ["Nothing."]), "");
  };

  section(
    "Decision cards waiting",
    flight.flatMap((s) => waiting(s.log, s.plan).map((key) => `- ${link(s)}: **${key}** — answer in its session`)),
  );
  section(
    "Blocked",
    by("blocked").map((s) => `- ${link(s)}: ${last(s.log)}`),
  );
  section(
    "Waiting for your accept — on dev",
    by("dev", "local").map((s) => `- ${link(s)} — \`/pipeline ${s.index} accepted\`, or \`notes <text>\``),
  );
  section(
    "Accepted — waiting to ship",
    by("accepted", "merged").map((s) => `- ${link(s)} — \`/pipeline ${s.index} ship\``),
  );
  section(
    "Open",
    by("open").map((s) => `- ${link(s)} — \`/pipeline ${s.index}\``),
  );
  section(
    "In progress",
    by("in progress").map((s) => `- ${link(s)}: ${last(s.log)}`),
  );
  section(
    "Defaults the agent took",
    by("open", "in progress", "blocked", "dev", "local").flatMap((s) => {
      const defaults = items(s.plan, "Defaults");
      if (!defaults.length) return [];
      return [
        `### ${link(s)}`,
        "",
        s.status === "dev"
          ? `To overturn one: \`/pipeline ${s.index} notes default <k>: <what instead>\`.`
          : `To overturn one: reply in ${s.index}'s session — *default <k>: <what instead>*.`,
        "",
        ...defaults.map((d, i) => `${i + 1}. ${d}`),
        "",
      ];
    }),
  );
  // The sweep's and the review's files, whole: their first line is their last run.
  section("Bug candidates — `tasks/SWEEP.md`", files.sweep ? [inline(files.sweep)] : ["Not on `main` yet."]);
  section("Weekly review — `tasks/REVIEW.md`", files.review ? [inline(files.review)] : ["Not on `main` yet."]);
  out.push(`On QA, waiting for production: ${stories.filter((s) => s.status === "qa").length} stories.`, "");
  return out.join("\n");
};

// Fixed, not read from `origin`: a remote URL can carry a token, and the page is pushed.
const REPO = "https://github.com/{{gh_owner}}/{{name}}";
const git = (args, input, stderr = "inherit") =>
  execFileSync("git", args, {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["pipe", "pipe", stderr],
  });
const show = (ref, path) => {
  try {
    return git(["show", `${ref}:${path}`], undefined, "ignore");
  } catch {
    return "";
  }
};

/** Every story's picked copy, from the remote refs. */
export const read = () => {
  const branches = git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin/features/"])
    .split("\n")
    .map((ref) => ref.trim().match(/^origin\/features\/({{PREFIX}}-\d+)$/)?.[1])
    .filter(Boolean);
  const indexes = new Set([...show("origin/main", "tasks/INDEX.md").matchAll(/^\| \[({{PREFIX}}-\d+)\]/gm)].map((m) => m[1]));
  for (const index of branches) indexes.add(index);

  const copy = (ref, branch, index) => {
    const log = show(ref, `tasks/${index}/log.md`);
    if (!log) return undefined;
    const plan = show(ref, `tasks/${index}/plan.md`);
    const url = `${REPO}/blob/${branch}/tasks/${index}/story.md`;
    return { index, url, log, plan, ...story(show(ref, `tasks/${index}/story.md`)) };
  };
  return [...indexes]
    .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]))
    .map((index) =>
      pick(
        copy("origin/main", "main", index),
        branches.includes(index) ? copy(`origin/features/${index}`, `features/${index}`, index) : undefined,
      ),
    )
    .filter(Boolean);
};

/** The page as the only file of the orphan branch `decisions`, by plumbing — no checkout, no index. */
const publish = (text) => {
  const blob = git(["hash-object", "-w", "--stdin"], text).trim();
  const tree = git(["mktree"], `100644 blob ${blob}\tDECISIONS.md\n`).trim();
  const commit = git(["commit-tree", tree, "-m", "Decisions page"]).trim();
  git(["push", "--force", "--quiet", "origin", `${commit}:refs/heads/decisions`]);
};

if (import.meta.main) {
  git(["fetch", "--quiet", "--prune", "origin"]);
  const files = { sweep: show("origin/main", "tasks/SWEEP.md"), review: show("origin/main", "tasks/REVIEW.md") };
  const text = page(read(), `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, files);
  if (process.argv.includes("--print")) process.stdout.write(text);
  else publish(text);
}
