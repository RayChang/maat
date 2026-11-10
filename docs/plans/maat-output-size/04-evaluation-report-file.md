# K01 — Let an evaluation take its report from a file

Lottery run 2 (2026-11-10): each evaluation event file was about 1.7 MB, because the `report` field must hold the whole report of a fresh scan (about 865 KB on lottery) and the host copied it in by hand. Owner decision (2026-11-10): let maat read it. The fix adds `--report <file>` to `maat flow record`: with `--kind evaluation`, maat reads and validates the report file (`parseReport`) and puts it into the event's `report`; with any other kind it is a usage error. The reducer receives the same event as before, so every evaluation and accept guard is unchanged.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/e2e/flow-record-report.test.ts`.
- Modify: `src/cli/args.ts`, `src/cli/flow.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/flow-record-report.test.ts`.

## Interfaces

Consumes:

```ts
export declare function parseReport(text:string):Report; // src/report/index.ts
export declare function main(argv:string[],now?:string,cwd?:string):Promise<{code:number;stdout:string;stderr:string}>;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Create `tests/e2e/flow-record-report.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,readFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("an evaluation can take its report from --report instead of inlining it",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-record-report-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
 const json=async(args:string[])=>{const r=await main([...args,"--json"],time);if(r.code)throw Error(args.join(" ")+": "+r.stderr);return JSON.parse(r.stdout);};
 const file=async(name:string,value:unknown)=>{await writeFile(join(dir,name),JSON.stringify(value));return join(dir,name);};
 try {
  await mkdir(join(repo,".git"),{recursive:true});await writeFile(join(repo,"README.md"),"# demo\n");
  const policy=await file("policy.json",{policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{"prompt.task-spec":{baseline:true}},exemptions:[],attestations:[]});
  const report=await file("report.json",await json(["scan",repo,"--policy",policy,"--snapshot",join(dir,"snapshot.json")]));
  const ask=(await json(["plan","--report",report,"--target","prompt.task-spec"])).actions[0];
  const answers=await file("answers.json",{[ask.id]:{path:"docs/task.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}});
  const plan=await json(["plan","--report",report,"--target","prompt.task-spec","--answers",answers]),action=plan.actions[0];
  const id=(await json(["flow","open","--plan",await file("plan.json",plan),"--snapshot",join(dir,"snapshot.json"),"--ledger",ledger])).flow_id;
  const flow=(args:string[])=>json(["flow",...args,"--flow",id,"--ledger",ledger]);
  const approve=await flow(["template","--step","approve"]);
  Object.assign(approve.payload,{expires_at:"2026-12-01T00:00:00Z",by:"ray",source:"user statement"});
  await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"]);
  await flow(["checkpoint","--action",action.id,"--phase","before","--fingerprints",await file("e2.json",{...await flow(["template","--step","before","--action",action.id]),by:"host"})]);
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  await flow(["checkpoint","--action",action.id,"--phase","after","--fingerprints",await file("e3.json",{...await flow(["template","--step","after","--action",action.id]),by:"host"})]);
  const change=await flow(["template","--step","change"]);
  Object.assign(change.payload,{executed_by:"host",source:"host session",unknown_effects:[]});
  await flow(["record","--kind","change","--file",await file("e4.json",change)]);
  const after=await file("after.json",await json(["scan",repo,"--policy",policy]));
  const evaluation=await flow(["template","--step","evaluation","--action",action.id]);
  Object.assign(evaluation.payload,{method:{kind:"manual",id:"review",version:"1"},result:"unknown",by:"ray",source:"user review",unknown_effects:[]});
  const e5=await file("e5.json",evaluation);
  const wrong=await main(["flow","record","--kind","change","--file",e5,"--report",after,"--flow",id,"--ledger",ledger],time);
  expect([wrong.code,wrong.stderr]).toEqual([2,"usage_error: --report needs --kind evaluation\n"]);
  const recorded=await flow(["record","--kind","evaluation","--file",e5,"--report",after]);
  expect([recorded.status,recorded.evaluations.length]).toEqual(["evaluated",1]);
  const rows=(await readFile(join(ledger,id+".jsonl"),"utf8")).trim().split("\n").map(x=>JSON.parse(x));
  expect(rows.findLast((r:{event:{type:string}})=>r.event.type==="evaluation").event.payload.report).toEqual(JSON.parse(await readFile(after,"utf8")));
 } finally {await rm(dir,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: `--report` is an unknown flag for `flow record`, so the first check gets a different usage error.

```sh
bun test tests/e2e/flow-record-report.test.ts
```

- [ ] 3. Implement. Make these 3 edits in order. Each "replace" text occurs exactly once in its file.

  a. In `src/cli/args.ts`, replace

```ts
"flow record": { flags: ["flow","kind","file"], required: ["flow","kind","file"] },
```

  with

```ts
"flow record": { flags: ["flow","kind","file","report"], required: ["flow","kind","file"] },
```

  b. In `src/cli/flow.ts`, replace

```ts
import { parsePlan } from "../plan";
```

  with

```ts
import { parsePlan } from "../plan";
import { parseReport } from "../report";
```

  c. In `src/cli/flow.ts`, replace

```ts
     const by=one(a,"by")??envelope.by??payload.by??payload.executed_by;
```

  with

```ts
     if(one(a,"report")) {
      if(type!=="evaluation")throw new MaatError(2,"usage_error: --report needs --kind evaluation");
      payload.report=parseReport(await input(one(a,"report")!));
     }
     const by=one(a,"by")??envelope.by??payload.by??payload.executed_by;
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `121 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-record-report.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file.

  a. In `skills/maat-improve/SKILL.md`, replace

```text
report is the whole JSON report of a fresh maat scan or maat evaluate of the current files, and a pass requires it;
```

  with

```text
report is the whole JSON report of a fresh maat scan or maat evaluate of the current files, and a pass requires it (instead of copying it into the file, pass the report file with maat flow record --kind evaluation --file <event file> --report <report.json>);
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
| `record --flow <id> --kind change\|evaluation --file <json>` | 保存候選成果、修改範圍、執行來源、方法與結果／錯誤；error／timeout／cancel 不是 pass |
```

  with

```text
| `record --flow <id> --kind change\|evaluation --file <json> [--report <file>]` | 保存候選成果、修改範圍、執行來源、方法與結果／錯誤；error／timeout／cancel 不是 pass。評估可用 `--report` 指定報告檔，maat 讀檔後放進評估，不必把整份報告貼進事件檔；`--report` 只用於 `--kind evaluation`（2026-11-10 補充） |
```

- [ ] 7. Run the whole suite again; expect `121 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-record-report.test.ts src/cli/args.ts src/cli/flow.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-output-size/04-evaluation-report-file.md
git commit -m '⚡️ perf(flow): let an evaluation take its report from a file'
```

Cloud review of PR #95 (2026-11-10), must-fix applied: the test recorded an `unknown` evaluation, which needs no report, and `flow status` does not print the report, so it still passed with the `payload.report=` line removed. It now reads the ledger and checks that the recorded evaluation's report equals the report file; with that line removed the test fails.
