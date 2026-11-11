# O01 — Name the file, the flag and the payload field in flow event errors

Lottery run 3 (2026-11-11), host agent following the improve skill:
- `maat flow approve --flow F --scope plan --by "Ray Chang"` failed with a bare `event_parse`. `--scope` is the path of the event JSON file from `maat flow template`; the file could not be read, and a file saved from the template's default Markdown output fails the same way. The message named neither the file nor the flag.
- `maat flow record --kind evaluation --file ev.json` failed with `schema_error: $.by expected string`. The field was `payload.by`, but the event also has a top-level `by`, so the host filled the wrong one.

Owner decision (2026-11-11): make the messages say what is wrong; behavior stays the same. The fix:
- When the event file cannot be read, the error is `input_read: <file> (--<flag> takes the event JSON file saved from maat flow template --json and filled in)`; when it is not JSON, the same text with `event_parse:`.
- Payload shape errors use the path `$.payload` (for example `schema_error: $.payload.by expected string`).

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/e2e/flow-event-errors.test.ts`.
- Modify: `src/cli/flow.ts`, `src/flow/validate.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/flow-event-errors.test.ts`.

## Interfaces

Consumes:

```ts
export declare function main(argv:string[],now?:string,cwd?:string):Promise<{code:number;stdout:string;stderr:string}>;
export declare function checkShape(v:unknown,s:Shape,path?:string):void; // src/schema.ts
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Create `tests/e2e/flow-event-errors.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("flow event errors name the file, the flag and the payload field",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-event-errors-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
 const json=async(args:string[])=>{const r=await main([...args,"--json"],time);if(r.code)throw Error(args.join(" ")+": "+r.stderr);return JSON.parse(r.stdout);};
 const file=async(name:string,value:string)=>{await writeFile(join(dir,name),value);return join(dir,name);};
 try {
  await mkdir(join(repo,".git"),{recursive:true});await writeFile(join(repo,"README.md"),"# demo\n");
  const policy=await file("policy.json",JSON.stringify({policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{"prompt.task-spec":{baseline:true}},exemptions:[],attestations:[]}));
  const report=await file("report.json",JSON.stringify(await json(["scan",repo,"--policy",policy,"--snapshot",join(dir,"snapshot.json")])));
  const ask=(await json(["plan","--report",report,"--target","prompt.task-spec"])).actions[0];
  const answers=await file("answers.json",JSON.stringify({[ask.id]:{path:"docs/task.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}}));
  const plan=await file("plan.json",JSON.stringify(await json(["plan","--report",report,"--target","prompt.task-spec","--answers",answers])));
  const id=(await json(["flow","open","--plan",plan,"--snapshot",join(dir,"snapshot.json"),"--ledger",ledger])).flow_id;
  const approve=(scope:string)=>main(["flow","approve","--scope",scope,"--by","ray","--flow",id,"--ledger",ledger],time);
  const hint=" (--scope takes the event JSON file saved from maat flow template --json and filled in)\n";
  expect((await approve("plan")).stderr).toBe("input_read: plan"+hint);
  const markdown=await file("approve.md",(await main(["flow","template","--step","approve","--flow",id,"--ledger",ledger],time)).stdout);
  expect((await approve(markdown)).stderr).toBe("event_parse: "+markdown+hint);
  const change=await file("change.json",JSON.stringify({id:"c1",expected_seq:0,expires_at:"2026-12-01T00:00:00Z",by:"ray",
   payload:{action:"a",candidate_fingerprint:"0".repeat(64),paths:["docs/task.md"],executed_by:null,source:"host",unknown_effects:[]}}));
  const unfilled=await main(["flow","record","--kind","change","--file",change,"--flow",id,"--ledger",ledger],time);
  expect([unfilled.code,unfilled.stderr]).toEqual([3,"schema_error: $.payload.executed_by expected string\n"]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the first check receives a bare `event_parse`.

```sh
bun test tests/e2e/flow-event-errors.test.ts
```

- [ ] 3. Implement. Make these 6 edits in order. Each "replace" text occurs exactly once in its file.

  a. In `src/cli/flow.ts`, replace

```ts
     else try{envelope=JSON.parse(await input(file!));}catch{throw new MaatError(3,"event_parse");}
```

  with

```ts
     else {
      const hint=" (--"+["scope","command","fingerprints","file"].find(k=>one(a,k))+" takes the event JSON file saved from maat flow template --json and filled in)";
      let text:string;try{text=await readFile(file!,"utf8");}catch{throw new MaatError(3,"input_read: "+file+hint);}
      try{envelope=JSON.parse(text);}catch{throw new MaatError(3,"event_parse: "+file+hint);}
     }
```

  b. In `src/flow/validate.ts`, replace

```ts
  max_fixes:{type:"object",additionalProperties:{type:"number"}},role_approvals:{type:"array",items:object(["check","by"],{check:str,by:str})},expires_at:str,by:str,source:str}));
```

  with

```ts
  max_fixes:{type:"object",additionalProperties:{type:"number"}},role_approvals:{type:"array",items:object(["check","by"],{check:str,by:str})},expires_at:str,by:str,source:str}),"$.payload");
```

  c. In `src/flow/validate.ts`, replace

```ts
  checkShape(p,object(["execution","expires_at","by","source"],{expires_at:str,by:str,source:str}));execution(p.execution);
```

  with

```ts
  checkShape(p,object(["execution","expires_at","by","source"],{expires_at:str,by:str,source:str}),"$.payload");execution(p.execution);
```

  d. In `src/flow/validate.ts`, replace

```ts
  checkShape(p,object(["action","fingerprints"],{action:str,fingerprints:{type:"array"},reconcile:{type:"boolean"},unknown_effects:strings}));
```

  with

```ts
  checkShape(p,object(["action","fingerprints"],{action:str,fingerprints:{type:"array"},reconcile:{type:"boolean"},unknown_effects:strings}),"$.payload");
```

  e. In `src/flow/validate.ts`, replace

```ts
  {action:str,candidate_fingerprint:hash,paths:strings,executed_by:str,source:str,unknown_effects:strings}));
```

  with

```ts
  {action:str,candidate_fingerprint:hash,paths:strings,executed_by:str,source:str,unknown_effects:strings}),"$.payload");
```

  f. In `src/flow/validate.ts`, replace

```ts
  result:{enum:["pass","fail","unknown","error","timeout","cancel"]},evidence:{type:"array"},by:str,source:str,unknown_effects:strings}));
```

  with

```ts
  result:{enum:["pass","fail","unknown","error","timeout","cancel"]},evidence:{type:"array"},by:str,source:str,unknown_effects:strings}),"$.payload");
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `123 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-event-errors.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file.

  a. In `skills/maat-improve/SKILL.md`, replace

```text
maat fills the sequence, ids, fingerprints, and bindings.
```

  with

```text
maat fills the sequence, ids, fingerprints, and bindings. Save the template with --json (without it the JSON is wrapped in Markdown) and pass that file's path to --scope, --command, --fingerprints, or --file.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
| `approve --flow <id> --scope <file> --by <who>` | 記錄修改核准：綁定計畫指紋、允許動作、修改邊界、修正條件、有效條件 |
```

  with

```text
| `approve --flow <id> --scope <file> --by <who>` | 記錄修改核准：綁定計畫指紋、允許動作、修改邊界、修正條件、有效條件。`--scope` 和其他 flow 指令的 `--command`、`--fingerprints`、`--file` 一樣是事件檔路徑；讀不到檔案或內容不是 JSON 時，`input_read`／`event_parse` 會寫出檔名與旗標；事件內容欄位錯誤時，`schema_error` 的路徑以 `$.payload.` 開頭（2026-11-11 補充） |
```

- [ ] 7. Run the whole suite again; expect `123 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-event-errors.test.ts src/cli/flow.ts src/flow/validate.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-flow-errors/01-name-event-errors.md
git commit -m '🥅 fix(flow): name the file, flag and payload field in event errors'
```
