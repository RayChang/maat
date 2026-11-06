# Q01 — Read Nx target tables as verification entrypoints

Two clean skill runs on fvg found every item `unknown` after the scan. A Codex research report (2026-11-06, scratchpad `nx-research/report.md`) traced the root cause: maat recognizes verification entrypoints only from a two-line `Verification command:` / `Verification purpose:` form in Markdown, which no project uses, while fvg documents its gates in `AGENTS.md` as one Nx invocation template (`bun nx run workspace:<target>`) plus a Target/Checks table, and declares those targets explicitly in `tools/workspace/project.json`. Owner decision 2026-11-06: implement the report's option 1 minimal slice.

Rule: in `AGENTS.md` or `CLAUDE.md`, a table whose header row starts with a `Target` column, preceded in the same section (since the last heading) by exactly one backticked `nx run <project>:<target>` template (optionally prefixed by bun, npx, pnpm or yarn), declares one entrypoint per row: name `<project>:<target>`, command = the template with the target substituted, purpose = the second cell. The invocation holds only when a `project.json` whose `name` is that project lists the target under `targets`; otherwise it stays `unknown` (Nx plugins may infer targets, which maat does not run). Nothing is executed and no plugin is inferred. The skill and the CLI contract now say which forms maat reads.

Measured on fvg: `foundation.verify-entrypoints` becomes verified at `{}` from four rows (`workspace:audit`, `check-architecture`, `check-decks`, `check-initial-bundle`), all explicit in `tools/workspace/project.json`. Other foundation items stay `unknown` (tests and analysis are option 2). With O01, CI verification now requires a literal CI step for each of these four commands; fvg calls them through Dagger, so it stays `unknown`.

Cloud review of PR #52 (applied): a target counts only as an own key of `targets` (`Object.hasOwn`), so a row named `constructor` or `toString` is never a declared target; tests also cover `CLAUDE.md` and a missing `project.json`. Accepted limits, not fixed: a `#` comment inside a code block above the table is taken as a heading (the template is then missed, so the result only gets more conservative), and the same table in both `AGENTS.md` and `CLAUDE.md` yields duplicate entrypoints, as the two-line form already did.

Owner rule: over-design is forbidden. No other Nx syntax, no JSONC, no plugin inference.

## Files

- Create: `tests/detectors/nx-targets.test.ts`.
- Modify: `tests/evaluate/scopes.test.ts`, `src/models.ts`, `src/detectors/entrypoints.ts`, `docs/specs/2026-11-04-maat-cli-interface.md`, `skills/maat-diagnose/SKILL.md`, `tests/skills/contracts.test.ts` (anchored edits).
- Test paths: `tests/detectors/nx-targets.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
export declare function parseConfig(m: Material, format: "json" | "toml" | "yaml"): { data: Record<string, unknown>; diagnostics: string[] };
export declare function detectedEntrypoints(s: ScanData): Entrypoint[];
export declare function entrypointObservations(s: ScanData, _p: Policy): Observation[];
```

Produces:

```ts
// src/models.ts
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; target?:string; document?:string; }
```

## Steps

- [ ] 1. Write the failing tests.

  a. Create `tests/detectors/nx-targets.test.ts` with exactly (it contains `\n` and `\"` inside strings; copy it byte-exact):

```ts
import { test,expect } from "bun:test";
import { detectedEntrypoints,entrypointObservations } from "../../src/detectors/entrypoints";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
const guide="## NX Commands\n\nWorkspace gates, all under `bun nx run workspace:<target>`:\n\n| Target | Checks |\n|---|---|\n| `check-decks` | mechanical deck checks |\n| `missing-one` | not declared in project.json |\n";
const scan=(files:{path:string;text:string}[])=>makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],
 materials:files.map(m=>({...m,sha256:sha256(m.text)}))},emptyPolicy());
const project={path:"tools/workspace/project.json",text:"{\"name\":\"workspace\",\"targets\":{\"check-decks\":{\"executor\":\"nx:run-commands\"}}}\n"};
test("an Nx target table in AGENTS.md declares verification entrypoints",()=>{
 const s=scan([{path:"AGENTS.md",text:guide},project]);
 expect(detectedEntrypoints(s).map(e=>[e.name,e.command,e.purpose,e.manifest??null])).toEqual([
  ["workspace:check-decks","bun nx run workspace:check-decks","mechanical deck checks","tools/workspace/project.json"],
  ["workspace:missing-one","bun nx run workspace:missing-one","not declared in project.json","tools/workspace/project.json"]]);
 expect(entrypointObservations(s,emptyPolicy()).filter(o=>o.detector==="policy.verify-entrypoint@1")
  .map(o=>o.facts.find(f=>f.claim==="invocation")!.status)).toEqual(["holds","unknown"]);
});
test("the table form is read only from AGENTS.md or CLAUDE.md with exactly one template",()=>{
 expect(detectedEntrypoints(scan([{path:"docs/notes.md",text:guide},project]))).toEqual([]);
 const two=guide.replace("Workspace gates","Use `nx run other:<target>` or");
 expect(detectedEntrypoints(scan([{path:"AGENTS.md",text:two},project]))).toEqual([]);
});
test("a built-in property name or a missing project file is never a declared target",()=>{
 const rows=guide.replace("| `missing-one` |","| `constructor` | built-in name |\n| `missing-one` |");
 const invocations=(s:ReturnType<typeof scan>)=>entrypointObservations(s,emptyPolicy()).filter(o=>o.detector==="policy.verify-entrypoint@1")
  .map(o=>o.facts.find(f=>f.claim==="invocation")!.status);
 expect(invocations(scan([{path:"CLAUDE.md",text:rows},project]))).toEqual(["holds","unknown","unknown"]);
 const alone=scan([{path:"AGENTS.md",text:guide}]);
 expect(detectedEntrypoints(alone).map(e=>e.manifest??null)).toEqual([null,null]);
 expect(invocations(alone)).toEqual(["unknown","unknown"]);
});
```

  b. In `tests/skills/contracts.test.ts`, replace

```text
 expect(diagnose).toContain("Run maat help for every command and flag");
```

  with

```text
 expect(diagnose).toContain("Run maat help for every command and flag");
 expect(diagnose).toContain("maat finds verification entrypoints in two forms");
```

  c. Also from the PR #51 review: `tests/evaluate/scopes.test.ts` passes only because `toEqual` ignores a trailing `undefined` (the new project-scope CI observation has no boundary). In `tests/evaluate/scopes.test.ts`, replace

```text
 expect(ci.observations.filter(o=>o.detector==="ci.step-invokes-entrypoint@1").map(o=>o.scope.boundary)).toEqual(["publish/0","test/0"]);
```

  with

```text
 expect(ci.observations.filter(o=>o.detector==="ci.step-invokes-entrypoint@1"&&o.scope.boundary).map(o=>o.scope.boundary)).toStrictEqual(["publish/0","test/0"]);
```

- [ ] 2. Run the focused tests; expect exit 1: the first and third tests in `nx-targets.test.ts` fail (no entrypoint is detected yet; the second test already passes) and the new `toContain` in `contracts.test.ts` fails.

```sh
bun test tests/detectors/nx-targets.test.ts tests/skills/contracts.test.ts
```

- [ ] 3. Implement with these anchored edits, each anchor occurring exactly once. Change nothing else. Blocks contain regexes with backslashes, quotes and `\n`; copy them byte-exact.

  a. In `src/models.ts`, replace

```text
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; document?:string; }
```

  with

```text
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; target?:string; document?:string; }
```

  b. In `src/detectors/entrypoints.ts`, replace

```text
   ...(script?{manifest:"package.json",script}:{})});
 }
 return out;
}
```

  with

```text
   ...(script?{manifest:"package.json",script}:{})});
 }
 const projects=new Map<string,string>();
 for(const m of s.materials.filter(x=>/(^|\/)project\.json$/.test(x.path))) {
  const name=parseConfig(m,"json").data.name;
  if(typeof name==="string")projects.set(name,m.path);
 }
 for(const m of s.materials.filter(x=>/(^|\/)(AGENTS|CLAUDE)\.md$/.test(x.path))) {
  const lines=m.text.split("\n");
  for(let i=0;i<lines.length;i++) {
   if(!/^\|\s*Target\s*\|[^|]+\|\s*$/.test(lines[i]!)||!/^\|[-\s|:]+\|\s*$/.test(lines[i+1]??""))continue;
   let j=i-1;while(j>=0&&!lines[j]!.startsWith("#"))j--;
   const templates=[...lines.slice(j+1,i).join("\n").matchAll(/`((?:bun |npx |pnpm |yarn )?nx run ([A-Za-z0-9_.@\/-]+):<target>)`/g)];
   if(templates.length!==1)continue;
   const [,template,project]=templates[0]!,manifest=projects.get(project!);
   for(let k=i+2;k<lines.length&&lines[k]!.startsWith("|");k++) {
    const row=/^\|\s*`([A-Za-z0-9:_.-]+)`\s*\|(.+)\|\s*$/.exec(lines[k]!);
    if(!row||!row[2]!.trim())continue;
    out.push({name:project+":"+row[1],command:template!.replace("<target>",row[1]!),purpose:row[2]!.trim(),scope:{},document:m.path,
     target:row[1]!,...(manifest?{manifest}:{})});
   }
  }
 }
 return out;
}
```

  c. In `src/detectors/entrypoints.ts`, replace

```text
    invocation=parsed.diagnostics.length?"unknown":typeof scripts?.[e.script]==="string"?"holds":s.scope.complete?"fails":"unknown";
   }
  }
```

  with

```text
    invocation=parsed.diagnostics.length?"unknown":typeof scripts?.[e.script]==="string"?"holds":s.scope.complete?"fails":"unknown";
   }
  }
  else if(e.target) {
   const targets=manifest?parseConfig(manifest,"json").data.targets as Record<string,unknown>|undefined:undefined;
   invocation=targets&&typeof targets==="object"&&Object.hasOwn(targets,e.target)?"holds":"unknown";
  }
```

  d. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
### 3.2 `maat evaluate`
```

  with

```text
驗證進入點的宣告形式（2026-11-06 補充）：任一 Markdown 檔的 `Verification command: <指令>` 與 `Verification purpose: <用途>` 兩行；或在 `AGENTS.md`、`CLAUDE.md` 的某一節寫一個 `nx run <專案>:<target>` 指令範本（例如 `` `bun nx run workspace:<target>` ``），後面接一張第一欄標題為 `Target` 的表格，每列是 `` `目標名` `` 與用途。表格裡的目標要在同名 Nx 專案的 `project.json` 明列，叫用才成立；外掛自動產生的目標不推斷，維持 `unknown`。

### 3.2 `maat evaluate`
```

  e. In `skills/maat-diagnose/SKILL.md`, replace

```text
Run maat help for every command and flag. maat catalog list lists the item ids.
```

  with

```text
Run maat help for every command and flag. maat catalog list lists the item ids.
maat finds verification entrypoints in two forms: the lines "Verification command: ..." and "Verification purpose: ..." in a Markdown file, or, in AGENTS.md or CLAUDE.md, one `nx run <project>:<target>` template in a section followed by a table whose first column is Target. If the project declares its checks another way, attest them.
```

- [ ] 4. Run the focused tests; expect exit 0. Then run the whole suite; expect 0 failures (105 tests).

```sh
bun test tests/detectors/nx-targets.test.ts tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/detectors/nx-targets.test.ts tests/skills/contracts.test.ts tests/evaluate/scopes.test.ts src/models.ts src/detectors/entrypoints.ts docs/specs/2026-11-04-maat-cli-interface.md skills/maat-diagnose/SKILL.md docs/plans/maat-nx-targets/01-nx-targets.md
git commit -m '✨ feat(detectors): read Nx target tables as verification entrypoints'
```
