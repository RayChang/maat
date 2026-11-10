# I01 — Group repeated diagnostics on stderr

Lottery run 2 (2026-11-10): every `maat scan` and `maat plan` printed about 60 KB on stderr, even with `--quiet` (which only silences stdout). On the lottery copy, one scan printed 693 lines (59,575 bytes); 677 were `external_link: <url>` lines from links in the instruction documents. The full list is already in the output's `diagnostics` (stdout with `--json`, or `report.json` with `--out`), so stderr repeats it at a cost to the host agent's context. Owner decision (2026-11-10): shrink it. The fix groups diagnostics by their code (the text before the first `:`) when they come from the command's output value (scan, evaluate, plan): a code with more than five entries prints one line, `<code>: <n> entries (full list in the output's diagnostics)`; codes with five or fewer still print each line. Diagnostics a command returns on its own (for example `flow list`'s `ledger_skipped` lines, which appear nowhere else) are printed in full as before. On the lottery copy the scan's stderr becomes 5 lines (304 bytes).

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/cli/diagnostics-summary.test.ts`.
- Modify: `src/cli/main.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/cli/diagnostics-summary.test.ts`.

## Interfaces

Consumes:

```ts
export declare function main(argv:string[],now?:string,cwd?:string):Promise<{code:number;stdout:string;stderr:string}>;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Create `tests/cli/diagnostics-summary.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
test("stderr groups a diagnostic code with more than five entries; the output keeps the full list",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-diag-"));
 try {
  await mkdir(join(root,".git"));
  await writeFile(join(root,"AGENTS.md"),"# Agents\n\n"+[1,2,3,4,5,6].map(n=>"- [page "+n+"](https://example.com/page-"+n+")").join("\n")+"\n");
  const r=await main(["scan",root,"--json"],"2026-11-04T12:00:00Z");
  expect(r.code).toBe(0);
  expect(r.stderr).toContain("external_link: 6 entries (full list in the output's diagnostics)");
  expect(r.stderr).not.toContain("external_link: https://example.com/page-1");
  expect(JSON.parse(r.stdout).diagnostics.filter((d:string)=>d.startsWith("external_link: ")).length).toBe(6);
 } finally {await rm(root,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: stderr lists each `external_link` line instead of the grouped line.

```sh
bun test tests/cli/diagnostics-summary.test.ts
```

- [ ] 3. Implement. Make these 2 edits in order. Each "replace" text occurs exactly once in the file.

  a. In `src/cli/main.ts`, replace

```ts
export async function main(
```

  with

```ts
function summarize(lines:string[]):string[] {
 const groups=new Map<string,string[]>();
 for(const line of lines){const code=line.split(":")[0]!;groups.set(code,[...(groups.get(code)??[]),line]);}
 return [...groups].flatMap(([code,all])=>all.length>5?[code+": "+all.length+" entries (full list in the output's diagnostics)"]:all);
}
export async function main(
```

  b. In `src/cli/main.ts`, replace

```ts
  const diagnostics=("diagnostics" in result?result.diagnostics:undefined)??value?.diagnostics;
  const stderr=Array.isArray(diagnostics)?diagnostics.map(String).join("\n"):"";
```

  with

```ts
  const own=("diagnostics" in result?result.diagnostics:undefined) as unknown[]|undefined,diagnostics=own??value?.diagnostics;
  const stderr=Array.isArray(diagnostics)?(own?diagnostics.map(String):summarize(diagnostics.map(String))).join("\n"):"";
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `119 pass`, `0 fail`.

```sh
bun test tests/cli/diagnostics-summary.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the spec. Make this edit; the "replace" text occurs exactly once in the file.

  a. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
`--quiet`（stdout 什麼都不印）、
```

  with

```text
`--quiet`（stdout 什麼都不印；stderr 的診斷照印，scan／evaluate／plan 同一類診斷超過 5 筆時只印筆數，完整清單在輸出的 `diagnostics`，2026-11-10 補充）、
```

- [ ] 7. Run the whole suite again; expect `119 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/cli/diagnostics-summary.test.ts src/cli/main.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-output-size/02-diagnostic-summary.md
git commit -m '⚡️ perf(cli): group repeated diagnostics on stderr'
```
