# A01 — Let the user's answers reach maat plan

Owner decision 2026-11-08, after the first improve run on a copy of fvg: `maat plan` marks an action `ask` when it cannot find exactly one Markdown target file or cannot fill a template parameter, and `maat flow checkpoint` refuses every `ask` action (`clarification_only`). The user answered the location and the template values, but no command could take those answers, so the approved changes could never start. The owner chose a `--answers <file>` flag on `maat plan`: a JSON object keyed by plan action id, each value `{"path": "<repo-relative file>", "values": {"<template parameter>": "<text>"}}`. An answered path becomes the action's `target_path`; answered values fill the template. Unknown action ids, absolute paths or paths with `..`, and values the template does not have are errors. Other questions (CLI choice, skill form, policy skeleton) still keep an action `ask`.

Owner rule: over-design is forbidden. Change only the plan builder, the plan command, the improve skill line, the spec sentence, and their tests.

## Files

- Create: None.
- Modify: `tests/plan/build.test.ts`, `tests/skills/contracts.test.ts`, `src/plan/index.ts`, `src/cli/args.ts`, `src/cli/audit.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/plan/build.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
// T27
export declare function buildPlan(r:Report,targets:string[],c:Catalog):Plan;
// T38
export declare function runAuditCommand(a:Args,now:string):Promise<CommandResult>;
```

Produces:

```ts
export type PlanAnswers=Record<string,{path?:string;values?:Record<string,string>}>;
export declare function buildPlan(r:Report,targets:string[],c:Catalog,answers?:unknown):Plan;
```

## Steps

- [ ] 1. Write the failing tests.

  a. In `tests/plan/build.test.ts`, append at the end of the file:

```ts
test("user answers give an ask action its location and template values",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 p.target_clis=["claude-code"];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const report=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const ask=buildPlan(report,["prompt.task-spec"],c).actions[0]!;
 expect(ask.kind).toBe("ask");
 const answers={[ask.id]:{path:"docs/task.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}};
 const action=buildPlan(report,["prompt.task-spec"],c,answers).actions[0]!;
 expect([action.id,action.kind,action.target_path]).toEqual([ask.id,"modify","docs/task.md"]);
 expect(action.template?.body).toContain("Goal: G\nScope: S\n");
 expect(()=>buildPlan(report,["prompt.task-spec"],c,{absent:{path:"a.md"}})).toThrow("unknown_answer: absent");
 expect(()=>buildPlan(report,["prompt.task-spec"],c,{[ask.id]:{path:"../a.md"}})).toThrow("answer_path: "+ask.id);
 expect(()=>buildPlan(report,["prompt.task-spec"],c,{[ask.id]:{values:{other:"x"}}})).toThrow("answer_value: "+ask.id+" other");
});
```

  b. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(improve).toContain("Preserve unrelated dirty work");
```

  with

```ts
 expect(improve).toContain("Preserve unrelated dirty work");
 expect(improve).toContain("rerun maat plan with --answers <file>");
```

- [ ] 2. Run the focused tests; expect exit 1 with `3 pass`, `2 fail`: in the new plan test the `toEqual` on `[action.id,action.kind,action.target_path]` fails (received `"ask"` and `null`), and in the contracts test the new `toContain("rerun maat plan with --answers <file>")` fails.

```sh
bun test tests/plan/build.test.ts tests/skills/contracts.test.ts
```

- [ ] 3. Implement.

  a. In `src/plan/index.ts`, replace

```ts
export function buildPlan(r:Report,targets:string[],c:Catalog):Plan {
```

  with

```ts
export type PlanAnswers=Record<string,{path?:string;values?:Record<string,string>}>;
export function buildPlan(r:Report,targets:string[],c:Catalog,answers:unknown={}):Plan {
 if(!answers||typeof answers!=="object"||Array.isArray(answers))throw new MaatError(3,"answers_shape");
 const given=answers as PlanAnswers,used=new Set<string>();
```

  b. In `src/plan/index.ts`, replace

```ts
  const target_path=paths.length===1?paths[0]!:null;
```

  with

```ts
  const answer=given[id(item.id,item.scope)];
  if(answer!==undefined) {
   used.add(id(item.id,item.scope));
   if(!answer||typeof answer!=="object"||Object.keys(answer).some(k=>k!=="path"&&k!=="values"))throw new MaatError(3,"answers_shape: "+id(item.id,item.scope));
   if(answer.path!==undefined&&(typeof answer.path!=="string"||!answer.path.trim()||answer.path.startsWith("/")||answer.path.split("/").includes("..")))
    throw new MaatError(3,"answer_path: "+id(item.id,item.scope));
   for(const [k,v] of Object.entries(answer.values??{}))
    if(!resource?.parameters.includes(k)||typeof v!=="string"||!v.trim())throw new MaatError(3,"answer_value: "+id(item.id,item.scope)+" "+k);
  }
  const target_path=answer?.path??(paths.length===1?paths[0]!:null);
```

  c. In `src/plan/index.ts`, replace

```ts
  if(invocation)inputs.command=invocation.basis;if(purpose)inputs.purpose=purpose.basis;
```

  with

```ts
  if(invocation)inputs.command=invocation.basis;if(purpose)inputs.purpose=purpose.basis;
  Object.assign(inputs,answer?.values??{});
```

  d. In `src/plan/index.ts`, replace

```ts
 const graph=Object.fromEntries(actions.map(a=>[a.id,a.depends_on]));
```

  with

```ts
 for(const key of Object.keys(given))if(!used.has(key))throw new MaatError(3,"unknown_answer: "+key);
 const graph=Object.fromEntries(actions.map(a=>[a.id,a.depends_on]));
```

  e. In `src/cli/args.ts`, replace

```ts
  plan: { flags: ["report","target"], required: ["report"] },
```

  with

```ts
  plan: { flags: ["report","target","answers"], required: ["report"] },
```

  f. In `src/cli/audit.ts`, replace

```ts
  const report=parseReport(await input(one(a,"report")!)),plan=buildPlan(report,a.flags.target??[],c);
```

  with

```ts
  const report=parseReport(await input(one(a,"report")!));
  let answers:unknown={};
  if(one(a,"answers")){try{answers=JSON.parse(await input(one(a,"answers")!));}catch(e){if(e instanceof MaatError)throw e;throw new MaatError(3,"answers_parse");}}
  const plan=buildPlan(report,a.flags.target??[],c,answers);
```

  g. In `skills/maat-improve/SKILL.md`, replace

```text
Ask for unknown paths, commands, formats, or CLI choices; never infer them from a template.
```

  with

```text
Ask for unknown paths, commands, formats, or CLI choices; never infer them from a template. When the user answers an action's target location or template values, write them to a JSON file keyed by plan action id, each {"path": "<repo-relative file>", "values": {"<template parameter>": "<text>"}}, and rerun maat plan with --answers <file>; maat then fills that action's target path and template, so the action stops asking for them.
```

  h. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.3, replace

```text
遇到未知指令、路徑或格式，輸出「先詢問」步驟而不是猜測。
```

  with

```text
遇到未知指令、路徑或格式，輸出「先詢問」步驟而不是猜測。使用者回答目標位置或範本替換詞後，用 `--answers <file>` 交回：JSON 物件，以計畫動作 id 為鍵，值為 `{"path": "<repo 相對路徑>", "values": {"<替換詞>": "<文字>"}}`；maat 依回答填入該動作的目標路徑與範本，不再為這兩件事「先詢問」。對不上任何動作的 id、絕對路徑或含 `..` 的路徑、範本沒有的替換詞都直接報錯（使用者 2026-11-08 決定）。
```

- [ ] 4. Run the focused tests; expect exit 0 and `5 pass`. Then run the whole suite; expect `112 pass`, `0 fail`.

```sh
bun test tests/plan/build.test.ts tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/plan/build.test.ts tests/skills/contracts.test.ts src/plan/index.ts src/cli/args.ts src/cli/audit.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-plan-answers/01-plan-answers.md
git commit -m '✨ feat(plan): accept user answers for location and template values'
```
