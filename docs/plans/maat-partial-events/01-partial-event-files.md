# R01 — Let an event file hold only the answered fields

Lottery run 3 (2026-11-11): every approve, change and evaluation event started from `maat flow template`, which is about 151 KB for an evaluation (every material fingerprint) and wraps the JSON in Markdown unless `--json` is given. The host only fills a handful of fields (by, source, expires_at, executed_by, unknown_effects, method, result). Owner decision (2026-11-11): like J01 for checkpoints, let maat fill the rest. The fix: when an event file has no `id`, maat builds the template for the same step at submit time and merges the file over it (top-level fields from the file win; `payload` merges field by field, the file winning). The step is the command (`approve`, `authorize`), the checkpoint phase, or the record kind; the action is `--action`, else `payload.action`, else `payload.execution.action`. Files with an `id` behave exactly as before. When the template refuses the step (exit 4, the step is not legal yet), maat submits a placeholder envelope so the reducer records the rejection in the ledger, as J01 does for checkpoints.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/e2e/flow-partial-events.test.ts`.
- Modify: `src/cli/flow.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/flow-partial-events.test.ts`.

## Interfaces

Consumes:

```ts
export declare function flowTemplate(f:Flow,step:string,actionId:string|undefined,now:string):Promise<unknown>; // src/flow/template.ts, already imported in src/cli/flow.ts
export declare function main(argv:string[],now?:string,cwd?:string):Promise<{code:number;stdout:string;stderr:string}>;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Create `tests/e2e/flow-partial-events.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("an event file without an id holds only the answered fields; maat fills the rest from the template",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-partial-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
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
  await flow(["approve","--scope",await file("e1.json",{payload:{expires_at:"2026-12-01T00:00:00Z",by:"ray",source:"user statement"}}),"--by","ray"]);
  const change={payload:{executed_by:"host",source:"host session",unknown_effects:[]}};
  const early=await main(["flow","record","--kind","change","--file",await file("e0.json",change),"--flow",id,"--ledger",ledger],time);
  expect([early.code,early.stderr]).toEqual([4,expect.stringContaining("flow_rejected: ")]);
  expect((await flow(["status"])).last_rejection).toBeTruthy();
  await flow(["checkpoint","--action",action.id,"--phase","before","--by","host"]);
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  await flow(["checkpoint","--action",action.id,"--phase","after","--by","host"]);
  await flow(["record","--kind","change","--file",await file("e2.json",change)]);
  const after=await file("after.json",await json(["scan",repo,"--policy",policy]));
  const e3=await file("e3.json",{payload:{action:action.id,method:{kind:"manual",id:"review",version:"1"},result:"unknown",by:"ray",source:"user review",unknown_effects:[]}});
  const recorded=await flow(["record","--kind","evaluation","--file",e3,"--report",after]);
  expect([recorded.status,recorded.evaluations.length]).toEqual(["evaluated",1]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the approve file has no `id`, so maat rejects it with `event_shape`.

```sh
bun test tests/e2e/flow-partial-events.test.ts
```

- [ ] 3. Implement. Make this 1 edit. The "replace" text occurs exactly once in its file.

  a. In `src/cli/flow.ts`, replace

```ts
      try{envelope=JSON.parse(text);}catch{throw new MaatError(3,"event_parse: "+file+hint);}
     }
```

  with

```ts
      try{envelope=JSON.parse(text);}catch{throw new MaatError(3,"event_parse: "+file+hint);}
      if(envelope&&typeof envelope==="object"&&envelope.id===undefined) {
       const p=(envelope.payload??{}) as Record<string,unknown>,execution=p.execution as {action?:unknown}|undefined;
       const step=a.command==="flow checkpoint"?one(a,"phase")!:a.command==="flow record"?one(a,"kind")!:a.command.slice(5);
       const action=one(a,"action")??(typeof p.action==="string"?p.action:typeof execution?.action==="string"?execution.action:undefined);
       let t:Record<string,unknown>;
       try{t=await flowTemplate(flow,step,action,now) as Record<string,unknown>;}
       catch(e){if(!(e instanceof MaatError)||e.code!==4)throw e;
        t={id:sha256(canonical({flow:id,seq:flow.seq,step,action:action??null})),expected_seq:flow.seq,
         expires_at:new Date(Date.parse(now)+86400000).toISOString(),by:null,
         payload:step==="change"||step==="evaluation"?{action:action??"unknown",candidate_fingerprint:fingerprintSet([]),
          ...(step==="change"?{paths:[]}:{report:null,execution:null,evidence:[]})}:{fingerprints:[]}};}
       envelope={...t,...envelope,payload:{...t.payload as Record<string,unknown>,...p}};
      }
     }
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `125 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-partial-events.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file.

  a. In `skills/maat-improve/SKILL.md`, replace

```text
Save the template with --json (without it the JSON is wrapped in Markdown) and pass that file's path to --scope, --command, --fingerprints, or --file.
```

  with

```text
Save the template with --json (without it the JSON is wrapped in Markdown) and pass that file's path to --scope, --command, --fingerprints, or --file. Alternatively, write a file with no id that holds only the fields you answer (for an evaluation, include payload.action); maat fills the rest from the same template when you submit it.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
不讀檔也不寫入 ledger（2026-11-09 補充） |
```

  with

```text
不讀檔也不寫入 ledger（2026-11-09 補充）。事件檔也可以只寫要回答的欄位、不寫 `id`：maat 在送出時依同一步的骨架補上其餘欄位，檔案裡寫的欄位優先（`payload` 逐欄合併）；評估要在 `payload.action` 寫動作 id（2026-11-11 補充） |
```

- [ ] 7. Run the whole suite again; expect `125 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-partial-events.test.ts src/cli/flow.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-partial-events/01-partial-event-files.md
git commit -m '⚡️ perf(flow): let an event file hold only the answered fields'
```

## Follow-up after cloud review (2026-11-11)

The cloud review of PR #103 asked for these changes, made in follow-up commits on the same branch:
- A rejected partial event (the template refuses the step with exit 4) is submitted as a placeholder envelope so the reducer records the rejection, as J01 does for checkpoints.
- A partial approve file must list `payload.actions` (otherwise exit 3 `event_actions`); maat limits `paths`, `max_fixes`, and `role_approvals` to the listed actions, so an approval never covers actions the user did not name.
- A partial evaluation file without `payload.action` is exit 3 `event_action` instead of a usage error about flags `flow record` does not have.
- `approvalGuard` and `actionGuard` treat a role approval whose `by` is not a string as missing (`role_approval_missing`) instead of throwing.
- Tests: `tests/e2e/flow-partial-events.test.ts` covers the rejection, the missing action list, a two-action plan with only one action approved, and the missing evaluation action; `tests/flow/guards.test.ts` covers a null role approver.
