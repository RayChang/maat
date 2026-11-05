import { test, expect } from "bun:test";
import { versions } from "../../src/versions";
test("version contains every schema and adapter without running a target", () => {
  expect(versions.tool_version).toBe("0.2.0");
  expect(versions.catalog_version).toBe("0.1.0");
  expect(versions.adapters.map(a => a.name)).toEqual(["claude-code", "codex", "copilot"]);
  for (const key of ["report_schema", "policy_schema", "ledger_schema"] as const)
    expect(versions[key]).toBe("1.0.0");
  const run = Bun.spawnSync([process.execPath, "src/cli/index.ts", "version", "--json"]);
  expect(run.exitCode).toBe(0);
  expect(JSON.parse(run.stdout.toString())).toEqual(versions);
});
