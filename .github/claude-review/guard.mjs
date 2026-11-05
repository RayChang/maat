// Pure checks for the review agent's tool calls. No dependencies, so guard.test.mjs runs with plain `node --test`.
import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

export const REPO_TOOLS = ["pr_view", "git_diff", "git_log", "git_show_file"];
export const MCP_TOOLS = [
  ...REPO_TOOLS.map((name) => `mcp__repo__${name}`),
  "mcp__context7__query-docs",
  "mcp__context7__resolve-library-id",
];

/** True when `path` (relative to `workdir`, or absolute) resolves inside `workdir`. */
export function insideWorkdir(workdir, path) {
  const absolute = resolve(workdir, path);
  let real;
  try {
    real = realpathSync(absolute);
  } catch {
    try {
      lstatSync(absolute);
      return false; // Exists but does not resolve, e.g. a broken symlink: refuse rather than guess.
    } catch {
      real = absolute; // A missing path cannot leak anything; the tool reports it as absent.
    }
  }
  return real === workdir || real.startsWith(workdir + sep);
}

/** A repository-relative path that git can take as one argument: no absolute paths, `..`, options or pathspec magic. */
export function safeRepoPath(path) {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    !isAbsolute(path) &&
    !path.startsWith("-") &&
    !path.startsWith(":") &&
    !/[\0\r\n]/.test(path) &&
    !path.split(/[\\/]/).includes("..")
  );
}

/** Returns true to allow the tool call, or a reason string to deny it. */
export function checkTool(workdir, name, input) {
  switch (name) {
    case "Read":
      return insideWorkdir(workdir, String(input.file_path ?? "")) || "Read is limited to the repository checkout.";
    case "Glob":
    case "Grep": {
      if (input.path !== undefined && !insideWorkdir(workdir, String(input.path))) {
        return `${name} is limited to the repository checkout.`;
      }
      // Glob's pattern and Grep's glob filter are paths; Grep's pattern is a regex and is not checked.
      const pathPattern = name === "Glob" ? input.pattern : input.glob;
      if (typeof pathPattern === "string" && (isAbsolute(pathPattern) || pathPattern.split(/[\\/]/).includes(".."))) {
        return `${name} patterns must stay inside the repository checkout.`;
      }
      return true;
    }
    default:
      return MCP_TOOLS.includes(name) || `${name} is not available.`;
  }
}
