// What `guard.mjs` denies, asks and lets through. `node .claude/hooks/guard.check.mjs`, and
// the last step of `npm run verify`; exits 1 naming the tool call judged wrong.
import assert from "node:assert/strict";
import { judge } from "./guard.mjs";

const heredoc = "git commit -F - <<'EOF'\nFND-62 — `git commit -n` is denied\nEOF";
const hereString = "git commit -m @'\nFND-62 — the gate's `git commit -n` is denied\n'@";
// The merge line every session writes (which waited 28 hours on a prompt).
const merged = (pr) =>
  `cd {{root}}/.claude/worktrees/x && gh pr merge ${pr} --squash 2>&1 | tail -3; gh pr view ${pr} --json state,mergeCommit -q '.state+" "+.mergeCommit.oid'`;
const cases = {
  deny: [
    "git commit --no-verify -m x",
    'git commit -n -m "x"',
    "git commit -anm x",
    'git commit -nm"msg"',
    'git commit "--no-verify" -m x',
    "git commit -m x '-n'",
    "cd code && git commit --no-verif -m x",
    'git -C {{root}} commit -m "x" --no-verify',
    "git config core.hooksPath /dev/null",
    "git config --unset core.hooksPath",
    "git -c core.hooksPath=/dev/null commit -m x",
    'git -c "core.hooksPath=" commit -m x',
    "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hookspath GIT_CONFIG_VALUE_0= git commit -m x",
  ],
  ask: [
    "npx wrangler deploy --env production",
    "cd code/apps/api && npx wrangler deploy -e production",
    "npm run deploy -w @{{name}}/api -- --env=production",
    "npm run -w @{{name}}/api deploy -- --env production",
    "node --run deploy -- --env production",
    "CLOUDFLARE_ENV=production npx wrangler deploy",
    "npx wrangler deploy --dry-run=false --env production",
    "npx wrangler d1 migrations apply {{name}}-prod --remote",
    'npx wrangler d1 execute {{name}}-prod --remote --command "select 1"',
    'npx wrangler d1 execute {{name}}-prod --remote --command "delete from tail"',
    "npx wrangler d1 migrations list {{name}}-prod --remote && npx wrangler d1 migrations apply {{name}}-prod --remote",
    "npx wrangler secret put OPENAI_API_KEY --env production",
    "npx wrangler secret list --env production",
    "npx wrangler rollback --env production",
    "npx wrangler r2 object delete {{name}}-prod/x --remote",
    "npx wrangler d1 time-travel restore {{name}}-prod --bookmark=00000085-0000024c-00004c6d",
    "git push --force-with-lease origin v0.1.0^{commit}:env/prod",
    'git push origin "v0.2.0^{commit}:env/prod"',
    "git push origin 'v0.2.0^{commit}:env/prod'",
    "npx wrangler d1 time-travel restore {{name}}-prod --env production --bookmark=$(npx wrangler d1 time-travel info {{name}}-prod --env production --json | jq -r .bookmark)",
    "npx wrangler d1 migrations apply {{name}}-prod --env production --remote # then time-travel info",
    "git push origin env/prod",
    "git push origin HEAD:env/prod",
    "git push --force origin abc123:refs/heads/env/prod",
    "git push origin --all",
    "git push --mirror origin",
    "gh api -X PATCH repos/{{gh_owner}}/{{name}}/git/refs/heads/env/prod -f sha=abc",
    // By the pull request's base (`BASES` below), not the command's text.
    "gh pr merge 12 --squash",
    "gh pr merge 13 --squash",
    "gh pr merge 99 --squash",
    // Any merge but the plain one asks, whatever its base: the R4 reviews' ways past a parser.
    'gh pr merge --squash --subject "FND-9 — fix" 12',
    'gh pr merge 11 --squash --subject "FND-9 — into main"',
    "gh pr merge -R {{gh_owner}}/{{name}} 12 --merge",
    "gh pr -R {{gh_owner}}/{{name}} merge 12 --squash",
    "gh pr merge -st 11 12",
    "cd code && gh pr merge 14 --auto --squash",
    "git switch hotfix/FND-1 && gh pr merge 11 --squash",
    "gh pr edit 11 --base env/qa && gh pr merge 11 --squash",
    "gh pr merge 12 --squash & gh pr merge 11 --squash",
    "gh pr merge --squash",
    "gh api -X PUT repos/{{gh_owner}}/{{name}}/pulls/11/merge",
    'gh api -X PUT "repos/{{gh_owner}}/{{name}}/pulls/12/merge" -f merge_method=squash',
    `gh api graphql -f query='mutation{mergePullRequest(input:{pullRequestId:"PR_1"}){clientMutationId}}'`,
    '& "C:\\Program Files\\GitHub CLI\\gh.exe" pr merge 11 --squash',
    "GH pr merge 11",
    'gh "pr" merge 12',
    "gh pr mer`ge 12",
    "bash -c 'gh pr merge 11'",
    "bash <<'EOF'\ngh pr merge 12\nEOF",
    "gh alias set m 'pr merge'",
    // The session's line still asks on an `env/` base, no base, a stranger before the merge, a
    // `gh` write or a second merge after it, a bare merge after a `cd`, a redirect the skill never writes.
    merged(12),
    merged(13),
    merged(99),
    "git fetch origin && gh pr merge 11 --squash",
    "cd code && gh pr merge 11 --squash; gh pr edit 11 --base env/qa",
    "cd code && gh pr merge 11 --squash && gh pr merge 12 --squash",
    "cd code; gh pr merge --squash",
    "gh pr merge 11 --squash 2>/dev/null",
    // R4's reviews: a substitution in the `cd`, a `cd` elsewhere, a write or a shell after the merge, a `gh`
    // inside backticks or `<(…)` riding a read.
    "cd $(gh pr edit 11 --base env/qa); gh pr merge 11 --squash",
    "cd `gh pr edit 11 --base env/qa`; gh pr merge 11 --squash",
    "cd $(curl -s -X PATCH -H \"Authorization: Bearer $(gh auth token)\" https://api.github.com/repos/{{gh_owner}}/{{name}}/pulls/11 -d '{\"base\":\"env/qa\"}' -o /dev/null -w /tmp) && gh pr merge 11 --squash",
    "cd C:/dev/personal/other-repo && gh pr merge 11 --squash",
    "cd {{root}}/.claude/worktrees/not-there && gh pr merge 11 --squash",
    "gh pr merge 11 --squash; git push origin main:env/qa",
    "gh pr merge 11 --squash && git push origin HEAD:env/qa",
    "gh pr merge 11 --squash; curl -X PUT -H \"Authorization: Bearer $GITHUB_TOKEN\" https://api.github.com/repos/{{gh_owner}}/{{name}}/pulls/12/merge",
    "gh pr merge 11 --squash; gh pr view 11 --json body -q .body | bash",
    "gh pr merge 11 --squash 2>&1 | tail -3 | sh",
    "gh pr merge 11 --squash; gh pr view 11 -q `gh pr merge 12 --squash`",
    "gh pr merge 11 --squash; gh pr view 11 --body-file <(gh pr merge 12 --squash)",
    "cd {{root}}/.claude/worktrees/x && gh pr merge 11 -R other/{{name}} --squash",
    "cd {{root}}/.claude/worktrees/x && cd {{root}}/.claude/worktrees/y && gh pr merge 11 --squash",
  ],
  pass: [
    'git commit -m "FND-62 — the -n flag is denied"',
    'git commit -m "mentions core.hooksPath"',
    heredoc,
    hereString,
    "git commit --amend --no-edit",
    "git log -n 5 --grep=commit",
    "git log -n 3 features/commit-gate",
    "git config --get core.hooksPath",
    "git config core.hooksPath",
    "npx wrangler d1 migrations list {{name}}-prod --remote",
    "npx wrangler d1 export {{name}}-prod --remote --output prod.sql",
    "npx wrangler d1 time-travel info {{name}}-prod",
    "npx wrangler deploy --dry-run --env production --outdir x",
    "npx wrangler tail {{name}}-production",
    "git log --oneline env/prod",
    "git fetch origin env/prod",
    "git push origin env/qa",
    "git push origin features/FND-62",
    "npx wrangler d1 migrations apply {{name}}-qa --remote --env qa",
    "npm run db:migrate:story -w @{{name}}/api -- 62",
    "npm run verify",
    "gh pr merge 11 --squash",
    "gh pr merge 11 -R {{gh_owner}}/{{name}} --merge --delete-branch",
    "gh pr view 12 --json baseRefName,mergeCommit",
    "gh pr list --head features/FND-1 --state merged --json number,mergeCommit,url --limit 1",
    'gh pr create --base main --head features/FND-1 --title "FND-1 — merge the drafts" --body-file b.md',
    "git merge origin/main 2>&1",
    // The session's line onto `main`: a `cd` before, `2>&1`, a `tail` and a `gh pr view` after.
    merged(11),
  ],
};
// A stub for `gh pr view`, so the check stays offline: 11 onto main, 12 env/prod, 13 and 14 env/qa;
// 99 is not found, which asks. Another repository, or a `cd` target that is not the one worktree the
// lines above name, is not found either.
const BASES = { 11: "main", 12: "env/prod", 13: "env/qa", 14: "env/qa" };
const base = (pr, repo, cwd) => {
  if (repo !== undefined && repo !== "{{gh_owner}}/{{name}}") return "";
  if (cwd !== undefined && cwd !== "{{root}}/.claude/worktrees/x") return "";
  return BASES[pr] ?? "";
};
const files = {
  ask: [".githooks/pre-commit", "C:\\x\\.claude\\settings.json", "/x/.claude/hooks/guard.mjs"],
  pass: ["C:\\x\\code\\apps\\api\\src\\run.ts", ".claude/settings.local.json", "tasks/FND-62/log.md"],
};
for (const [expected, commands] of Object.entries(cases)) {
  for (const command of commands) assert.equal(judge({ command }, base)?.decision ?? "pass", expected, command);
}
for (const [expected, paths] of Object.entries(files)) {
  for (const file_path of paths) assert.equal(judge({ file_path })?.decision ?? "pass", expected, file_path);
}
console.log(`guard: ok, ${Object.values(cases).flat().length} commands, ${Object.values(files).flat().length} files`);
