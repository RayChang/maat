# B01 — Print each flow event file with the computed values filled

Improve run 1 on a copy of fvg (2026-11-08): the agent could not record `maat flow approve` because the event file format (`{id, expected_seq, expires_at, by, payload}` and each payload's required keys) is written only in internal implementation plans, and `event_shape` names no field. After the format was relayed, the agent still had to compute `base_fingerprint` with its own script (sha256 of the canonical, path-sorted `{path, sha256}` list of all 3852 fingerprints in the flow), and every checkpoint needs the full fingerprint list of the repository. Decision 2026-11-09: add `maat flow template --flow <id> --step <step> [--action <id>]`, like `maat attest template`. It prints the event file for one step without writing anything. maat fills what it can compute: sequence, event id, plan and base fingerprints, the plan's non-ask actions with their paths and fix limits, the candidate fingerprint and changed paths, and, for `before`/`after`, the fingerprints it reads from the repository files at that moment. Fields only the user or host can answer (who, source, validity, executor, unknown effects, evaluation method and result) stay `null`, so submitting an unfilled template is rejected. The improve skill and the CLI contract name the command.

Owner rule: over-design is forbidden. Change only the new template module, the one exported helper, the flow command wiring, the improve skill line, the spec row, and their tests.

## Files

- Create: `src/flow/template.ts`, `tests/e2e/flow-template.test.ts`.
- Modify: `tests/skills/contracts.test.ts`, `src/flow/core.ts`, `src/cli/args.ts`, `src/cli/flow.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/flow-template.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
// T35
export declare function fingerprintSet(fps:Fingerprint[]):string;
// T38
export declare function runFlowCommand(a:Args,now:string,cwd?:string):Promise<CommandResult&{diagnostics?:string[]}>;
// A01
export declare function buildPlan(r:Report,targets:string[],c:Catalog,answers?:unknown):Plan;
```

Produces:

```ts
export declare const changed:(a:Fingerprint[],b:Fingerprint[])=>string[];
export declare function flowTemplate(f:Flow,step:string,actionId:string|undefined,now:string):Promise<unknown>;
```

## Steps

- [ ] 1. Write the failing tests.

  a. Create `tests/e2e/flow-template.test.ts` with exactly:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,readFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("flow template prints each event with the computed values filled",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-flow-template-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
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
  expect([approve.expected_seq,approve.by,approve.payload.by,approve.payload.paths,approve.payload.actions]).toEqual([0,null,null,["docs/task.md"],[action.id]]);
  Object.assign(approve.payload,{expires_at:"2026-12-01T00:00:00Z",by:"ray",source:"user statement"});
  expect((await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"])).status).toBe("approved");
  const before={...await flow(["template","--step","before","--action",action.id]),by:"host"};
  expect((await flow(["checkpoint","--action",action.id,"--phase","before","--fingerprints",await file("e2.json",before)])).status).toBe("executing");
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  const after={...await flow(["template","--step","after","--action",action.id]),by:"host"};
  expect(after.payload.fingerprints.map((f:{path:string})=>f.path)).toContain("docs/task.md");
  expect((await flow(["checkpoint","--action",action.id,"--phase","after","--fingerprints",await file("e3.json",after)])).status).toBe("executing");
  const change=await flow(["template","--step","change"]);
  expect([change.payload.paths,change.payload.executed_by,change.payload.unknown_effects]).toEqual([["docs/task.md"],null,null]);
  Object.assign(change.payload,{executed_by:"host",source:"host session",unknown_effects:[]});
  expect((await flow(["record","--kind","change","--file",await file("e4.json",change)])).status).toBe("changed");
  const evaluation=await flow(["template","--step","evaluation","--action",action.id]);
  expect([evaluation.payload.method,evaluation.payload.result]).toEqual([{kind:"manual",id:null,version:null},null]);
  expect((await main(["flow","template","--step","before","--flow",id,"--ledger",ledger],time)).stderr).toContain("--step before requires --action");
  expect(JSON.parse(await readFile(join(dir,"e1.json"),"utf8")).payload.base_fingerprint).toMatch(/^[a-f0-9]{64}$/);
 } finally {await rm(dir,{recursive:true,force:true});}
});
```

  b. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(improve).toContain("rerun maat plan with --answers <file>");
```

  with

```ts
 expect(improve).toContain("rerun maat plan with --answers <file>");
 expect(improve).toContain("maat flow template --flow <id> --step <step>");
```

- [ ] 2. Run the focused tests; expect exit 1 with `0 pass`, `2 fail`: the new e2e test throws `flow template --step approve ... usage_error: unknown command (run maat help)`, and in the contracts test the new `toContain("maat flow template --flow <id> --step <step>")` fails.

```sh
bun test tests/e2e/flow-template.test.ts tests/skills/contracts.test.ts
```

- [ ] 3. Implement.

  a. Create `src/flow/template.ts` with exactly:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Flow } from "./types";
import type { Fingerprint } from "../models";
import { MaatError } from "../errors";
import { canonical,sha256 } from "../canonical";
import { fingerprintSet } from "./model";
import { changed } from "./core";
async function onDisk(f:Flow,extra:string|null):Promise<Fingerprint[]> {
 const paths=[...new Set([...f.current.map(m=>m.path),...(extra?[extra]:[])])].sort();
 const out:Fingerprint[]=[];
 for(const path of paths) {
  try{out.push({path,sha256:path.startsWith("policy:")?sha256(await readFile(path.slice(7),"utf8")):sha256(await readFile(join(f.repository.path,path)))});}
  catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw new MaatError(3,"repository_read: "+path);}
 }
 return out;
}
export async function flowTemplate(f:Flow,step:string,actionId:string|undefined,now:string):Promise<unknown> {
 const action=actionId===undefined?undefined:f.plan.actions.find(a=>a.id===actionId);
 if(actionId!==undefined&&!action)throw new MaatError(3,"unknown_action: "+actionId);
 if(["authorize","before","after","evaluation"].includes(step)&&!action)throw new MaatError(2,"usage_error: --step "+step+" requires --action");
 let payload:Record<string,unknown>;
 if(step==="approve") {
  const actions=f.plan.actions.filter(a=>a.kind!=="ask");
  payload={plan_fingerprint:f.plan_fingerprint,base_fingerprint:fingerprintSet(f.current),
  actions:actions.map(a=>a.id),paths:[...new Set(actions.map(a=>a.target_path).filter((p):p is string=>!!p))].sort(),
  mode:"plan",candidate_fingerprint:null,max_fixes:Object.fromEntries(actions.map(a=>[a.id,a.fix_conditions.max_fixes])),
  role_approvals:actions.filter(a=>a.role_approval_required).map(a=>({check:a.check,by:null})),expires_at:null,by:null,source:null};
 } else if(step==="authorize") {
  payload={execution:{action:action!.id,command:action!.command,script:null,inputs:[],cwd:f.repository.path,permissions:[],effects:[]},
  expires_at:null,by:null,source:null};
 } else if(step==="before"||step==="after") {
  payload={action:action!.id,fingerprints:await onDisk(f,action!.target_path)};
 } else if(step==="change") {
  if(!f.pending?.after)throw new MaatError(4,"flow_rejected: change_without_checkpoints");
  payload={action:f.pending.action,candidate_fingerprint:fingerprintSet(f.pending.after),paths:changed(f.pending.before,f.pending.after),
  executed_by:null,source:null,unknown_effects:null};
 } else {
  payload={action:action!.id,candidate_fingerprint:fingerprintSet(f.current),method:{kind:"manual",id:null,version:null},
  result:null,report:null,execution:null,evidence:f.current,by:null,source:null,unknown_effects:null};
 }
 return {id:sha256(canonical({flow:f.flow_id,seq:f.seq,step,action:actionId??null})),expected_seq:f.seq,
 expires_at:new Date(Date.parse(now)+86400000).toISOString(),by:null,payload};
}
```

  b. In `src/flow/core.ts`, replace

```ts
const changed=(a:Fingerprint[],b:Fingerprint[])=>[...new Set([...a.map(x=>x.path),...b.map(x=>x.path)])]
```

  with

```ts
export const changed=(a:Fingerprint[],b:Fingerprint[])=>[...new Set([...a.map(x=>x.path),...b.map(x=>x.path)])]
```

  c. In `src/cli/args.ts`, replace

```ts
  "flow status": { flags: ["flow"], required: ["flow"] },
```

  with

```ts
  "flow status": { flags: ["flow"], required: ["flow"] },
  "flow template": { flags: ["flow","step","action"], required: ["flow","step"] },
```

  d. In `src/cli/args.ts`, replace

```ts
  event: ["accept","continue-fix","stop","handoff","resume"]
```

  with

```ts
  event: ["accept","continue-fix","stop","handoff","resume"],
  step: ["approve","authorize","before","after","change","evaluation"]
```

  e. In `src/cli/flow.ts`, replace

```ts
import { canonical,sha256,repoId } from "../canonical";
```

  with

```ts
import { canonical,sha256,repoId } from "../canonical";
import { flowTemplate } from "../flow/template";
```

  f. In `src/cli/flow.ts`, replace

```ts
   if(a.command==="flow status")value=status(flow);
```

  with

```ts
   if(a.command==="flow status")value=status(flow);
   else if(a.command==="flow template")value=await flowTemplate(flow,one(a,"step")!,one(a,"action"),now);
```

  g. In `skills/maat-improve/SKILL.md`, replace

```text
Use maat flow open and maat flow approve to record the approved plan, base, boundaries, validity, and finite correction conditions.
```

  with

```text
Use maat flow open and maat flow approve to record the approved plan, base, boundaries, validity, and finite correction conditions. Get every approve, authorize, checkpoint, and record file from maat flow template --flow <id> --step <step> [--action <id>] right before submitting it; maat fills the sequence, ids, fingerprints, and bindings. Replace each null with the user's or host's own answer, delete any action the user did not approve together with its path and max_fixes entry, and do not edit the computed values.
```

  h. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.7, replace

```text
| `status --flow <id>` | 目前狀態、剩餘修正條件、未完成 checkpoint、未知效果 |
```

  with

```text
| `status --flow <id>` | 目前狀態、剩餘修正條件、未完成 checkpoint、未知效果 |
| `template --flow <id> --step approve\|authorize\|before\|after\|change\|evaluation [--action <aid>]` | 印出該步要交的事件檔骨架，不寫檔。序號、事件 id、計畫與材料指紋、修改路徑由 maat 算好填入；`before`／`after` 在當下讀取專案檔案算指紋。要由使用者或 host 回答的欄位（核准人、來源、有效期限、執行者、未知效果、評估方法與結果）留 `null`，沒填就送出會被拒絕。核准骨架列出計畫裡全部非「先詢問」動作，使用者沒核准的要刪掉（2026-11-09 補充） |
```

- [ ] 4. Run the focused tests; expect exit 0 and `2 pass`. Then run the whole suite; expect `113 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-template.test.ts tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-template.test.ts tests/skills/contracts.test.ts src/flow/template.ts src/flow/core.ts src/cli/args.ts src/cli/flow.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-flow-template/01-flow-template.md
git commit -m '✨ feat(flow): print each event file with the computed values filled'
```
