# E03 — Default plan selects required rows, not every scope of a required item

The cloud review of PR #28 found that the default plan (no `--target`, added in D01) first collects required item ids and then selects every scope row with that id (`src/plan/index.ts:13-17`). If an item is applicable in one scope but its applicability is unknown in another (for example an extra `{cli:"codex"}` scope), the unknown row is planned too and marked `necessity: "required"`. That contradicts CLI contract §3.3 ("適用性或必備條件仍未知的 baseline 題…不納入預設計畫"). Reproduced: a report with `foundation.automated-tests` at `{}` (applicable) and at `{cli:"codex"}` (unknown) plans both rows. Owner decision 2026-11-06: in default mode select the required rows themselves. The review also asked to drop the E02 assertion that reads the spec text inside a behavior test, because it binds the test to wording.

Owner rule: over-design is forbidden. Change only the selection lines, the one assertion, and one new test. The always-true `i.result!=="not_applicable"` condition goes away with the rewritten line.

## Files

- Create: None.
- Modify: `tests/plan/build.test.ts`, `src/plan/index.ts` (anchored edits).
- Test paths: `tests/plan/build.test.ts`.

## Interfaces

Consumes:

```ts
// T21
export declare function buildPlan(r: Report, targets: string[], c: Catalog): Plan;
// Report.items: ItemResult[]; ItemResult: { id; scope; result; applicability: { status; reason; questions }; baseline: { tier; when_status }; ... }
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Write the failing test and drop the wording assertion.

  a. In `tests/plan/build.test.ts`, delete exactly this line (and nothing else):

```ts
 expect(await Bun.file("docs/specs/2026-11-04-maat-cli-interface.md").text()).toContain("適用性或必備條件仍未知的 baseline 題");
```

  b. Append exactly this to the end of `tests/plan/build.test.ts`:

```ts
test("the default plan skips a scope whose applicability is unknown",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 p.applicability={foundation:{status:"applicable"}};
 p.targets={"foundation.automated-tests":{baseline:true}};
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const report=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const item=report.items.find(i=>i.id==="foundation.automated-tests")!;
 report.items.push({...item,scope:{cli:"codex"},applicability:{...item.applicability,status:"unknown"}});
 expect(buildPlan(report,[],c).actions.map(a=>[a.check,a.scope])).toEqual([["foundation.automated-tests",{}]]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the new test failing on `toEqual` (it currently also receives `["foundation.automated-tests",{"cli":"codex"}]`).

```sh
bun test tests/plan/build.test.ts
```

- [ ] 3. Implement with two anchored edits in `src/plan/index.ts`. Change nothing else.

  a. Replace

```ts
 const required=[...new Set(r.items.filter(i=>i.baseline.tier==="baseline"&&i.baseline.when_status==="holds"&&i.applicability.status==="applicable"&&i.result!=="verified"&&i.result!=="not_applicable").map(i=>i.id))];
 const requested=targets.length?targets:required.length?required:["foundation.verify-entrypoints","prompt.task-spec","context.instruction-authority"];
```

  with

```ts
 const required=r.items.filter(i=>i.baseline.tier==="baseline"&&i.baseline.when_status==="holds"&&i.applicability.status==="applicable"&&i.result!=="verified");
 const requested=targets.length?targets:required.length?[...new Set(required.map(i=>i.id))]:["foundation.verify-entrypoints","prompt.task-spec","context.instruction-authority"];
```

  b. Replace

```ts
 const selected=r.items.filter(i=>requested.includes(i.id)||requested.includes(i.layer));
```

  with

```ts
 const selected=!targets.length&&required.length?required:r.items.filter(i=>requested.includes(i.id)||requested.includes(i.layer));
```

- [ ] 4. Run the focused test; expect exit 0 and 3 passing tests. Then run the whole suite; expect 0 failures (89 tests).

```sh
bun test tests/plan/build.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/plan/build.test.ts src/plan/index.ts docs/plans/maat-review-followups/03-plan-scope-rows.md
git commit -m '🐛 fix(plan): plan only required rows in default mode'
```
