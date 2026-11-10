# J01 — Let a checkpoint read the files itself

Lottery run 2 (2026-11-10): every before/after checkpoint file the host submitted was about 170 KB, because a checkpoint must list the fingerprint of every material in the flow (1,032 files on lottery) so maat can detect drift. The host got that list from `maat flow template --step before|after`, which already reads the files from disk with the repository read boundary (B02), and then passed the same file back with `--fingerprints`. Owner decision (2026-11-10): let maat do it. The fix makes `--fingerprints` optional on `maat flow checkpoint`: without it, maat builds the event from the same template (same fingerprints, same id and sequence, same refusal when the step is not legal yet), and the actor comes from the new `--by` flag; without `--by` the event is refused with `event_actor` before any file is read. When the step is not legal yet, maat still submits the event (with no fingerprints) so the reducer refuses it and the ledger records the refusal, the same as with `--fingerprints`. Drift and scope checks do not change, because the reducer receives the same event either way.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/e2e/flow-checkpoint-disk.test.ts`.
- Modify: `src/cli/args.ts`, `src/cli/flow.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/flow-checkpoint-disk.test.ts`.

## Interfaces

Consumes:

```ts
export declare function flowTemplate(f:Flow,step:string,actionId:string|undefined,now:string):Promise<unknown>; // src/flow/template.ts
export declare function main(argv:string[],now?:string,cwd?:string):Promise<{code:number;stdout:string;stderr:string}>;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Create `tests/e2e/flow-checkpoint-disk.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("a checkpoint without --fingerprints reads the files itself and needs --by",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-checkpoint-disk-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
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
  const anonymous=await main(["flow","checkpoint","--action",action.id,"--phase","before","--flow",id,"--ledger",ledger],time);
  expect([anonymous.code,anonymous.stderr]).toEqual([3,"event_actor\n"]);
  expect((await flow(["checkpoint","--action",action.id,"--phase","before","--by","host"])).status).toBe("executing");
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  expect((await flow(["checkpoint","--action",action.id,"--phase","after","--by","host"])).status).toBe("executing");
  const early=await main(["flow","checkpoint","--action",action.id,"--phase","before","--by","host","--flow",id,"--ledger",ledger],time);
  expect([early.code,early.stderr]).toEqual([4,expect.stringContaining("flow_rejected: illegal_before")]);
  const state=await flow(["status"]);
  expect([state.seq,state.last_rejection]).toEqual([4,"illegal_before"]);
  expect((await flow(["template","--step","change"])).payload.paths).toEqual(["docs/task.md"]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the checkpoint without `--fingerprints` is refused as a usage error (exit 2) instead of `event_actor` (exit 3).

```sh
bun test tests/e2e/flow-checkpoint-disk.test.ts
```

- [ ] 3. Implement. Make these 2 edits. Each "replace" text occurs exactly once in its file.

  a. In `src/cli/args.ts`, replace

```ts
"flow checkpoint": { flags: ["flow","action","phase","fingerprints"], required: ["flow","action","phase","fingerprints"] },
```

  with

```ts
"flow checkpoint": { flags: ["flow","action","phase","fingerprints","by"], required: ["flow","action","phase"] },
```

  b. In `src/cli/flow.ts`, replace

```ts
     let envelope:Record<string,unknown>;try{envelope=JSON.parse(await input(file!));}catch{throw new MaatError(3,"event_parse");}
```

  with

```ts
     let envelope:Record<string,unknown>;
     if(a.command==="flow checkpoint"&&!file) {
      if(!one(a,"by")?.trim())throw new MaatError(3,"event_actor");
      try{envelope=await flowTemplate(flow,one(a,"phase")!,one(a,"action"),now) as Record<string,unknown>;}
      catch(e){if(!(e instanceof MaatError)||e.code!==4)throw e;
       envelope={id:sha256(canonical({flow:id,seq:flow.seq,step:one(a,"phase"),action:one(a,"action")})),expected_seq:flow.seq,
        expires_at:new Date(Date.parse(now)+86400000).toISOString(),by:null,payload:{fingerprints:[]}};}
     }
     else try{envelope=JSON.parse(await input(file!));}catch{throw new MaatError(3,"event_parse");}
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `120 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-checkpoint-disk.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file.

  a. In `skills/maat-improve/SKILL.md`, replace

```text
Before each action, collect actual relevant fingerprints and record maat flow checkpoint with --phase before.
```

  with

```text
Before each action, record maat flow checkpoint --flow <id> --action <id> --phase before --by <host>; without --fingerprints maat reads the current files itself, the same way its template does.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
| `checkpoint --flow <id> --action <aid> --phase before\|after --fingerprints <file>` | 記錄動作前後材料指紋；`before` 與上一個 `after` 或 base 不符 → 拒絕並標示漂移 |
```

  with

```text
| `checkpoint --flow <id> --action <aid> --phase before\|after [--fingerprints <file>] [--by <who>]` | 記錄動作前後材料指紋；`before` 與上一個 `after` 或 base 不符 → 拒絕並標示漂移。`--fingerprints` 可省略，省略時 maat 依 `template` 同樣的規則自己讀檔算指紋，執行者由 `--by` 提供（2026-11-10 補充） |
```

- [ ] 7. Run the whole suite again; expect `120 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-checkpoint-disk.test.ts src/cli/args.ts src/cli/flow.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-output-size/03-checkpoint-reads-disk.md
git commit -m '⚡️ perf(flow): let a checkpoint read the files itself'
```

Cloud review of PR #92 (2026-11-10), must-fix applied: a refused step without `--fingerprints` was rejected by the template before reaching the ledger, so it left no ledger row, `seq` and `last_rejection` unchanged, unlike the same command with `--fingerprints`. Now a template refusal (exit 4) still submits the event so the refusal is recorded, and `--by` is checked first. The test pins `seq` and `last_rejection` after such a refusal.
