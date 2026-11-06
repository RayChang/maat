# U02 — Add maat update

CLI contract §3.9 (added by U01): `maat update` runs `bun add -g github:RayChang/maat` with the Bun that runs `maat`, passes the install output through, and on failure exits 1 with a last stderr line `update_failed: github:RayChang/maat`. It takes no positionals and is dispatched before the catalog is loaded. Tests never touch the network: the runner is injected, and the `main` test stubs `Bun.spawnSync`.

## Files

- Create: `src/cli/update.ts`, `tests/cli/update.test.ts`.
- Modify: `src/cli/args.ts`, `src/cli/main.ts`, `README.md` (anchored edits).
- Test paths: `tests/cli/update.test.ts`.

## Interfaces

Consumes:

```ts
// T05
export interface Args { command: string; positionals: string[]; flags: Record<string, string[]>; }
export declare function parseArgs(argv: string[]): Args;
// T01
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; }
// T20
export declare function main(argv: string[], now?: string, cwd?: string): Promise<{ code: number; stdout: string; stderr: string }>;
```

Produces:

```ts
// src/cli/update.ts
export const updateSource: "github:RayChang/maat";
export interface RunResult { code: number; stdout: string; stderr: string; }
export function updateArgv(bun?: string): string[];
export function spawnUpdate(argv: string[]): RunResult;
export function runUpdate(run?: (argv: string[]) => RunResult): RunResult;
```

## Steps

- [ ] 1. Write the failing test. Create `tests/cli/update.test.ts` with exactly:

```ts
import { test, expect, spyOn } from "bun:test";
import { runUpdate, updateArgv } from "../../src/cli/update";
import { parseArgs } from "../../src/cli/args";
import { main } from "../../src/cli/main";
import { MaatError } from "../../src/errors";
test("update reinstalls maat from GitHub with the running Bun", () => {
 expect(updateArgv("/opt/bun")).toEqual(["/opt/bun", "add", "-g", "github:RayChang/maat"]);
 const calls: string[][] = [];
 const ok = runUpdate(argv => { calls.push(argv); return { code: 0, stdout: "installed maat\n", stderr: "" }; });
 expect(calls).toEqual([updateArgv()]);
 expect(ok).toEqual({ code: 0, stdout: "installed maat\n", stderr: "" });
 const bad = runUpdate(() => ({ code: 7, stdout: "", stderr: "error: auth\n" }));
 expect(bad).toEqual({ code: 1, stdout: "", stderr: "error: auth\nupdate_failed: github:RayChang/maat\n" });
 expect(parseArgs(["update"]).command).toBe("update");
 try { parseArgs(["update", "extra"]); throw Error("accepted bad input"); }
 catch (e) { expect(e).toBeInstanceOf(MaatError); expect((e as MaatError).code).toBe(2); }
});
test("main dispatches update to the installer", async () => {
 const sync = spyOn(Bun, "spawnSync").mockImplementation((() =>
  ({ exitCode: 0, stdout: Buffer.from("ok\n"), stderr: Buffer.from("") })) as never);
 try {
  expect(await main(["update"])).toEqual({ code: 0, stdout: "ok\n", stderr: "" });
  expect(sync.mock.calls.length).toBe(1);
  expect(sync.mock.calls[0]![0]).toEqual(updateArgv());
 } finally { sync.mockRestore(); }
});
```

- [ ] 2. Run the focused test; expect exit 1 because `src/cli/update` does not exist yet (`Cannot find module`).

```sh
bun test tests/cli/update.test.ts
```

- [ ] 3. Implement.

  a. Create `src/cli/update.ts` with exactly:

```ts
export const updateSource = "github:RayChang/maat";
export interface RunResult { code: number; stdout: string; stderr: string; }
export function updateArgv(bun = process.execPath): string[] { return [bun, "add", "-g", updateSource]; }
export function spawnUpdate(argv: string[]): RunResult {
  const p = Bun.spawnSync(argv, { stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode ?? 1, stdout: p.stdout.toString(), stderr: p.stderr.toString() };
}
export function runUpdate(run: (argv: string[]) => RunResult = spawnUpdate): RunResult {
  const r = run(updateArgv());
  if (r.code === 0) return { code: 0, stdout: r.stdout, stderr: r.stderr };
  return { code: 1, stdout: r.stdout, stderr: r.stderr + "update_failed: " + updateSource + "\n" };
}
```

  b. In `src/cli/args.ts`, replace

```ts
  "flow list": { flags: [] }, version: { flags: [] }
```

  with

```ts
  "flow list": { flags: [] }, version: { flags: [] }, update: { flags: [] }
```

  c. In `src/cli/main.ts`, two edits. Replace

```ts
import { runFlowCommand } from "./flow";
```

  with

```ts
import { runFlowCommand } from "./flow";
import { runUpdate } from "./update";
```

  and replace

```ts
  const a=parseArgs(argv);
```

  with

```ts
  const a=parseArgs(argv);
  if(a.command==="update")return runUpdate();
```

  d. In `README.md`, two edits. Replace

```text
# 命令列工具
bunx github:RayChang/maat
```

  with

```text
# 命令列工具：全域安裝，之後用 maat update 更新
bun add -g github:RayChang/maat

# 或不安裝，直接執行一次
bunx github:RayChang/maat
```

  and replace the table row

```text
| `maat version` | 印出工具、schema、catalog、adapter 版本 |
```

  with

```text
| `maat version` | 印出工具、schema、catalog、adapter 版本 |
| `maat update` | 從 GitHub 重新安裝最新版（唯一會連網的命令） |
```

- [ ] 4. Run the focused test; expect exit 0 and 2 passing tests. Then run the whole suite; expect 0 failures.

```sh
bun test tests/cli/update.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- src/cli/update.ts tests/cli/update.test.ts src/cli/args.ts src/cli/main.ts README.md
git commit -m '✨ feat(cli): add maat update to reinstall from GitHub'
```
