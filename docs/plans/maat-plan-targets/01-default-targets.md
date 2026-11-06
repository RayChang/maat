# D01 — Plan the policy's failed required items by default

Diagnosing alibi with the standard policy showed that `maat plan` without `--target` always plans three hard-coded items (`foundation.verify-entrypoints`, `prompt.task-spec`, `context.instruction-authority`). It ignores the items the policy marks required that did not pass, so the user had to pass five `--target` flags by hand. Owner decision 2026-11-06: without `--target`, plan every required item that is not verified. An item is required when the report says it is a baseline-tier item, its baseline condition holds (`targets.<id>.baseline: true`), and it is applicable. When the report has no such item (for example a project with no policy yet), keep the current three starting items, so a new project still gets a plan. Explicit `--target` behaves as before.

Owner rule: over-design is forbidden. Change only the default selection, one test, and one spec sentence.

## Files

- Create: None.
- Modify: `tests/plan/build.test.ts` (append one test), `src/plan/index.ts` (one anchored line), `docs/specs/2026-11-04-maat-cli-interface.md` (one anchored line).
- Test paths: `tests/plan/build.test.ts`.

## Interfaces

Consumes:

```ts
// T21
export declare function buildPlan(r: Report, targets: string[], c: Catalog): Plan;
// T19
export declare function buildReport(s: Snapshot, p: Policy, c: Catalog, now: string, ...rest: unknown[]): Report;
// ItemResult: { id; result; applicability: { status }; baseline: { tier: "baseline"|"advanced"; when_status: Truth }; ... }
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Write the failing test. Append exactly this to the end of `tests/plan/build.test.ts`:

```ts
test("without targets the plan covers the policy's required items that did not pass",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 p.applicability={foundation:{status:"applicable"}};
 p.targets={"foundation.automated-tests":{baseline:true},"foundation.static-analysis":{baseline:true}};
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const report=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const plan=buildPlan(report,[],c);
 expect(plan.actions.map(a=>a.check)).toEqual(["foundation.automated-tests","foundation.static-analysis"]);
 expect(plan.actions.every(a=>a.necessity==="required")).toBe(true);
 expect(buildPlan(report,["prompt.task-spec"],c).actions.map(a=>a.check)).toEqual(["prompt.task-spec"]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the new test failing on the first `toEqual` (it currently receives the three hard-coded items).

```sh
bun test tests/plan/build.test.ts
```

- [ ] 3. Implement with two anchored edits. Change nothing else.

  a. In `src/plan/index.ts`, replace

```ts
 const requested=targets.length?targets:["foundation.verify-entrypoints","prompt.task-spec","context.instruction-authority"];
```

  with

```ts
 const required=[...new Set(r.items.filter(i=>i.baseline.tier==="baseline"&&i.baseline.when_status==="holds"&&i.applicability.status==="applicable"&&i.result!=="verified"&&i.result!=="not_applicable").map(i=>i.id))];
 const requested=targets.length?targets:required.length?required:["foundation.verify-entrypoints","prompt.task-spec","context.instruction-authority"];
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.3, replace the line

```text
輸入 `--report <file>`，`--target <layer|check-id>` 可重複。輸出改善計畫（JSON／Markdown），每項含 check、item／rule card／template 版本、目前結果與目標、動作、目標路徑或「位置待確認」、`depends_on`、必要／建議、風險、`needs_approval`、驗收（detector 或人工）、產生時的證據指紋。遇到未知指令、路徑或格式，輸出「先詢問」步驟而不是猜測。計畫是文字與資料，不套用。
```

  with

```text
輸入 `--report <file>`，`--target <layer|check-id>` 可重複。輸出改善計畫（JSON／Markdown），每項含 check、item／rule card／template 版本、目前結果與目標、動作、目標路徑或「位置待確認」、`depends_on`、必要／建議、風險、`needs_approval`、驗收（detector 或人工）、產生時的證據指紋。遇到未知指令、路徑或格式，輸出「先詢問」步驟而不是猜測。計畫是文字與資料，不套用。沒有 `--target` 時，計畫涵蓋報告裡政策列為必備（baseline 題、條件成立且適用）但尚未成立的每一題；沒有這類題目時，用新專案起點三題 `foundation.verify-entrypoints`、`prompt.task-spec`、`context.instruction-authority`（2026-11-06 補充）。
```

- [ ] 4. Run the focused test; expect exit 0 and 2 passing tests. Then run the whole suite; expect 0 failures (87 tests).

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
git add -- tests/plan/build.test.ts src/plan/index.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-plan-targets/01-default-targets.md
git commit -m '🐛 fix(plan): plan failed required items when no target is given'
```
