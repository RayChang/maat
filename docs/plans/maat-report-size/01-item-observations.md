# R01 — List only an item's own observations

Scanning real projects showed every item copying all observations of its scope: alibi's report was 18 MB, fvg's 66 MB, too large for the diagnose skill to read. CLI contract §5.1 defines `items[].observations` per item. This task keeps, for each item, only observations from the item's own catalog detectors (`inspection.detectors`) or observations with a fact whose subject is the item. Claim resolution is unchanged: it already reads `s.observations` directly. Measured on alibi with this change: 18 MB to 0.8 MB, all 84 tests passing.

Owner rule: over-design is forbidden. Change only the filter, one contract sentence, and one test.

## Files

- Create: None.
- Modify: `tests/evaluate/items.test.ts` (append one test), `src/evaluate/items.ts` (one anchored line), `docs/specs/2026-11-04-maat-cli-interface.md` (one sentence).
- Test paths: `tests/evaluate/items.test.ts`.

## Interfaces

Consumes:

```ts
// T09 catalog item: inspection: { inputs: string[]; detectors: string[]; methods: string[]; review?: string; limits: string };
// T18
export declare function evaluateItems(c: Catalog, s: Snapshot, p: Policy, caps: CapabilityResult[], now: string, assessments?: Assessment[]): ItemResult[];
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Write the failing test. Append exactly this to the end of `tests/evaluate/items.test.ts`:

```ts
test("an item lists only observations from its own detectors or about itself",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[
  {detector:"ci-config-found@1",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[]},
  {detector:"unrelated@1",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[]},
  {detector:"fixture",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[
   {subject:"foundation.ci-verification",claim:"invocation",status:"holds",scope:{},basis:"test declaration",complete:true}]}];
 const items=evaluateItems(c,s,p,[],"2026-11-04");
 expect(items.find(i=>i.id==="foundation.ci-verification")!.observations.map(o=>o.detector)).toEqual(["ci-config-found@1","fixture"]);
 expect(items.find(i=>i.id==="prompt.task-spec")!.observations).toEqual([]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the new test failing on `toEqual` (it currently receives all three detectors).

```sh
bun test tests/evaluate/items.test.ts
```

- [ ] 3. Implement with two anchored edits. Change nothing else.

  a. In `src/evaluate/items.ts`, replace

```ts
   result,claims,observations:s.observations.filter(o=>sameScope(o.scope,scope)),
```

  with

```ts
   result,claims,observations:s.observations.filter(o=>sameScope(o.scope,scope)&&(i.inspection.detectors.includes(o.detector)||o.facts.some(f=>f.subject===i.id))),
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace the line

```text
`layers[].status` 在適用性未知時用 `pending`，這是「待確認」的呈現值，不是新的 D2 枚舉；`authoritative` 為 false 時整份報告不得稱為正式符合性聲明。沒有總分、百分比或等級欄位。
```

  with these two lines

```text
`layers[].status` 在適用性未知時用 `pending`，這是「待確認」的呈現值，不是新的 D2 枚舉；`authoritative` 為 false 時整份報告不得稱為正式符合性聲明。沒有總分、百分比或等級欄位。
`items[].observations` 只列同一範圍內、由該題 `inspection.detectors` 所列 detector 產生的觀察，以及含有以該題為主體之事實的觀察（2026-11-06 補充）。
```

- [ ] 4. Run the focused test; expect exit 0 and 3 passing tests. Then run the whole suite; expect 0 failures (85 tests).

```sh
bun test tests/evaluate/items.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evaluate/items.test.ts src/evaluate/items.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-report-size/01-item-observations.md
git commit -m '🐛 fix(report): list only observations relevant to each item'
```
