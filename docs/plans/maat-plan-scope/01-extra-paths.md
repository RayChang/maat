# C01 — Let an answered action change several files and carry its fix rounds

Run 2 of the improve skill on a copy of fvg (2026-11-09) stopped at the first action. The approved fix for `loop.feedback-routing` needed three files: the routing table in `.claude/settings.md` (the target path), the Stop hook script, and its test. The approve event accepted all three paths, but `flow checkpoint --phase after` returned `checkpoint_scope_violation`, because `src/flow/core.ts` lets a non-command action change only its single `target_path`. The user had also approved one fix round per action; `flow approve` rejected it with `fix_condition_expansion`, because `buildPlan` always writes `fix_conditions.max_fixes: 0` and an approval may not exceed the plan. Owner decision (2026-11-09): fix maat first. The fix lets the `--answers` file carry, per action, `extra_paths` (more repository files that action may change, same normal-form rule as `path`, no duplicates) and `max_fixes` (a non-negative integer, default 0). The plan lists both; the approve template puts the extra paths in `paths`; the approval guard requires them in `paths`; the before/after templates fingerprint them; and the after checkpoint lets the action change its target path or its extra paths. `extra_paths` is optional on a plan action so plans and flows written before this change still load.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/e2e/flow-extra-paths.test.ts`.
- Modify: `src/plan/types.ts`, `src/plan/index.ts`, `src/flow/core.ts`, `src/flow/guards.ts`, `src/flow/template.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/flow-extra-paths.test.ts`.

## Interfaces

Consumes:

```ts
export declare function buildPlan(r:Report,targets:string[],c:Catalog,answers?:unknown):Plan;
export declare function flowTemplate(f:Flow,step:string,actionId:string|undefined,now:string):Promise<unknown>;
```

Produces:

```ts
// src/plan/types.ts, PlanAction gains:
extra_paths?:string[];
// src/plan/index.ts
export type PlanAnswers=Record<string,{path?:string;values?:Record<string,string>;extra_paths?:string[];max_fixes?:number}>;
```

## Steps

- [ ] 1. Write the failing test. Create `tests/e2e/flow-extra-paths.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("an action may change its answered extra paths and use answered fix rounds",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-extra-paths-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
 const json=async(args:string[])=>{const r=await main([...args,"--json"],time);if(r.code)throw Error(args.join(" ")+": "+r.stderr);return JSON.parse(r.stdout);};
 const file=async(name:string,value:unknown)=>{await writeFile(join(dir,name),JSON.stringify(value));return join(dir,name);};
 try {
  await mkdir(join(repo,".git"),{recursive:true});await writeFile(join(repo,"README.md"),"# demo\n");
  const policy=await file("policy.json",{policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{"prompt.task-spec":{baseline:true}},exemptions:[],attestations:[]});
  const report=await file("report.json",await json(["scan",repo,"--policy",policy,"--snapshot",join(dir,"snapshot.json")]));
  const ask=(await json(["plan","--report",report,"--target","prompt.task-spec"])).actions[0];
  const bad=await main(["plan","--report",report,"--target","prompt.task-spec","--answers",await file("bad.json",{[ask.id]:{path:"docs/task.md",extra_paths:["../x"]}})],time);
  expect([bad.code,bad.stderr]).toEqual([3,expect.stringContaining("answer_extra_paths")]);
  const answers=await file("answers.json",{[ask.id]:{path:"docs/task.md",extra_paths:["scripts/check.sh"],max_fixes:1,values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}});
  const plan=await json(["plan","--report",report,"--target","prompt.task-spec","--answers",answers]),action=plan.actions[0];
  expect([action.extra_paths,action.fix_conditions.max_fixes]).toEqual([["scripts/check.sh"],1]);
  const md=await main(["plan","--report",report,"--target","prompt.task-spec","--answers",answers],time);
  expect(md.stdout).toContain("Also changes: scripts/check.sh");
  const id=(await json(["flow","open","--plan",await file("plan.json",plan),"--snapshot",join(dir,"snapshot.json"),"--ledger",ledger])).flow_id;
  const flow=(args:string[])=>json(["flow",...args,"--flow",id,"--ledger",ledger]);
  const approve=await flow(["template","--step","approve"]);
  expect([approve.payload.paths,approve.payload.max_fixes]).toEqual([["docs/task.md","scripts/check.sh"],{[action.id]:1}]);
  Object.assign(approve.payload,{expires_at:"2026-12-01T00:00:00Z",by:"ray",source:"user statement"});
  expect((await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"])).status).toBe("approved");
  const before={...await flow(["template","--step","before","--action",action.id]),by:"host"};
  expect((await flow(["checkpoint","--action",action.id,"--phase","before","--fingerprints",await file("e2.json",before)])).status).toBe("executing");
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  await mkdir(join(repo,"scripts"));await writeFile(join(repo,"scripts/check.sh"),"exit 0\n");
  const after={...await flow(["template","--step","after","--action",action.id]),by:"host"};
  expect((await flow(["checkpoint","--action",action.id,"--phase","after","--fingerprints",await file("e3.json",after)])).status).toBe("executing");
  const change=await flow(["template","--step","change"]);
  expect(change.payload.paths).toEqual(["docs/task.md","scripts/check.sh"]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`. It fails at the first new assertion: the plan command rejects the unknown answer key `extra_paths` with `answers_shape` instead of `answer_extra_paths`.

```sh
bun test tests/e2e/flow-extra-paths.test.ts
```

- [ ] 3. Implement. Make these 13 edits in order. Each "replace" text occurs exactly once in its file.

  a. In `src/plan/types.ts`, replace

```ts
target_path:string|null;command:string|null;
```

  with

```ts
target_path:string|null;extra_paths?:string[];command:string|null;
```

  b. In `src/plan/index.ts`, replace

```ts
export type PlanAnswers=Record<string,{path?:string;values?:Record<string,string>}>;
```

  with

```ts
export type PlanAnswers=Record<string,{path?:string;values?:Record<string,string>;extra_paths?:string[];max_fixes?:number}>;
const normal=(p:unknown):p is string=>typeof p==="string"&&!!p.trim()&&p.trim()===p&&!p.startsWith("/")&&!p.split("/").includes("..")&&p!=="."&&!p.endsWith("/")&&posix.normalize(p)===p;
```

  c. In `src/plan/index.ts`, replace

```ts
   if(!answer||typeof answer!=="object"||Object.keys(answer).some(k=>k!=="path"&&k!=="values"))throw new MaatError(3,"answers_shape: "+id(item.id,item.scope));
   if(answer.path!==undefined&&(typeof answer.path!=="string"||!answer.path.trim()||answer.path.trim()!==answer.path||answer.path.startsWith("/")||
    answer.path.split("/").includes("..")||answer.path==="."||answer.path.endsWith("/")||posix.normalize(answer.path)!==answer.path))
    throw new MaatError(3,"answer_path: "+id(item.id,item.scope));
```

  with

```ts
   if(!answer||typeof answer!=="object"||Object.keys(answer).some(k=>!["path","values","extra_paths","max_fixes"].includes(k)))throw new MaatError(3,"answers_shape: "+id(item.id,item.scope));
   if(answer.path!==undefined&&!normal(answer.path))throw new MaatError(3,"answer_path: "+id(item.id,item.scope));
   if(answer.extra_paths!==undefined&&(!Array.isArray(answer.extra_paths)||!answer.extra_paths.every(normal)||new Set(answer.extra_paths).size!==answer.extra_paths.length))
    throw new MaatError(3,"answer_extra_paths: "+id(item.id,item.scope));
   if(answer.max_fixes!==undefined&&(!Number.isInteger(answer.max_fixes)||answer.max_fixes<0))throw new MaatError(3,"answer_max_fixes: "+id(item.id,item.scope));
```

  d. In `src/plan/index.ts`, replace

```ts
  const target_path=answer?.path??(paths.length===1?paths[0]!:null);
```

  with

```ts
  const target_path=answer?.path??(paths.length===1?paths[0]!:null);
  const extra_paths=(answer?.extra_paths??[]).filter(p=>p!==target_path).sort();
```

  e. In `src/plan/index.ts`, replace

```ts
actions:[...questions,...contract.remediation.actions],target_path,command,depends_on,
```

  with

```ts
actions:[...questions,...contract.remediation.actions],target_path,extra_paths,command,depends_on,
```

  f. In `src/plan/index.ts`, replace

```ts
fingerprints,fix_conditions:{max_fixes:0},
```

  with

```ts
fingerprints,fix_conditions:{max_fixes:answer?.max_fixes??0},
```

  g. In `src/plan/index.ts`, replace

```ts
 a.actions.map(x=>"- "+x).join("\n")+"\n\nTarget: "+(a.target_path??"location requires confirmation")+
```

  with

```ts
 a.actions.map(x=>"- "+x).join("\n")+"\n\nTarget: "+(a.target_path??"location requires confirmation")+
 (a.extra_paths?.length?"\n\nAlso changes: "+a.extra_paths.join(", "):"")+"\n\nFix rounds: "+a.fix_conditions.max_fixes+
```

  h. In `src/plan/index.ts`, replace

```ts
for(const a of p.actions)if((a.target_path!==null&&typeof a.target_path!=="string")||(a.command!==null
```

  with

```ts
for(const a of p.actions)if((a.target_path!==null&&typeof a.target_path!=="string")||(a.extra_paths!==undefined&&(!Array.isArray(a.extra_paths)||a.extra_paths.some(x=>typeof x!=="string")))||(a.command!==null
```

  i. In `src/flow/core.ts`, replace

```ts
(action.kind!=="command"&&path!==action.target_path)))
```

  with

```ts
(action.kind!=="command"&&path!==action.target_path&&!(action.extra_paths??[]).includes(path))))
```

  j. In `src/flow/guards.ts`, replace

```ts
  if(action.kind!=="ask"&&action.target_path&&!a.paths.includes(action.target_path))return "approval_scope";
  const limit
```

  with

```ts
  if(action.kind!=="ask"&&[action.target_path,...(action.extra_paths??[])].some(p=>p&&!a.paths.includes(p)))return "approval_scope";
  const limit
```

  k. In `src/flow/template.ts`, replace

```ts
async function onDisk(f:Flow,extra:string|null):Promise<Fingerprint[]> {
 const paths=[...new Set([...f.current.map(m=>m.path),...(extra?[extra]:[])])].sort();
```

  with

```ts
async function onDisk(f:Flow,extra:(string|null)[]):Promise<Fingerprint[]> {
 const paths=[...new Set([...f.current.map(m=>m.path),...extra.filter((p):p is string=>!!p)])].sort();
```

  l. In `src/flow/template.ts`, replace

```ts
paths:[...new Set(actions.map(a=>a.target_path).filter((p):p is string=>!!p))].sort()
```

  with

```ts
paths:[...new Set(actions.flatMap(a=>[a.target_path,...(a.extra_paths??[])]).filter((p):p is string=>!!p))].sort()
```

  m. In `src/flow/template.ts`, replace

```ts
await onDisk(f,action!.target_path)
```

  with

```ts
await onDisk(f,[action!.target_path,...(action!.extra_paths??[])])
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `114 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-extra-paths.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the docs. Make two edits; each anchor text occurs exactly once in its file and stays as it is.

  a. In `skills/maat-improve/SKILL.md`, directly after the sentence

```text
maat then fills that action's target path and template, so the action stops asking for them.
```

  insert this text on the same line (it begins with the space or character shown):

```text
 If the approved change for an action also needs other files, add "extra_paths": ["<repo-relative file>", ...] to that answer; an action's checkpoints may change only its target path and its extra paths. If the user allows retries after a failed verification, add "max_fixes": <rounds the user approved>; without it the action gets no fix rounds.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, directly after the sentence

```text
不代為改寫，因為流程逐字比對路徑。
```

  insert this text on the same line (it begins with the space or character shown):

```text
同一項改善還要改其他檔案時，回答可加 `"extra_paths": ["<repo 相對路徑>"]`，規則與 `path` 相同且不可重複；使用者允許驗證沒過時自行修正，可加 `"max_fixes": <輪數>`，須為非負整數，沒給就是 0。計畫列出這些檔案與輪數，核准範本照填，該動作的檢查點只准改目標路徑與這些檔案（2026-11-09 補充）。
```

- [ ] 7. Run the whole suite again; expect `114 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-extra-paths.test.ts src/plan/types.ts src/plan/index.ts src/flow/core.ts src/flow/guards.ts src/flow/template.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-plan-scope/01-extra-paths.md
git commit -m '✨ feat(plan): let answers add extra paths and fix rounds to an action'
```
