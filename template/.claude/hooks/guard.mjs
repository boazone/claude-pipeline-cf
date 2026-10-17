// A PreToolUse hook (`.claude/settings.json`) on every tool that runs a command, and on every
// tool that writes a file.
//
// 1. Denies the ways around the commit gate: `git commit --no-verify` or `-n`, and any command that
//    sets `core.hooksPath`. Reading it is allowed.
// 2. Asks before a write to the gate itself — `.githooks/`, `.claude/settings.json`, `.claude/hooks/`.
//    `core.hooksPath` is relative, so a worktree runs its own branch's `.githooks/pre-commit`.
// 3. Asks before a command that changes production — a deploy, a migration or `d1 execute` against
//    it, a push to `env/prod`. Reading production is not asked.
// 4. Asks before a pull request merge — on `env/prod` and `env/qa` the merge is the deploy.
//    Every `gh` command that names a merge asks, but one: `gh pr merge <n>` alone, with plain flags,
//    whose base GitHub (`gh pr view`) says is not an `env/` branch — the merge onto `main` of every R5.
//    One `cd` into a worktree of this repo may come before it, and `tail`, `head` or `gh` reads after
//    it; the base is looked up where the merge runs.
//
// It reads the command line, not what the command calls: a script that deploys from inside is not seen,
// nor a gate file edited through a shell (ponytail: a line-level guard; the dev account, which the agent's token
// cannot leave, is the backstop). In doubt it asks — a false question costs a word, a missed one costs production.

import { execFileSync } from "node:child_process";

// Heredoc and PowerShell here-string bodies are text, not commands.
const bodies = (text) =>
  text.replace(/<<-?\s*['"]?(\w+)['"]?[^\n]*\n[\s\S]*?\n\s*\1\b/g, "<<").replace(/@(['"])\r?\n[\s\S]*?\r?\n\1@/g, '""');
// Quoted text — a message, a query — is not a flag.
const strip = (text) => bodies(text).replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, '""');
const segments = (text) => text.split(/&&|\|\||[;|\n]/);

const BYPASS =
  "The commit gate (`.githooks/pre-commit`: gitleaks, then `npm run verify`) is not to be walked around. Fix what it refused instead.";
const COMMIT = /\bgit(\s+(-C|-c)\s+\S+|\s+--[\w-]+(=\S+)?)*\s+commit\b/;
const NO_VERIFY = /\s["']?(--no-veri\w*|-[a-zA-Z]*n[a-zA-Z]*)["']?(?=[\s"']|$)/;
// `-m "…"` is a message, which may mention a flag.
const MESSAGE = /(-m|--message)[\s=]*("(?:\\.|[^"\\])*"|'[^']*')/g;
// `git config` with anything but a plain read of the key; `-c` and `GIT_CONFIG_*` set it for one command.
const HOOKS_PATH_CONFIG =
  /\bconfig\b(?!\s+(--(get|show-origin|show-scope|local|global|system|worktree)\s+)*core\.hookspath\s*$).*core\.hookspath/i;
const HOOKS_PATH_INLINE = /(-c\s*|GIT_CONFIG\w*\s*=\s*)["']?core\.hookspath/i;
const PRODUCTION = /(--env[\s=]+|-e[\s=]+)["']?production\b|\bCLOUDFLARE_ENV\W+production\b|\b{{name}}-prod(uction)?\b/i;
const DEPLOYISH = /\bwrangler\b|\bdeploy\b/;
const WRANGLER_READ = /--dry-run\b(?!=false)|\bmigrations\s+list\b|\bd1\s+export\b|\btime-travel\s+info\b|\btail\b/;
// A read that carries a write verb, a command substitution or a comment is not a read (a review's finding:
// `restore --bookmark=$(… time-travel info …)` passed as one).
const NOT_A_READ = /\b(apply|execute|restore|delete|put|rollback|create)\b|\$\(|`|#/;
const reads = (part) => WRANGLER_READ.test(part) && !NOT_A_READ.test(part);
// Read with quotes and PowerShell backticks deleted, heredoc bodies kept, so `gh "pr" merge`,
// `mer`ge` and `bash <<EOF` read as what they run; a lone `&` (not `2>&1`) separates commands too.
const unquote = (text) => text.replace(/["'`]/g, "");
const GH_PARTS = /&&|\|\||(?<![>&])&(?![>&])|[;|\n]/;
const GH = /(^|[\s\\/($])gh(\.exe)?(\s|$)/i;
// `merge` anywhere: `pr merge`, `pulls/<n>/merge`, GraphQL's `mergePullRequest`; an alias can hide one.
const GH_MERGE = /merge|\balias\s+(set|import)\b/i;
const GH_READ = /^\s*gh\s+pr\s+(list|view|status|checks|diff|create)\b(?!.*\$\()/;
const PLAIN_MERGE =
  /^\s*gh\s+pr\s+merge\s+(\d+)(?:\s+(?:--squash|--merge|--rebase|--auto|--delete-branch|-[smrd]+|(?:-R|--repo)[\s=]+([\w.-]+\/[\w.-]+)))*(?:\s+2>&1)?\s*$/;
// What may surround the plain merge: one `cd` into a worktree of this repo, one token, no
// substitution (R4's reviews: `cd $(gh pr edit …)`, `cd <another repo>`); after it `tail -N`, `head -N` or
// a `gh` read. A `gh` inside backticks or `<(…)` would ride a read once `unquote` has run, so it asks first.
const CD = /^\s*cd\s+(\S*[\\/]\.claude[\\/]worktrees[\\/][^\s$]+)\s*$/;
const AFTER = /^\s*(tail|head)\s+-\d+\s*$/;
const GH_NESTED = /`\s*gh\b|<\(\s*gh\b/;
// The pull request's base, or "" when GitHub does not say — which asks. Looked up in `cwd` when the
// merge runs after a `cd`: a folder that is not there, or is another repository, answers for itself.
const ghBase = (pr, repo, cwd) => {
  try {
    const args = ["pr", "view", pr, ...(repo ? ["-R", repo] : []), "--json", "baseRefName", "-q", ".baseRefName"];
    // Git Bash writes `/c/dev/…`, which Node cannot open as a folder.
    const dir = cwd?.replace(/^\/([a-z])\//i, "$1:/");
    return execFileSync("gh", args, { cwd: dir, encoding: "utf8", timeout: 15000, stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};
const merges = (command, base) => {
  if (GH_MERGE.test(command) && GH_NESTED.test(command)) return true;
  const parts = unquote(command).split(GH_PARTS).filter((part) => part.trim());
  const at = parts.findIndex((part) => GH.test(part) && GH_MERGE.test(part) && !GH_READ.test(part));
  if (at < 0) return false;
  const cds = parts.slice(0, at).map((part) => part.match(CD));
  const plain =
    cds.every(Boolean) &&
    parts.slice(at + 1).every((part) => GH_READ.test(part) || AFTER.test(part)) &&
    parts[at].match(PLAIN_MERGE);
  if (!plain) return true;
  // `-R` read on its own: a capture inside `(?:…)*` is reset by the flag after it (R4's evaluator).
  const repo = parts[at].match(/(?:-R|--repo)[\s=]+([\w.-]+\/[\w.-]+)/)?.[1];
  return !/^(?!env\/)\S/.test(base(plain[1], repo, cds.at(-1)?.[1]));
};

const GATE_FILE = /(^|[\\/])(\.githooks[\\/]|\.claude[\\/]settings\.json$|\.claude[\\/]hooks[\\/])/;

/** `{ decision: "deny" | "ask", reason }` for a tool call, or `null` to let it through. */
export function judge({ command, file_path: file } = {}, base = ghBase) {
  if (file) {
    return GATE_FILE.test(file)
      ? { decision: "ask", reason: `This edits the commit gate itself (${file}) — the guard asks.` }
      : null;
  }
  if (!command) return null;
  const plain = segments(strip(command));
  const raw = segments(bodies(command));
  if (raw.some((part) => COMMIT.test(strip(part)) && NO_VERIFY.test(part.replace(MESSAGE, "")))) {
    return { decision: "deny", reason: `\`git commit --no-verify\` / \`-n\`. ${BYPASS}` };
  }
  if (plain.some((part) => HOOKS_PATH_CONFIG.test(part)) || raw.some((part) => HOOKS_PATH_INLINE.test(part))) {
    return { decision: "deny", reason: `Setting \`core.hooksPath\`. ${BYPASS}` };
  }
  const writes =
    (PRODUCTION.test(command) && plain.some((part) => DEPLOYISH.test(part) && !reads(part))) ||
    // A refspec may be quoted — `"v0.2.0^{commit}:env/prod"` — so the target is read before `strip`.
    raw.some((part) => /\bgit\b.*\bpush\b/.test(strip(part)) && /\benv\/prod\b|--all\b|--mirror\b/.test(part)) ||
    (/\benv\/prod\b/.test(command) && plain.some((part) => /\bgh\b/.test(part)));
  if (writes) return { decision: "ask", reason: "This command changes production — the guard asks before every one." };
  return merges(command, base)
    ? { decision: "ask", reason: "A pull request merge onto `env/prod` or `env/qa` deploys — the guard asks before any merge it cannot prove is onto `main`." }
    : null;
}

if (import.meta.main) {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const verdict = judge(JSON.parse(input).tool_input);
  if (verdict) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: verdict.decision,
          permissionDecisionReason: verdict.reason,
        },
      }),
    );
  }
}
