# D02 — List in the plan which attestations a change would invalidate

Runs 2 and 3 of the improve skill on copies of fvg (2026-11-09) both hit the same surprise after approval: an attestation cites a file by its whole-file sha256, so changing that file makes the attestation `fingerprint_mismatch`. In run 2, changing the Stop hook script invalidated 3 attestations; in run 3, adding two lines to `AGENTS.md` invalidated 8, and required items fell from 29 verified to 22 until the user confirmed redrafts. Nothing in the plan warned the user before approval. Owner decision (2026-11-09): show it in the plan. The fix records, for each attestation in a report item, the repository paths it cites (`paths`), and gives each plan action `invalidates`: the currently valid attestations that cite the action's target path or extra paths, written `attestations[<ref>] <check>` (the same form `maat policy validate` uses). The plan Markdown shows them; the improve skill tells the host to warn the user before approval and to redraft them after the change. Both new fields are optional, so earlier reports and plans still load.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/e2e/plan-invalidates.test.ts`.
- Modify: `src/models.ts`, `src/evaluate/items.ts`, `src/plan/types.ts`, `src/plan/index.ts`, `skills/maat-improve/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/plan-invalidates.test.ts`.

## Interfaces

Consumes:

```ts
export declare function buildPlan(r:Report,targets:string[],c:Catalog,answers?:unknown):Plan;
```

Produces:

```ts
// src/models.ts, ItemResult.attestations entries gain:
paths?:string[];
// src/plan/types.ts, PlanAction gains:
invalidates?:string[];
```

## Steps

- [ ] 1. Write the failing test. Create `tests/e2e/plan-invalidates.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
import { sha256 } from "../../src/canonical";
const time="2026-11-04T12:00:00Z";
test("the plan lists the valid attestations an action's change would invalidate",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-invalidates-")),repo=join(dir,"repo");
 const json=async(args:string[])=>{const r=await main([...args,"--json"],time);if(r.code)throw Error(args.join(" ")+": "+r.stderr);return JSON.parse(r.stdout);};
 const file=async(name:string,value:unknown)=>{await writeFile(join(dir,name),JSON.stringify(value));return join(dir,name);};
 try {
  const text="Goal: fix login feedback.\n";
  await mkdir(join(repo,".git"),{recursive:true});await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),text);
  const policy=await file("policy.json",{policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{"prompt.task-spec":{baseline:true}},exemptions:[],attestations:[{check:"prompt.task-spec",claims:["goal"],
   answer:"The task names the goal.",materials:[{path:"docs/task.md",sha256:sha256(text),lines:"1-1",quote:text.trimEnd()}],
   scope:{},attested_by:"ray",attested_at:"2026-11-04T00:00:00Z",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}}]});
  const report=await file("report.json",await json(["scan",repo,"--policy",policy]));
  const ask=(await json(["plan","--report",report,"--target","prompt.task-spec"])).actions[0];
  const answers=await file("answers.json",{[ask.id]:{path:"docs/task.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}});
  expect((await json(["plan","--report",report,"--target","prompt.task-spec","--answers",answers])).actions[0].invalidates).toEqual(["attestations[0] prompt.task-spec"]);
  const md=await main(["plan","--report",report,"--target","prompt.task-spec","--answers",answers],time);
  expect(md.stdout).toContain("Invalidates attestations (they must be confirmed again after the change): attestations[0] prompt.task-spec");
  const other=await file("other.json",{[ask.id]:{path:"docs/other.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}});
  expect((await json(["plan","--report",report,"--target","prompt.task-spec","--answers",other])).actions[0].invalidates).toEqual([]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the first `toEqual(["attestations[0] prompt.task-spec"])` fails because the plan action has no `invalidates`.

```sh
bun test tests/e2e/plan-invalidates.test.ts
```

- [ ] 3. Implement. Make these 6 edits in order. Each "replace" text occurs exactly once in its file.

  a. In `src/models.ts`, replace

```ts
attestations:{ref:string;valid:boolean;invalid_reason:string|null}[];
```

  with

```ts
attestations:{ref:string;valid:boolean;invalid_reason:string|null;paths?:string[]}[];
```

  b. In `src/evaluate/items.ts`, replace

```ts
return [{ref:String(n),valid:!issues.length,invalid_reason:issues.length?issues.join(","):null}];
```

  with

```ts
return [{ref:String(n),valid:!issues.length,invalid_reason:issues.length?issues.join(","):null,paths:Array.isArray(a.materials)?[...new Set(a.materials.map(m=>m.path))].sort():[]}];
```

  c. In `src/plan/types.ts`, replace

```ts
target_path:string|null;extra_paths?:string[];command:string|null;
```

  with

```ts
target_path:string|null;extra_paths?:string[];invalidates?:string[];command:string|null;
```

  d. In `src/plan/index.ts`, replace

```ts
  const extra_paths=(answer?.extra_paths??[]).filter(p=>p!==target_path).sort();
```

  with

```ts
  const extra_paths=(answer?.extra_paths??[]).filter(p=>p!==target_path).sort();
  const touched=[target_path,...extra_paths].filter((p):p is string=>!!p);
  const invalidates=[...new Set(r.items.flatMap(i=>i.attestations.filter(a=>a.valid&&(a.paths??[]).some(p=>touched.includes(p))).map(a=>"attestations["+a.ref+"] "+i.id)))].sort();
```

  e. In `src/plan/index.ts`, replace

```ts
target_path,extra_paths,command,depends_on,
```

  with

```ts
target_path,extra_paths,invalidates,command,depends_on,
```

  f. In `src/plan/index.ts`, replace

```ts
"\n\nFix rounds: "+a.fix_conditions.max_fixes+
```

  with

```ts
"\n\nFix rounds: "+a.fix_conditions.max_fixes+
 (a.invalidates?.length?"\n\nInvalidates attestations (they must be confirmed again after the change): "+a.invalidates.join(", "):"")+
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `117 pass`, `0 fail`.

```sh
bun test tests/e2e/plan-invalidates.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the docs. Make two edits; each anchor text occurs exactly once in its file and stays as it is.

  a. In `skills/maat-improve/SKILL.md`, directly after the sentence

```text
without it the action gets no fix rounds.
```

  insert this text on the same line (it begins with the character shown):

```text
 If a plan action lists invalidates, tell the user before approval that those attestations stop counting once the action changes the files they cite, and after the change redraft them for the user to confirm again.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, directly after the sentence

```text
該動作的檢查點只准改目標路徑與這些檔案（2026-11-09 補充）。
```

  insert this text on the same line (it begins with the character shown):

```text
計畫也列出改動會讓哪些目前有效的確認失效（`invalidates`，寫成 `attestations[<序號>] <題目>`），即引用了目標路徑或額外檔案的確認，讓使用者核准前就知道改完要重新確認（2026-11-09 補充）。
```

- [ ] 7. Run the whole suite again; expect `117 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/plan-invalidates.test.ts src/models.ts src/evaluate/items.ts src/plan/types.ts src/plan/index.ts skills/maat-improve/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-flow-messages/02-plan-invalidates.md
git commit -m '✨ feat(plan): list the attestations a change would invalidate'
```
