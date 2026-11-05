// Run with: node --test .github/claude-review/guard.test.mjs
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkTool, safeRepoPath } from "./guard.mjs";

const workdir = realpathSync(mkdtempSync(join(tmpdir(), "guard-")));
mkdirSync(join(workdir, "src"));
writeFileSync(join(workdir, "src/a.ts"), "");
symlinkSync("/etc/hosts", join(workdir, "to-outside"));
symlinkSync(join(workdir, "missing-target"), join(workdir, "broken"));

const allowed = (name, input) => checkTool(workdir, name, input) === true;

test("Read stays inside the checkout", () => {
  assert.ok(allowed("Read", { file_path: "src/a.ts" }));
  assert.ok(allowed("Read", { file_path: join(workdir, "src/a.ts") }));
  assert.ok(!allowed("Read", { file_path: "/proc/self/environ" }));
  assert.ok(!allowed("Read", { file_path: "../../etc/passwd" }));
  assert.ok(!allowed("Read", { file_path: "to-outside" }));
  assert.ok(!allowed("Read", { file_path: "broken" }));
  assert.ok(!allowed("Read", { file_path: "~/.bashrc" }));
  assert.ok(!allowed("Read", { file_path: "$HOME/.bashrc" }));
});

test("Glob and Grep stay inside the checkout", () => {
  assert.ok(allowed("Glob", { pattern: "**/*.ts" }));
  assert.ok(!allowed("Glob", { pattern: "/etc/*" }));
  assert.ok(!allowed("Glob", { pattern: "../**" }));
  assert.ok(!allowed("Glob", { pattern: "**/*", path: "/home" }));
  assert.ok(allowed("Grep", { pattern: "foo/../bar" }));
  assert.ok(!allowed("Grep", { pattern: "x", glob: "../**" }));
  assert.ok(!allowed("Grep", { pattern: "x", path: "to-outside" }));
  assert.ok(!allowed("Grep", { pattern: "x", path: "~" }));
  assert.ok(!allowed("Glob", { pattern: "~/**" }));
  assert.ok(!allowed("Glob", { pattern: "{..,x}/**" }));
  assert.ok(!allowed("Grep", { pattern: "x", glob: "{..}/*" }));
  assert.ok(allowed("Grep", { pattern: "x", glob: "*.ts" }));
});

test("only Read, Glob, Grep and the listed MCP tools are available", () => {
  assert.ok(allowed("mcp__repo__git_diff", {}));
  assert.ok(allowed("mcp__context7__query-docs", {}));
  for (const name of ["Bash", "Write", "Edit", "WebFetch", "mcp__repo__other", "mcp__evil__git_diff"]) {
    assert.ok(!allowed(name, {}), name);
  }
});

test("repo paths cannot become options, pathspec magic or escape the tree", () => {
  assert.ok(safeRepoPath("src/a.ts"));
  for (const path of ["", "/etc/passwd", "../x", "a/../../x", "-p", "--output=x", ":(top)x", "a\nb", 3]) {
    assert.ok(!safeRepoPath(path), String(path));
  }
});
