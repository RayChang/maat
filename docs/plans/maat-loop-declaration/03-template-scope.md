# L03 — Warn about the template's project scope and pin item-level loops

Owner decision 2026-11-08, from the cloud review of the develop → main PR #69 (minor points 1 and 2):

1. `maat attest template` prints `scope: {}` (`src/cli/inspect.ts`). Since L01, a loop item is not listed at `{}` once loops are declared. An attestation copied from the template with `scope: {}` therefore matches no row and is ignored without a diagnostic. The owner chose to add one clause to the existing skill sentence; the code stays unchanged.
2. L01's tests cover loops declared on the layer only. When a loop is declared on a single item (`applicability["loop.bounds"]`), that item leaves `{}`, while the other loop items and the loop layer's `{}` row stay. No test pins this. The owner chose to add one test. It passes on the current code; it guards the behavior described in spec §5.1.

Owner rule: over-design is forbidden. Change only the one skill sentence and the two tests.

## Files

- Create: None.
- Modify: `tests/skills/contracts.test.ts`, `tests/evaluate/scopes.test.ts`, `skills/maat-diagnose/SKILL.md` (anchored edits).
- Test paths: `tests/skills/contracts.test.ts`, `tests/evaluate/scopes.test.ts`.

## Interfaces

Consumes:

```ts
// tests/evaluate/scopes.test.ts already imports these
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
```

Produces: None.

## Steps

- [ ] 1. Write the tests.

  a. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("and at a narrower scope an attestation or exemption names");
```

  with

```ts
 expect(diagnose).toContain("and at a narrower scope an attestation or exemption names");
 expect(diagnose).toContain("replace the scope {} that maat attest template prints");
```

  b. In `tests/evaluate/scopes.test.ts`, replace

```ts
test("an exemption scope holds its item, and an unobserved target CLI gets no scope",async()=>{
```

  with

```ts
test("a loop declared on one item moves only that item off the project scope",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.applicability={"loop.bounds":{status:"applicable",loops:[{id:"stop",kind:"execution-feedback",scope:".claude/hooks/stop.sh"}]}};
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 expect(r.items.filter(i=>i.id==="loop.bounds").map(i=>i.scope)).toEqual([{workflow:".claude/hooks/stop.sh"}]);
 expect(r.items.some(i=>i.id==="loop.trigger"&&!Object.keys(i.scope).length)).toBe(true);
 expect(r.layers.some(l=>l.layer==="loop"&&!Object.keys(l.scope).length)).toBe(true);
});
test("an exemption scope holds its item, and an unobserved target CLI gets no scope",async()=>{
```

- [ ] 2. Run the focused tests. Expect exit 1 with `5 pass`, `1 fail`:
  - the contracts test fails on `toContain("replace the scope {} that maat attest template prints")`;
  - the new scopes test `a loop declared on one item moves only that item off the project scope` passes already, because it pins existing behavior.

```sh
bun test tests/skills/contracts.test.ts tests/evaluate/scopes.test.ts
```

- [ ] 3. Implement. In `skills/maat-diagnose/SKILL.md`, replace

```text
not at the project scope {}; each listed scope needs its own attestation.
```

  with

```text
not at the project scope {}; each listed scope needs its own attestation, so for a loop item replace the scope {} that maat attest template prints with the listed scope.
```

- [ ] 4. Run the focused tests; expect exit 0 and `6 pass`, `0 fail`. Then run the whole suite; expect `111 pass`, `0 fail`.

```sh
bun test tests/skills/contracts.test.ts tests/evaluate/scopes.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/skills/contracts.test.ts tests/evaluate/scopes.test.ts skills/maat-diagnose/SKILL.md docs/plans/maat-loop-declaration/03-template-scope.md
git commit -m '📝 docs(skill): tell agents to replace the template scope for loop items'
```
