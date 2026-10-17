import { expect, it } from "vitest";
import { ROOT, sweep } from "./index.mjs";

// The queue's rules, with a fake runner: no git, no files.

const git = `git -C ${ROOT} worktree remove .claude/worktrees/bold-babbage-33bd49`;
const preview = "npm run preview:dev -w @{{name}}/api -- 12 --delete";

it("deletes a line whose command succeeds", () => {
  expect(sweep([`0 ${git}`], () => true)).toEqual([]);
});

it("keeps a failing line with one try more", () => {
  expect(sweep([`0 ${git}`, `1 ${preview}`], () => false)).toEqual([`1 ${git}`, `2 ${preview}`]);
});

it("deletes a line on its third failure", () => {
  expect(sweep([`2 ${git}`], () => false)).toEqual([]);
});

it("runs each shape R8 queues", () => {
  const ran = [];
  const shapes = [
    git,
    `git -C ${ROOT} branch -D features/{{PREFIX}}-12 revert-{{PREFIX}}-12 claude/pipeline-x-12-b24fd7`,
    `git -C ${ROOT} fetch --prune`,
    preview,
  ];
  sweep(
    shapes.map((s) => `0 ${s}`),
    (c) => ran.push(c),
  );
  expect(ran).toEqual(shapes);
});

it("drops a line outside the shapes without running it", () => {
  const ran = [];
  const lines = [
    "0 rm -rf C:/dev",
    `${git}`,
    `0 ${git} & calc`,
    `0 git -C ${ROOT} -c alias.x=!calc x`,
    `0 git -C ${ROOT} branch -D main`,
    `0 git -C ${ROOT} push --force origin HEAD:env/prod`,
    `0 git -C ${ROOT} fetch --prune -C C:/elsewhere`,
    "0 npm run preview:dev --script-shell=calc.exe",
    `0 ${preview} & calc`,
  ];
  expect(sweep(lines, (c) => ran.push(c))).toEqual([]);
  expect(ran).toEqual([]);
});
