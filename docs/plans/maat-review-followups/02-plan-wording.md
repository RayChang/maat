# E02 — Complete the §3.3 note on items left out of the default plan

The cloud review of PR #31 noted that the §3.3 sentence added in E01 names only one reason a baseline gap is left out of the default plan (layer applicability unknown). `src/plan/index.ts:13` also leaves out a baseline item whose required condition is still unknown (`baseline.when_status` is `unknown`, because the policy has no `targets.<id>.baseline`), while `src/evaluate/layers.ts:27` still lists it as a gap. Owner decision 2026-11-06: complete the sentence. Text only.

Owner rule: over-design is forbidden. Change only this sentence.

## Files

- Create: None.
- Modify: `tests/plan/build.test.ts` (append one assertion line), `docs/specs/2026-11-04-maat-cli-interface.md` (one anchored substring).
- Test paths: `tests/plan/build.test.ts`.

## Interfaces

Consumes: None.

Produces: None (text only).

## Steps

- [ ] 1. Write the failing assertion. In `tests/plan/build.test.ts`, replace

```ts
 expect(buildPlan(report,["prompt.task-spec"],c).actions.map(a=>a.check)).toEqual(["prompt.task-spec"]);
```

  with

```ts
 expect(buildPlan(report,["prompt.task-spec"],c).actions.map(a=>a.check)).toEqual(["prompt.task-spec"]);
 expect(await Bun.file("docs/specs/2026-11-04-maat-cli-interface.md").text()).toContain("適用性或必備條件仍未知的 baseline 題");
```

- [ ] 2. Run the focused test; expect exit 1 with the new `toContain` failing.

```sh
bun test tests/plan/build.test.ts
```

- [ ] 3. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.3, replace

```text
適用性仍未知的 baseline 題會列在報告的缺口清單，但不納入預設計畫；要先在政策檔決定該層是否適用。
```

  with

```text
適用性或必備條件仍未知的 baseline 題會列在報告的缺口清單，但不納入預設計畫；要先在政策檔決定該層是否適用、該題是否必備（`targets.<id>.baseline`）。
```

- [ ] 4. Run the focused test; expect exit 0 and 2 passing tests. Then run the whole suite; expect 0 failures (88 tests).

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
git add -- tests/plan/build.test.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-review-followups/02-plan-wording.md
git commit -m '📝 docs(plan): name both reasons a baseline gap is left out of the default plan'
```
