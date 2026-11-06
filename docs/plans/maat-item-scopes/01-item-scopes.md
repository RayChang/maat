# G01 — Evaluate an item at a narrower scope only when the scope is about that item

Every scope found anywhere (each CI step, each target CLI, each attestation or loop scope) currently gets a full copy of all 41 items, because `evaluateItems` loops every scope over every item. After F01 added GitLab CI, alibi's report went from 41 to 123 items (205 with two target CLIs) and fvg's to 574, almost all `unknown` copies that no attestation covers. Owner decision 2026-11-06: the project scope `{}` always holds every item; a narrower scope holds an item only when it is about that item:

- an observation at that scope belongs to the item (its detector is in the item's `inspection.detectors` or `verification.rerun`, or a fact names the item), or
- an attestation for that item uses that scope, or
- the policy declares that loop scope under the item's id or the item's layer.

`layers[]` lists a narrower scope only for layers that have items there. `{}` is now always an evaluation scope; the old fallback (target CLI scopes when nothing else exists) is removed because `{}` always exists. Capabilities still use every scope. Measured with the change: alibi 123 to 45 items (205 to 50 with two target CLIs), fvg 574 to 79; required-item results at `{}` unchanged; all 92 existing tests pass.

Owner rule: over-design is forbidden. Change only the scope selection, one test file, and one contract sentence.

## Files

- Create: `tests/evaluate/scopes.test.ts`.
- Modify: `src/evaluate/items.ts`, `src/evaluate/layers.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evaluate/scopes.test.ts`.

## Interfaces

Consumes:

```ts
// T18
export declare function evaluationScopes(s: Snapshot, p: Policy): Scope[];
export declare function evaluateItems(c: Catalog, s: Snapshot, p: Policy, caps: CapabilityResult[], now: string, assessments?: Assessment[]): ItemResult[];
// T19
export declare function buildReport(s: Snapshot, p: Policy, c: Catalog, now: string, ...rest: unknown[]): Report;
```

Produces:

```ts
// src/evaluate/items.ts: canonical scope strings where item i is evaluated
export function itemScopes(i: CatalogItem, s: Snapshot, p: Policy): Set<string>;
```

## Steps

- [ ] 1. Write the failing test. Create `tests/evaluate/scopes.test.ts` with exactly:

```ts
import { test,expect } from "bun:test";
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("a narrower scope only holds the items it is about",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const step={workflow:".gitlab-ci.yml",boundary:"test/0",evaluator:"command"};
 s.observations=[{detector:"ci.step-invokes-entrypoint@1",version:1,scope:step,evidence:[],limits:[],diagnostics:[],
  facts:[{subject:"foundation.ci-verification",claim:"invocation",status:"unknown",scope:step,basis:"bun test",complete:false}]}];
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 expect(r.items.filter(i=>Object.keys(i.scope).length===0)).toHaveLength(c.items.length);
 expect(r.items.filter(i=>Object.keys(i.scope).length).map(i=>i.id)).toEqual(["foundation.ci-verification"]);
 expect(r.layers.filter(l=>Object.keys(l.scope).length).map(l=>l.layer)).toEqual(["foundation"]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the first assertion failing on `toHaveLength` (received 0: today `{}` is only added when no other scope exists, so the project scope is missing; the step scope holds all 41 items instead).

```sh
bun test tests/evaluate/scopes.test.ts
```

- [ ] 3. Implement with these anchored edits. Change nothing else.

  a. In `src/evaluate/items.ts`, replace

```ts
import type { Catalog } from "../catalog/types";
import type { Snapshot,Policy,Scope,ItemResult,Claim,CapabilityResult,Layer,Truth,Assessment } from "../models";
```

  with

```ts
import type { Catalog,CatalogItem } from "../catalog/types";
import type { Snapshot,Policy,Scope,ItemResult,Claim,CapabilityResult,Layer,Truth,Assessment,Observation } from "../models";
```

  b. In `src/evaluate/items.ts`, replace

```ts
 const scopes:Scope[]=[...s.observations.map(o=>o.scope),...p.attestations.filter(x=>x.scope).map(x=>x.scope),...Object.values(p.applicability).flatMap(d=>(d.loops??[]).map(l=>({workflow:l.scope})))];
 if(!scopes.length) scopes.push(...(s.target_clis.length?s.target_clis.map(cli=>({cli})):[{}]));
```

  with

```ts
 const scopes:Scope[]=[{},...s.observations.map(o=>o.scope),...p.attestations.filter(x=>x.scope).map(x=>x.scope),...Object.values(p.applicability).flatMap(d=>(d.loops??[]).map(l=>({workflow:l.scope})))];
```

  c. In `src/evaluate/items.ts`, replace

```ts
export function evaluateItems(c:Catalog,s:Snapshot,p:Policy,caps:CapabilityResult[],now:string,assessments:Assessment[]=[]):ItemResult[] {
```

  with

```ts
export function itemScopes(i:CatalogItem,s:Snapshot,p:Policy):Set<string> {
 const own=(o:Observation)=>i.inspection.detectors.includes(o.detector)||i.verification.rerun.includes(o.detector)||o.facts.some(f=>f.subject===i.id);
 const loops=Object.entries(p.applicability).filter(([key])=>key===i.id||key===i.layer.primary).flatMap(([,d])=>(d.loops??[]).map(l=>({workflow:l.scope})));
 return new Set([{},...s.observations.filter(own).map(o=>o.scope),...p.attestations.flatMap(a=>a.check===i.id&&a.scope?[a.scope]:[]),...loops].map(x=>canonical(x)));
}
export function evaluateItems(c:Catalog,s:Snapshot,p:Policy,caps:CapabilityResult[],now:string,assessments:Assessment[]=[]):ItemResult[] {
```

  d. In `src/evaluate/items.ts`, replace

```ts
 for(const scope of evaluationScopes(s,p)) for(const i of c.items) {
  const selected=p.applicability[i.id]??p.applicability[i.layer.primary];
```

  with

```ts
 const relevant=new Map(c.items.map(i=>[i.id,itemScopes(i,s,p)]));
 for(const scope of evaluationScopes(s,p)) for(const i of c.items) {
  if(!relevant.get(i.id)!.has(canonical(scope))) continue;
  const selected=p.applicability[i.id]??p.applicability[i.layer.primary];
```

  e. In `src/evaluate/layers.ts`, replace

```ts
  const selected=items.filter(i=>i.layer===layer&&sameScope(i.scope,scope));
```

  with

```ts
  const selected=items.filter(i=>i.layer===layer&&sameScope(i.scope,scope));
  if(!selected.length&&Object.keys(scope).length)continue;
```

  f. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace the line

```text
`items[].observations` 只列同一範圍內、由該題 `inspection.detectors` 或 `verification.rerun` 所列 detector 產生的觀察，以及含有以該題為主體之事實的觀察（2026-11-06 補充）。
```

  with these two lines

```text
`items[].observations` 只列同一範圍內、由該題 `inspection.detectors` 或 `verification.rerun` 所列 detector 產生的觀察，以及含有以該題為主體之事實的觀察（2026-11-06 補充）。
`items[]` 在專案範圍 `{}` 列出每一題；較窄的範圍（代理工具、CI 步驟、迴圈或確認所用的範圍）只列與該範圍有關的題目：該題的觀察出現在那個範圍、該題的確認使用那個範圍，或政策在該題或其所屬層宣告了那個迴圈範圍。`layers[]` 只在該層於某範圍有題目時列出那個範圍（2026-11-06 補充）。
```

- [ ] 4. Run the focused test; expect exit 0 and 1 passing test. Then run the whole suite; expect 0 failures (93 tests).

```sh
bun test tests/evaluate/scopes.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evaluate/scopes.test.ts src/evaluate/items.ts src/evaluate/layers.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-item-scopes/01-item-scopes.md
git commit -m '🐛 fix(evaluate): evaluate an item at a narrower scope only when it is about that item'
```
