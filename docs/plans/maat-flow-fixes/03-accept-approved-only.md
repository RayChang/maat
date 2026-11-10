# H01 — Accept checks only the approved actions

The first improve run on a copy of lottery (2026-11-10) could not be accepted. `maat plan --target context.instruction-authority` produced one action per scope of that check: the Claude Code scope (answered, `modify`) and the whole-project and Codex scopes (still `ask`). The improve skill tells the host to approve only what the user approved, and `maat flow template --step approve` already leaves `ask` actions out. But the `accept` guard in `src/flow/reducer.ts` loops over every plan action, and `actionGuard` rejects an action that is not in the approval, so accept returned `flow_rejected: action_not_approved (context.instruction-authority-44136fa3: approval check)` and the flow could never be accepted, although all three approved actions had a passing evaluation. Owner decision (2026-11-10): fix it. The fix makes accept check only the actions in the approval, and refuses accept when the approval names no action (otherwise an empty loop would accept). Dependencies are still enforced, because `actionGuard` requires each approved action's dependencies to have a passing evaluation. A ledger that already holds this rejection no longer replays, which is acceptable before release.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: None.
- Modify: `tests/e2e/controller.test.ts`, `src/flow/reducer.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/controller.test.ts`.

## Interfaces

Consumes:

```ts
export declare function reduceFlow(original:Flow,e:FlowEvent):Transition;
export declare function canonical(v:unknown):string; // src/canonical.ts
export declare function sha256(text:string):string; // src/canonical.ts
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Make three changes.

  a. In `tests/e2e/controller.test.ts`, replace

```ts
import { mkdtemp,readFile,rm } from "node:fs/promises";
```

  with

```ts
import { mkdtemp,readFile,writeFile,rm } from "node:fs/promises";
```

  b. In `tests/e2e/controller.test.ts`, replace

```ts
import { main } from "../../src/cli/main";
```

  with

```ts
import { main } from "../../src/cli/main";
import { canonical,sha256 } from "../../src/canonical";
```

  c. Append this text to the end of `tests/e2e/controller.test.ts` (after its last line):

```ts
test("accept checks only the approved actions, not an unapproved ask action",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-flow-ask-")),ledger=join(dir,"ledger");
 const call=(args:string[])=>main(["flow",...args,"--ledger",ledger,"--json"],time);
 try {
  const {plan_fingerprint:_,...plan}=JSON.parse(await readFile(fixture+"base.plan.json","utf8"));
  plan.actions.push({...plan.actions[0],id:"b",kind:"ask",target_path:null,depends_on:[]});
  const signed={...plan,plan_fingerprint:sha256(canonical(plan))};
  const approval=JSON.parse(await readFile(fixture+"approval.json","utf8"));approval.payload.plan_fingerprint=signed.plan_fingerprint;
  await writeFile(join(dir,"plan.json"),JSON.stringify(signed));await writeFile(join(dir,"approval.json"),JSON.stringify(approval));
  const id=JSON.parse((await call(["open","--plan",join(dir,"plan.json"),"--snapshot",fixture+"base.snapshot.json"])).stdout).flow_id as string;
  for(const args of [
   ["approve","--scope",join(dir,"approval.json"),"--by","ray"],
   ["checkpoint","--action","a","--phase","before","--fingerprints",fixture+"before.json"],
   ["checkpoint","--action","a","--phase","after","--fingerprints",fixture+"after.json"],
   ["record","--kind","change","--file",fixture+"change.json"],
   ["record","--kind","evaluation","--file",fixture+"evaluation.json"]
  ]) expect((await call([...args,"--flow",id])).code).toBe(0);
  const accepted=await call(["decide","--event","accept","--by","ray","--flow",id]);
  expect([accepted.code,accepted.stderr]).toEqual([0,""]);expect(JSON.parse(accepted.stdout).status).toBe("accepted");
 }finally{await rm(dir,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 with `4 pass`, `1 fail`: the new test's accept returns exit 4 with `flow_rejected: action_not_approved (b: approval check)`.

```sh
bun test tests/e2e/controller.test.ts
```

- [ ] 3. Implement. Make this edit. The "replace" text occurs exactly once in the file.

  a. In `src/flow/reducer.ts`, replace

```ts
  if(f.pending||f.unknown_effects.length)return "incomplete_effects";
  for(const action of f.plan.actions) {
```

  with

```ts
  if(f.pending||f.unknown_effects.length)return "incomplete_effects";
  if(!f.approval?.actions.length)return "approval_expired_or_missing";
  for(const action of f.plan.actions.filter(a=>f.approval!.actions.includes(a.id))) {
```

- [ ] 4. Run the focused test; expect exit 0 and `5 pass`. Then run the whole suite; expect `118 pass`, `0 fail`.

```sh
bun test tests/e2e/controller.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the spec. Make this edit; the "replace" text occurs exactly once in the file.

  a. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
guard 不滿足時拒絕，結束代碼 4 |
```

  with

```text
guard 不滿足時拒絕，結束代碼 4。`accept` 只檢查核准範圍裡的動作，計畫裡沒核准的動作（包括「先詢問」）不擋結案；沒有任何核准就拒絕（2026-11-10 補充） |
```

- [ ] 7. Run the whole suite again; expect `118 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/controller.test.ts src/flow/reducer.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-flow-fixes/03-accept-approved-only.md
git commit -m '🐛 fix(flow): accept checks only the approved actions'
```
