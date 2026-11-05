import { test, expect } from "bun:test";
import { parseArgs, one } from "../../src/cli/args";
import { MaatError } from "../../src/errors";
test("repeated targets, global flags, strict values, exit 2", () => {
  const a = parseArgs(["scan", ".", "--cli", "codex", "--cli", "copilot", "--json"]);
  expect(a.flags.cli).toEqual(["codex", "copilot"]);
  expect(one(a, "json")).toBe("true");
  for (const input of [["scan","--fail-on","missing"], ["scan","--format","bad"],
    ["flow","checkpoint","--flow","f"], ["scan","--json","--format","both"],
    ["version","extra"], ["scan","--policy","a","--policy","b"]]) {
    try { parseArgs(input); throw Error("accepted bad input"); }
    catch (e) { expect(e).toBeInstanceOf(MaatError); expect((e as MaatError).code).toBe(2); }
  }
  expect(parseArgs(["flow","list"]).command).toBe("flow list");
});
