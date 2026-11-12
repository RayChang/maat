# U02 — Read plural purposes and skip fenced Task | Command tables

The cloud review of Q01 (PR #101, 2026-11-11) left two gaps in the `Task | Command` table reader in `src/detectors/entrypoints.ts`:
- A purpose written in the plural, such as `Unit tests`, `Builds`, or `Checks`, does not match `\btest\b`, `\bbuild\b`, or `\bcheck\b`, so the row is silently skipped.
- A table inside a code fence (an example in the docs) is read as a real declaration. The `Target` table reader beside it already skips fenced lines through the `fenced` array.

Rules of the change:
- A `Task | Command` header on a fenced line is skipped, using the same `fenced` array.
- The purpose words also match `tests`, `builds`, and `checks`.

Lottery's table has no plural purposes and no fenced table, so its result does not change.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/detectors/entrypoints.test.ts` (append), `src/detectors/entrypoints.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/detectors/entrypoints.test.ts`.

## Interfaces

Consumes:

```ts
export declare function detectedEntrypoints(s:ScanData):Entrypoint[]; // src/detectors/entrypoints.ts
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/detectors/entrypoints.test.ts` (the file ends with a newline; add nothing else):

```ts
test("a Task | Command table reads plural purposes and skips tables inside code fences",()=>{
 const p=emptyPolicy(),text=["| Task | Command |","| --- | --- |","| Unit tests | `bun run test:unit` |","| Builds | `bun run build` |","",
  "```md","| Task | Command |","| --- | --- |","| Example tests | `bun run example` |","```",""].join("\n");
 const materials=[{path:"CLAUDE.md",text}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 expect(detectedEntrypoints(s).map(e=>[e.purpose,e.command])).toEqual([["Unit tests","bun run test:unit"],["Builds","bun run build"]]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with `2 pass`, `1 fail`: every row is skipped, because all three purposes are plural. With only the plural fix, the fenced `Example tests` row would be read, so the test needs both edits.

```sh
bun test tests/detectors/entrypoints.test.ts
```

- [ ] 3. Implement. Make these 2 edits. Each "replace" text occurs exactly once in its file.

  a. In `src/detectors/entrypoints.ts`, replace

```ts
   if(!/^\|\s*Task\s*\|\s*Command\s*\|\s*$/i.test(lines[i]!)||
```

  with

```ts
   if(fenced[i]||!/^\|\s*Task\s*\|\s*Command\s*\|\s*$/i.test(lines[i]!)||
```

  b. In `src/detectors/entrypoints.ts`, replace

```ts
/\b(test|lint|typecheck|type check|build|verify|check)\b/i
```

  with

```ts
/\b(tests?|lint|typecheck|type check|builds?|verify|checks?)\b/i
```

- [ ] 4. Run the focused test; expect exit 0 and `3 pass`. Then run the whole suite; expect `129 pass`, `0 fail`.

```sh
bun test tests/detectors/entrypoints.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
a two-column table headed Task | Command, where a row counts when its task names test, lint, typecheck, type check, build, verify, or check,
```

  with

```text
a two-column table headed Task | Command outside code fences, where a row counts when its task names test, lint, typecheck, type check, build, verify, or check (tests, builds, and checks count too),
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
只有用途含 test、lint、typecheck、type check、build、verify 或 check 的列才算驗證進入點（不分大小寫）
```

  with

```text
只有用途含 test、lint、typecheck、type check、build、verify 或 check 的列才算驗證進入點（不分大小寫；tests、builds、checks 也算，2026-11-12 補充；程式碼區塊裡的表格不讀）
```

- [ ] 7. Run the whole suite again; expect `129 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/detectors/entrypoints.test.ts src/detectors/entrypoints.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-command-table/02-plural-and-fenced.md
git commit -m '🐛 fix(detectors): read plural purposes and skip fenced Task | Command tables'
```
