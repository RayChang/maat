# M01 — CI steps are evidence for the project scope, not scopes of their own

After G01, every CI step (scope `{workflow, boundary, evaluator:"command"}`) became its own evaluation scope holding `foundation.ci-verification`, a required item. A clean skill run on fvg found 4 CI steps that only publish or report (`publish:storybook/0`, `reconcile:kb-drift/1`, `report:retries/0`, `report:retries/1`); each left a required gap that could not be marked not applicable. Owner decision 2026-11-06: the item asks whether CI runs verification anywhere, so CI step observations and facts count for the project scope `{}` and CI steps are no longer evaluation scopes. The item holds when at least one step literally invokes a declared verification entrypoint; steps that do something else stay `unknown` facts and do not create gaps. The detector and its per-step scopes are unchanged (step details stay visible on each observation).

Measured with the change: alibi 41 items, one scope; fvg 47 items, scopes `{}`, `{cli:claude-code}`, `{cli:codex}`, with all 9 CI step observations listed on `foundation.ci-verification` at `{}`. 99 tests pass (the G01 scope test now uses a CLI scope, since CI steps no longer form scopes).

Owner rule: over-design is forbidden. One helper, three call sites, test updates, two contract phrases.

## Files

- Create: None.
- Modify: `tests/evaluate/scopes.test.ts`, `src/canonical.ts`, `src/evaluate/truth.ts`, `src/evaluate/items.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evaluate/scopes.test.ts`.

## Interfaces

Consumes:

```ts
export declare function sameScope(a: Scope, b: Scope): boolean;   // src/canonical.ts
export declare function ciObservations(s: ScanData, _p: Policy): Observation[];   // src/detectors/ci.ts
export declare function makeScan(i: Inventory, p: Policy, adapters?: AdapterResult[], observations?: Observation[]): ScanData;
```

Produces:

```ts
// src/canonical.ts: evidence at a CI step scope also counts for the project scope {}
export function countsFor(evidence: Scope, scope: Scope): boolean;
```

## Steps

- [ ] 1. Update and add tests in `tests/evaluate/scopes.test.ts`.

  a. In `tests/evaluate/scopes.test.ts`, replace

```text
import { makeSnapshot } from "../../src/snapshot";
```

  with

```text
import { makeSnapshot,makeScan } from "../../src/snapshot";
import { sha256 } from "../../src/canonical";
import { ciObservations } from "../../src/detectors/ci";
```

  b. In `tests/evaluate/scopes.test.ts`, replace

```text
 const step={workflow:".gitlab-ci.yml",boundary:"test/0",evaluator:"command"};
 s.observations=[{detector:"ci.step-invokes-entrypoint@1",version:1,scope:step,evidence:[],limits:[],diagnostics:[],
  facts:[{subject:"foundation.ci-verification",claim:"invocation",status:"unknown",scope:step,basis:"bun test",complete:false}]}];
```

  with

```text
 s.target_clis=["claude-code"];
 s.observations=[{detector:"permissions.declarations@1",version:1,scope:{cli:"claude-code"},evidence:[],limits:[],diagnostics:[],facts:[]}];
```

  c. In `tests/evaluate/scopes.test.ts`, replace

```text
 expect(r.items.filter(i=>Object.keys(i.scope).length).map(i=>i.id)).toEqual(["foundation.ci-verification"]);
 expect(r.layers.filter(l=>Object.keys(l.scope).length).map(l=>l.layer)).toEqual(["foundation"]);
```

  with

```text
 expect(r.items.filter(i=>Object.keys(i.scope).length).map(i=>i.id)).toEqual(["harness.permission-boundaries"]);
 expect(r.layers.filter(l=>Object.keys(l.scope).length).map(l=>l.layer)).toEqual(["harness"]);
```

  d. Append exactly this to the end of `tests/evaluate/scopes.test.ts` (it contains `\n` inside strings; copy it byte-exact):

```ts
test("CI steps are evidence for the project scope, not scopes of their own",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.applicability={foundation:{status:"applicable"}};
 const materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
  {path:".gitlab-ci.yml",text:"publish:\n  script: [npm publish]\ntest:\n  script: [bun test]\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const inv={root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials};
 const s=makeSnapshot(inv,p,[],ciObservations(makeScan(inv,p),p));
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 expect(r.items.every(i=>Object.keys(i.scope).length===0)).toBe(true);
 const ci=r.items.find(i=>i.id==="foundation.ci-verification")!;
 expect(ci.result).toBe("verified");
 expect(ci.observations.filter(o=>o.detector==="ci.step-invokes-entrypoint@1").map(o=>o.scope.boundary)).toEqual(["publish/0","test/0"]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the new last test failing on `toBe(true)` (CI steps still form their own scopes). The updated first test already passes.

```sh
bun test tests/evaluate/scopes.test.ts
```

- [ ] 3. Implement with these anchored edits, each anchor occurring exactly once. Change nothing else.

  a. In `src/canonical.ts`, replace

```text
export function sameScope(
```

  with

```text
export function countsFor(evidence:Scope,scope:Scope):boolean { return sameScope(evidence,scope)||(evidence.evaluator==="command"&&!Object.keys(scope).length); }
export function sameScope(
```

  b. In `src/evaluate/truth.ts`, replace

```text
import { sameScope } from "../canonical";
```

  with

```text
import { sameScope,countsFor } from "../canonical";
```

  c. In `src/evaluate/truth.ts`, replace

```text
f.claim===claim && sameScope(f.scope,scope) && !f.signal
```

  with

```text
f.claim===claim && countsFor(f.scope,scope) && !f.signal
```

  d. In `src/evaluate/items.ts`, replace

```text
import { canonical,sameScope } from "../canonical";
```

  with

```text
import { canonical,sameScope,countsFor } from "../canonical";
```

  e. In `src/evaluate/items.ts`, replace

```text
 const scopes:Scope[]=[{},...s.observations.map(o=>o.scope),
```

  with

```text
 const scopes:Scope[]=[{},...s.observations.map(o=>o.scope).filter(x=>x.evaluator!=="command"),
```

  f. In `src/evaluate/items.ts`, replace

```text
observations:s.observations.filter(o=>sameScope(o.scope,scope)&&(
```

  with

```text
observations:s.observations.filter(o=>countsFor(o.scope,scope)&&(
```

  g. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
每個步驟的指令與失敗後果逐一記錄；
```

  with

```text
每個步驟的指令與失敗後果逐一記錄，並計入專案範圍 `{}`，不另列評估範圍；持續整合這題只要有一個步驟字面呼叫已宣告的驗證指令即成立（2026-11-06 補充）；
```

  h. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
較窄的範圍（代理工具、CI 步驟、迴圈或確認所用的範圍）
```

  with

```text
較窄的範圍（代理工具、迴圈或確認所用的範圍；CI 步驟不算，見 3.1）
```

- [ ] 4. Run the focused test; expect exit 0 and 4 passing tests. Then run the whole suite; expect 0 failures (99 tests).

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
git add -- tests/evaluate/scopes.test.ts src/canonical.ts src/evaluate/truth.ts src/evaluate/items.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-ci-rollup/01-ci-rollup.md
git commit -m '🐛 fix(evaluate): count CI steps as evidence for the project scope'
```
