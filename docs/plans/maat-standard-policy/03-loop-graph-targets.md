# P03 — Add the loop and graph baseline items to the standard policy targets

Owner decision 2026-11-07, after the third clean skill run on fvg: the standard policy listed only the 11 baseline items of the four always-applicable layers as targets. A project that declared a loop (as the skill tells it to) therefore had its loop items at `baseline.when_status: "unknown"`, and `src/evaluate/layers.ts` counts every such item as a baseline gap even when it is `verified`. The skill also forbids touching targets, so the gap could never close. The owner chose to list the six loop and six graph `baseline` items as targets too. Loop and graph applicability stays a per-project decision: while a layer is not declared applicable its items stay gaps as before; once declared, verified items stop being gaps. Measured on the run-3 fvg projection: `loop {"workflow":"tools/fvg-feature-delivery/**"}` gaps went from six items to `["loop.bounds"]` (the one `partial` item).

Owner rule: over-design is forbidden. Change only the standard file, its test, and one sentence of the spec paragraph.

## Files

- Create: None.
- Modify: `tests/skills/standard-policy.test.ts`, `skills/maat-diagnose/standard-policy.yaml`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/skills/standard-policy.test.ts`.

## Interfaces

Consumes:

```ts
// T08
export declare function parsePolicy(text: string, catalogVersion: string): Policy;
// T09
export declare function loadCatalog(root?: string): Promise<Catalog>;
// CatalogItem.layer.primary: string; CatalogItem.baseline.proposed_tier: "baseline" | "advanced"
```

Produces: None (data file and text only).

## Steps

- [ ] 1. Write the failing test. In `tests/skills/standard-policy.test.ts` make two edits.

  a. Replace

```ts
test("the standard policy requires exactly the baseline items of its applicable layers",async()=>{
```

  with

```ts
test("the standard policy requires exactly the baseline items of every layer",async()=>{
```

  b. Replace

```ts
 const baseline=c.items.filter(i=>layers.includes(i.layer.primary)&&i.baseline.proposed_tier==="baseline").map(i=>i.id).sort();
 expect(baseline.length).toBe(11);
```

  with

```ts
 const baseline=c.items.filter(i=>i.baseline.proposed_tier==="baseline").map(i=>i.id).sort();
 expect(baseline.length).toBe(23);
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the `Object.keys(p.targets)` `toEqual` fails with `- Expected  - 12` (the 12 loop and graph ids are missing from the standard file).

```sh
bun test tests/skills/standard-policy.test.ts
```

- [ ] 3. Implement.

  a. In `skills/maat-diagnose/standard-policy.yaml`, replace

```yaml
# Loop and graph applicability is decided per project.
```

  with

```yaml
# Loop and graph applicability is decided per project; their baseline items
# are targets too (owner decision 2026-11-07), so they count once declared.
```

  b. In `skills/maat-diagnose/standard-policy.yaml`, replace

```yaml
  harness.verification-wiring: { baseline: true }
```

  with

```yaml
  harness.verification-wiring: { baseline: true }
  loop.trigger: { baseline: true }
  loop.feedback-routing: { baseline: true }
  loop.acceptance-policy: { baseline: true }
  loop.bounds: { baseline: true }
  loop.stopping-policy: { baseline: true }
  loop.resumable-state: { baseline: true }
  graph.roles: { baseline: true }
  graph.declared-routes: { baseline: true }
  graph.handoff-contract: { baseline: true }
  graph.shared-state: { baseline: true }
  graph.edge-gates: { baseline: true }
  graph.human-gates: { baseline: true }
```

  c. In `docs/specs/2026-11-04-maat-cli-interface.md` §7.1, replace

```text
迴圈與協作圖兩層是否適用由各專案決定，標準檔不寫。
```

  with

```text
迴圈與協作圖兩層是否適用由各專案決定，標準檔不寫；這兩層的 12 題 baseline 題也列為必備（使用者 2026-11-07 決定），專案宣告該層適用後，驗證通過的題目就不再列為缺口。
```

- [ ] 4. Run the focused test; expect exit 0 and 1 passing test. Then run the whole suite; expect `107 pass`, `0 fail`.

```sh
bun test tests/skills/standard-policy.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/skills/standard-policy.test.ts skills/maat-diagnose/standard-policy.yaml docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-standard-policy/03-loop-graph-targets.md
git commit -m '✨ feat(skill): require loop and graph baseline items in the standard policy'
```
