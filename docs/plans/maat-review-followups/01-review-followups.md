# E01 — Address three non-blocking review suggestions

The cloud reviews of PRs #27, #28 and #30 approved them but left suggestions. Owner decision 2026-11-06: fix these three.

1. PR #27: `tests/skills/standard-policy.test.ts` checks each exclusion glob in a loop, so it still passes if the exclusion list is deleted. Add a non-empty check.
2. PR #30: a baseline item whose layer applicability is still unknown is listed in the report's baseline gaps but is not in the default plan (by the owner's rule "required and applicable"). Say so in CLI contract §3.3.
3. PR #28: after R01, `loop.stop-gate.command@1` and `loop.stop-gate.model@1` appear in no item's `observations`, because their facts are about `loop` and `loop.feedback-routing` lists them only in `verification.rerun`, not in `inspection.detectors`. It is the only catalog item with rerun detectors outside its inspection detectors. Also keep observations from an item's `verification.rerun` detectors. This changes code, not the frozen catalog 0.1.0.

Owner rule: over-design is forbidden. Change only what is listed.

## Files

- Create: None.
- Modify: `tests/evaluate/items.test.ts` (append one test), `tests/skills/standard-policy.test.ts`, `src/evaluate/items.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evaluate/items.test.ts`, `tests/skills/standard-policy.test.ts`.

## Interfaces

Consumes:

```ts
// T09 catalog item: verification: { rerun: string[]; ... }; inspection: { detectors: string[]; ... }
// T18
export declare function evaluateItems(c: Catalog, s: Snapshot, p: Policy, caps: CapabilityResult[], now: string, assessments?: Assessment[]): ItemResult[];
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Write the tests.

  a. Append exactly this to the end of `tests/evaluate/items.test.ts`:

```ts
test("an item also lists observations from its rerun detectors",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[{detector:"loop.stop-gate.command@1",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[]}];
 const items=evaluateItems(c,s,p,[],"2026-11-04");
 expect(items.find(i=>i.id==="loop.feedback-routing")!.observations.map(o=>o.detector)).toEqual(["loop.stop-gate.command@1"]);
});
```

  b. In `tests/skills/standard-policy.test.ts`, replace

```ts
 for(const glob of p.scope.exclude)expect(glob).toMatch(/^\*\*\/\*\.[a-z0-9]+$/);
```

  with

```ts
 expect(p.scope.exclude.length).toBeGreaterThan(0);
 for(const glob of p.scope.exclude)expect(glob).toMatch(/^\*\*\/\*\.[a-z0-9]+$/);
```

- [ ] 2. Run the focused tests; expect exit 1: the new test in `items.test.ts` fails on `toEqual` (it receives `[]`); `standard-policy.test.ts` passes.

```sh
bun test tests/evaluate/items.test.ts tests/skills/standard-policy.test.ts
```

- [ ] 3. Implement with three anchored edits. Change nothing else.

  a. In `src/evaluate/items.ts`, replace

```ts
(i.inspection.detectors.includes(o.detector)||o.facts.some(f=>f.subject===i.id))
```

  with

```ts
(i.inspection.detectors.includes(o.detector)||i.verification.rerun.includes(o.detector)||o.facts.some(f=>f.subject===i.id))
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace

```text
由該題 `inspection.detectors` 所列 detector 產生的觀察
```

  with

```text
由該題 `inspection.detectors` 或 `verification.rerun` 所列 detector 產生的觀察
```

  c. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.3, replace

```text
用新專案起點三題 `foundation.verify-entrypoints`、`prompt.task-spec`、`context.instruction-authority`（2026-11-06 補充）。
```

  with

```text
用新專案起點三題 `foundation.verify-entrypoints`、`prompt.task-spec`、`context.instruction-authority`（2026-11-06 補充）。適用性仍未知的 baseline 題會列在報告的缺口清單，但不納入預設計畫；要先在政策檔決定該層是否適用。
```

- [ ] 4. Run the focused tests; expect exit 0 (4 passing tests in `items.test.ts`, 1 in `standard-policy.test.ts`). Then run the whole suite; expect 0 failures (88 tests).

```sh
bun test tests/evaluate/items.test.ts tests/skills/standard-policy.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evaluate/items.test.ts tests/skills/standard-policy.test.ts src/evaluate/items.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-review-followups/01-review-followups.md
git commit -m '🐛 fix(report): address review follow-ups on observations, plan defaults and policy test'
```
