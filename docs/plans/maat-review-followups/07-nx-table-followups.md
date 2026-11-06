# E07 — Follow-ups from the PR #52 review (Nx target tables)

The cloud review of PR #52 approved it and suggested three follow-ups; a fourth (`"t": null` counted as declared) was marked acceptable and is not changed.

1. A data row with more cells than the two-column header (`| \`x\` | a | b |`) took `a | b` as its purpose, because the row regex captured greedily. Capture only one cell (`[^|]+`), so such a row is skipped.
2. No test pins that a template from an earlier section is not applied to a table in a later section. Add one, together with the extra-cells case.
3. The two entrypoint detectors read a new input form while keeping their `@1` ids (catalog 0.1.0 is frozen). Say in CLI contract §3.1 that scans of the same repository before and after this change can differ.

Measured: fvg still yields the same four entrypoints and `foundation.verify-entrypoints` stays verified.

Owner rule: over-design is forbidden. One regex, one test, one sentence.

## Files

- Create: None.
- Modify: `tests/detectors/nx-targets.test.ts` (append one test), `src/detectors/entrypoints.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/detectors/nx-targets.test.ts`.

## Interfaces

Consumes:

```ts
export declare function detectedEntrypoints(s: ScanData): Entrypoint[];   // src/detectors/entrypoints.ts
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Append exactly this to the end of `tests/detectors/nx-targets.test.ts` (it contains `\n` inside strings; copy it byte-exact):

```ts
test("a template from another section or a row with extra cells declares nothing",()=>{
 const split="## Commands\n\nUse `bun nx run workspace:<target>`.\n\n## Gates\n\n| Target | Checks |\n|---|---|\n| `check-decks` | mechanical deck checks |\n";
 expect(detectedEntrypoints(scan([{path:"AGENTS.md",text:split},project]))).toEqual([]);
 const extra=guide.replace("| `missing-one` | not declared in project.json |","| `missing-one` | first | second |");
 expect(detectedEntrypoints(scan([{path:"AGENTS.md",text:extra},project])).map(e=>e.name)).toEqual(["workspace:check-decks"]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the new test failing on its second `toEqual` (the extra-cells row is still read); the section assertion already passes.

```sh
bun test tests/detectors/nx-targets.test.ts
```

- [ ] 3. Make two anchored edits. Change nothing else.

  a. In `src/detectors/entrypoints.ts`, replace

```text
\s*\|(.+)\|\s*$/.exec(lines[k]!)
```

  with

```text
\s*\|([^|]+)\|\s*$/.exec(lines[k]!)
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.1, replace

```text
外掛自動產生的目標不推斷，維持 `unknown`。
```

  with

```text
外掛自動產生的目標不推斷，維持 `unknown`。表格列多於兩格時整列略過。這些讀法沿用 `policy.verify-entrypoint@1` 與 `instructions.verify-entrypoint@1` 的版本號（catalog 0.1.0 已凍結），所以同一個 repository 用這次前後的 `maat` 掃描，結果可能不同。
```

- [ ] 4. Run the focused test; expect exit 0 and 4 passing tests. Then run the whole suite; expect 0 failures (106 tests).

```sh
bun test tests/detectors/nx-targets.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/detectors/nx-targets.test.ts src/detectors/entrypoints.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-review-followups/07-nx-table-followups.md
git commit -m '🐛 fix(detectors): skip Nx table rows with extra cells and pin section bounds'
```
