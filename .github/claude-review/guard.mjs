// Pure checks for the review agent's tool calls. No dependencies, so guard.test.mjs runs with plain `node --test`.
import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

export const REPO_TOOLS = ["pr_view", "git_diff", "git_log", "git_show_file"];
export const MCP_TOOLS = [
  ...REPO_TOOLS.map((name) => `mcp__repo__${name}`),
  "mcp__context7__query-docs",
  "mcp__context7__resolve-library-id",
];

const SAFE_GLOB = /^[A-Za-z0-9_.*?\/ -]+$/;

/** True when `path` (relative to `workdir`, or absolute) resolves inside `workdir`. */
export function insideWorkdir(workdir, path) {
  // Claude Code expands a leading ~ to $HOME, which resolve() would treat as a plain directory name.
  if (path.startsWith("~") || path.includes("$")) return false;
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
      // Allow-list: plain path characters plus * and ?. Braces, brackets, escapes, ~ and $ could rebuild a parent path.
      if (typeof pathPattern === "string" && (!SAFE_GLOB.test(pathPattern) || pathPattern.startsWith("/") || pathPattern.includes(".."))) {
        return `${name} patterns must stay inside the repository checkout.`;
      }
      return true;
    }
    default:
      return MCP_TOOLS.includes(name) || `${name} is not available.`;
  }
}
