# Q01 — Read a Task | Command table as verification entrypoints

Lottery run 3 (2026-11-11): lottery's AGENTS.md lists its checks in a "Build & Run" table headed `| Task | Command |` (for example `| Test (all, preferred) | \`bun run test\` |`). maat reads only the `Verification command:` lines and the Nx `Target` table, so foundation.verify-entrypoints stayed unknown and the owner had to attest the commands by hand. Owner decision (2026-11-11): read this table form too.

Rules of the new form (AGENTS.md or CLAUDE.md only):
- A two-column table whose header is `Task | Command` (any spacing or case), followed by a separator row.
- The first column is the purpose; the command is the first backquoted text in the second column.
- A row counts only when its purpose contains test, lint, typecheck, type check, build, verify, or check (case-insensitive); rows such as dev server or format are skipped.
- `bun|npm|pnpm|yarn run <script>` binds to that script in the root package.json, exactly like a `Verification command:` line.

Measured on the lottery copy without the verify-entrypoints attestation: the result goes from unknown to verified, and with the confirmed policy the counts stay 8 verified / 4 partial / 1 unknown.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/detectors/entrypoints.test.ts` (append), `src/detectors/entrypoints.ts`, `tests/skills/contracts.test.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/detectors/entrypoints.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
export declare function detectedEntrypoints(s:ScanData):Entrypoint[]; // src/detectors/entrypoints.ts
export declare function entrypointObservations(s:ScanData,_p:Policy):Observation[]; // src/detectors/entrypoints.ts
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/detectors/entrypoints.test.ts` (the file ends with a newline; add nothing else):

```ts
test("a Task | Command table in AGENTS.md declares the verification rows",()=>{
 const p=emptyPolicy(),table=["## Build & Run","","| Task | Command |","| ---- | ------- |","| Dev server | `bun run dev` |",
  "| Build | `bun run build` (see pitfall #27) |","| Format | `bun run format` |","| Test (unit) | `bun run test:unit` |","| Type check | `bun vitest typecheck` |",""].join("\n");
 const materials=[{path:"AGENTS.md",text:table},{path:"package.json",text:'{"scripts":{"dev":"next dev","build":"next build","format":"prettier -w ."}}'}]
  .map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 expect(detectedEntrypoints(s).map(e=>[e.name,e.purpose,e.command])).toEqual([["build","Build","bun run build"],
  ["test:unit","Test (unit)","bun run test:unit"],["bun vitest typecheck","Type check","bun vitest typecheck"]]);
 expect(entrypointObservations(s,p).flatMap(o=>o.facts).filter(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="invocation").map(f=>f.status))
  .toEqual(["holds","fails","holds"]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with `1 pass`, `1 fail`: no entrypoint is found in the table yet.

```sh
bun test tests/detectors/entrypoints.test.ts
```

- [ ] 3. Implement. Make this 1 edit. The "replace" text occurs exactly once in its file.

  a. In `src/detectors/entrypoints.ts`, replace

```ts
  }
 }
 return out;
}
export function entrypointObservations
```

  with

```ts
  }
  for(let i=0;i<lines.length;i++) {
   if(!/^\|\s*Task\s*\|\s*Command\s*\|\s*$/i.test(lines[i]!)||!/^\|[-\s|:]+\|\s*$/.test(lines[i+1]??""))continue;
   for(let k=i+2;k<lines.length&&lines[k]!.startsWith("|");k++) {
    const row=/^\|([^|]+)\|([^|]+)\|\s*$/.exec(lines[k]!),purpose=row?.[1]!.trim(),command=/`([^`]+)`/.exec(row?.[2]??"")?.[1]?.trim();
    if(!purpose||!command||!/\b(test|lint|typecheck|type check|build|verify|check)\b/i.test(purpose))continue;
    const script=/^(?:bun|npm|pnpm|yarn) run ([a-zA-Z0-9:_-]+)$/.exec(command)?.[1];
    out.push({name:script??command,command,purpose,scope:{},document:m.path,...(script?{manifest:"package.json",script}:{})});
   }
  }
 }
 return out;
}
export function entrypointObservations
```

- [ ] 4. Run the focused test; expect exit 0 and `2 pass`. Then run the whole suite; expect `124 pass`, `0 fail`.

```sh
bun test tests/detectors/entrypoints.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill, its contract test, and the spec. Make these 3 edits; each "replace" text occurs exactly once in its file.

  a. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("maat finds verification entrypoints in two forms");
```

  with

```ts
 expect(diagnose).toContain("maat finds verification entrypoints in three forms");
 expect(diagnose).toContain("a two-column table headed Task | Command");
```

  b. In `skills/maat-diagnose/SKILL.md`, replace

```text
maat finds verification entrypoints in two forms: the lines "Verification command: ..." and "Verification purpose: ..." in a Markdown file, or, in AGENTS.md or CLAUDE.md, one `nx run <project>:<target>` template in a section followed by a table whose first column is Target.
```

  with

```text
maat finds verification entrypoints in three forms: the lines "Verification command: ..." and "Verification purpose: ..." in a Markdown file; in AGENTS.md or CLAUDE.md, one `nx run <project>:<target>` template in a section followed by a table whose first column is Target; or, in AGENTS.md or CLAUDE.md, a two-column table headed Task | Command, where a row counts when its task names test, lint, typecheck, type check, build, verify, or check, and its command is the first backquoted text in the second column.
```

  c. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
表格列多於兩格時整列略過。程式碼區塊裡以 `#` 開頭的行不算章節標題；
```

  with

```text
表格列多於兩格時整列略過。另一種形式（2026-11-11 補充）：`AGENTS.md`、`CLAUDE.md` 裡表頭為 `Task | Command` 的兩欄表格，第一欄是用途、第二欄第一段反引號文字是指令；只有用途含 test、lint、typecheck、type check、build、verify 或 check 的列才算驗證進入點（不分大小寫），其餘如 dev server、format 略過；指令是 `bun|npm|pnpm|yarn run <script>` 時，叫用要在根目錄 `package.json` 明列。程式碼區塊裡以 `#` 開頭的行不算章節標題；
```

- [ ] 7. Run the whole suite again; expect `124 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/detectors/entrypoints.test.ts src/detectors/entrypoints.ts tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-command-table/01-task-command-table.md
git commit -m '✨ feat(detectors): read a Task | Command table as verification entrypoints'
```
