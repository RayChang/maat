# G01 — Print a summary from flow commands and only paths when writing to --out

Across runs 2 to 5 of the improve skill on copies of fvg (2026-11-09/10), every `maat flow ...` command printed the whole flow state: the plan with about 1850 fingerprints per action, about 3850 current fingerprints, and every evaluation with its embedded report. On run 5's finished flow, `maat flow status --json` printed 13,482,001 bytes. `maat scan --out <dir>` also printed the full report to stdout after writing it (2.3 MB with `--json`). Each call costs the host agent context for data it never reads; the full state stays in the ledger and the reports in the `--out` files. Owner decision (2026-11-10): shrink the output. The fix makes every flow command print a summary (status, sequence, material count and overall fingerprint, each action's paths, the approval scope, each change and evaluation with its result, fix counts, unknown effects, last rejection, remaining fixes), and makes `--out` print only the two paths it wrote (`{"written":[...]}` with `--json`). On run 5's flow the status output becomes 2,588 bytes. Ledger contents, templates and guards do not change.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: None.
- Modify: `tests/e2e/distribution.test.ts`, `tests/e2e/flow-template.test.ts`, `src/cli/flow.ts`, `src/cli/output.ts`, `src/cli/args.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/distribution.test.ts`, `tests/e2e/flow-template.test.ts`.

## Interfaces

Consumes:

```ts
export declare function fingerprintSet(materials:Fingerprint[]):string; // src/flow/model.ts
export declare function emitOutput(value:unknown,markdown:string,o:{repository:string;kind:string;out?:string;quiet?:boolean;format?:"markdown"|"json"|"both"}):Promise<string>;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing tests. Make two edits.

  a. In `tests/e2e/distribution.test.ts`, replace

```ts
  expect(scan.code).toBe(0);const report=JSON.parse(scan.stdout) as Report;
```

  with

```ts
  expect(scan.code).toBe(0);expect(JSON.parse(scan.stdout).written).toHaveLength(2);
  const report=JSON.parse(await readFile(join(out,"report.json"),"utf8")) as Report;
```

  b. In `tests/e2e/flow-template.test.ts`, replace

```ts
  expect((await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"])).status).toBe("approved");
```

  with

```ts
  expect((await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"])).status).toBe("approved");
  const state=await flow(["status"]);
  expect([state.status,state.materials>0,"current" in state,"plan" in state,"evaluations" in state]).toEqual(["approved",true,false,false,true]);
```

- [ ] 2. Run the two focused test files; expect exit 1 with `2 pass`, `2 fail`. The failures: `scan --out --json` prints the report instead of `{"written":[...]}`; `flow status` still contains `current` and `plan`.

```sh
bun test tests/e2e/distribution.test.ts tests/e2e/flow-template.test.ts
```

- [ ] 3. Implement. Make these 4 edits in order. Each "replace" text occurs exactly once in its file.

  a. In `src/cli/flow.ts`, replace

```ts
import { openFlow } from "../flow/model";
```

  with

```ts
import { openFlow,fingerprintSet } from "../flow/model";
```

  b. In `src/cli/flow.ts`, replace

```ts
function status(f:Flow):unknown {
 return {...f,remaining_fixes:Object.fromEntries(f.plan.actions.map(a=>[a.id,
 Math.max(0,(f.approval?.max_fixes[a.id]??0)-(f.fixes[a.id]??0))]))};
}
```

  with

```ts
function status(f:Flow):unknown {
 return {flow_id:f.flow_id,status:f.status,seq:f.seq,repository:f.repository,plan_fingerprint:f.plan_fingerprint,
 current_fingerprint:fingerprintSet(f.current),materials:f.current.length,
 actions:f.plan.actions.map(a=>({id:a.id,check:a.check,kind:a.kind,target_path:a.target_path,extra_paths:a.extra_paths??[]})),
 approval:f.approval&&{actions:f.approval.actions,paths:f.approval.paths,max_fixes:f.approval.max_fixes,expires_at:f.approval.expires_at,by:f.approval.by},
 pending:f.pending&&{action:f.pending.action,after_recorded:!!f.pending.after},
 changes:f.changes.map(c=>({action:c.action,candidate_fingerprint:c.candidate_fingerprint,paths:c.paths})),
 evaluations:f.evaluations.map(e=>({action:e.action,candidate_fingerprint:e.candidate_fingerprint,method:e.method,result:e.result})),
 fixes:f.fixes,attempts:f.attempts,unknown_effects:f.unknown_effects,last_rejection:f.last_rejection,
 remaining_fixes:Object.fromEntries(f.plan.actions.map(a=>[a.id,
 Math.max(0,(f.approval?.max_fixes[a.id]??0)-(f.fixes[a.id]??0))]))};
}
```

  c. In `src/cli/output.ts`, replace

```ts
  await writeOutside(a,json,o.repository);await writeOutside(b,markdown,o.repository);
 }
 if(o.quiet)return "";
```

  with

```ts
  await writeOutside(a,json,o.repository);await writeOutside(b,markdown,o.repository);
  if(o.quiet)return "";
  return o.format==="json"?canonical({written:[a,b]})+"\n":"Wrote "+a+"\nWrote "+b+"\n";
 }
 if(o.quiet)return "";
```

  d. In `src/cli/args.ts`, replace

```ts
"--out <dir> writes <kind>.json and <kind>.md outside the repository; --quiet
```

  with

```ts
"--out <dir> writes <kind>.json and <kind>.md outside the repository and prints only their paths; --quiet
```

- [ ] 4. Run the focused tests; expect exit 0 and `4 pass`, `0 fail`. Then run the whole suite; expect `117 pass`, `0 fail`.

```sh
bun test tests/e2e/distribution.test.ts tests/e2e/flow-template.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the spec. Make these 2 edits; each "replace" text occurs exactly once in the file.

  a. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
`--out <dir>`（同時寫 JSON 與 Markdown 檔）、`--quiet`、
```

  with

```text
`--out <dir>`（同時寫 JSON 與 Markdown 檔，stdout 只印寫出的兩個路徑，2026-11-10 補充）、`--quiet`（stdout 什麼都不印）、
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
| `status --flow <id>` | 目前狀態、剩餘修正條件、未完成 checkpoint、未知效果 |
```

  with

```text
| `status --flow <id>` | 目前狀態、剩餘修正條件、未完成 checkpoint、未知效果。各流程指令都只印摘要：材料數與整體指紋、各動作的路徑、核准範圍、每筆修改與評估的結果，不印逐檔指紋與內嵌報告；完整內容留在 ledger（2026-11-10 補充） |
```

- [ ] 7. Run the whole suite again; expect `117 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/distribution.test.ts tests/e2e/flow-template.test.ts src/cli/flow.ts src/cli/output.ts src/cli/args.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-output-size/01-compact-output.md
git commit -m '⚡️ perf(cli): print a summary from flow commands and only paths with --out'
```
