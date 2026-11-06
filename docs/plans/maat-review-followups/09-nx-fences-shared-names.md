# E09 — Nx table reader: code-block comments and shared project names

Two items the PR #54 review marked acceptable; the owner chose to fix them anyway because the fixes are small (2026-11-07).

1. The section search for the Nx template stops at any line starting with `#`, including a shell comment inside a fenced code block between the template and the table, so the template is missed. Skip lines inside fenced code blocks (` ``` ` or `~~~`) when looking for the section heading.
2. When two `project.json` files share one `name`, the later one silently replaced the earlier. Treat such a project as unresolved: no manifest, invocation `unknown`, and the observation states why in its limits.

Measured: fvg keeps its four verified entrypoints. 107 tests pass.

Owner rule: over-design is forbidden. Six small anchored edits, one test, one contract sentence.

## Files

- Create: None.
- Modify: `tests/detectors/nx-targets.test.ts` (append one test), `src/detectors/entrypoints.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/detectors/nx-targets.test.ts`.

## Interfaces

Consumes:

```ts
export declare function detectedEntrypoints(s: ScanData): Entrypoint[];
export declare function entrypointObservations(s: ScanData, _p: Policy): Observation[];
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Append exactly this to the end of `tests/detectors/nx-targets.test.ts` (it contains `\n` and triple backticks inside strings; copy it byte-exact):

````ts
test("a code-block comment is not a heading, and a shared project name checks nothing",()=>{
 const fencedGuide=guide.replace("| Target |","```sh\n# run a gate\n```\n\n| Target |");
 expect(detectedEntrypoints(scan([{path:"AGENTS.md",text:fencedGuide},project])).map(e=>e.name)).toEqual(["workspace:check-decks","workspace:missing-one"]);
 const twin={path:"apps/other/project.json",text:project.text};
 const obs=entrypointObservations(scan([{path:"AGENTS.md",text:guide},project,twin]),emptyPolicy()).filter(o=>o.detector==="policy.verify-entrypoint@1");
 expect(obs.map(o=>o.facts.find(f=>f.claim==="invocation")!.status)).toEqual(["unknown","unknown"]);
 expect(obs[0]!.limits).toContain("No unique project.json declares this Nx project; target not checked");
});
````

- [ ] 2. Run the focused test; expect exit 1 with the new test failing (the fenced comment hides the template, so no entrypoint is found).

```sh
bun test tests/detectors/nx-targets.test.ts
```

- [ ] 3. Implement with these anchored edits, each anchor occurring exactly once. Change nothing else. Blocks contain regexes, backticks and `\n`; copy them byte-exact.

  a. In `src/detectors/entrypoints.ts`, replace

```text
 const projects=new Map<string,string>();
```

  with

```text
 const projects=new Map<string,string>(),shared=new Set<string>();
```

  b. In `src/detectors/entrypoints.ts`, replace

```text
  if(typeof name==="string")projects.set(name,m.path);
```

  with

```text
  if(typeof name==="string"){if(projects.has(name))shared.add(name);projects.set(name,m.path);}
```

  c. In `src/detectors/entrypoints.ts`, replace

```text
  const lines=m.text.split("\n");
```

  with

````text
  const lines=m.text.split("\n");
  let open=false;const fenced=lines.map(l=>{const edge=/^\s*(```|~~~)/.test(l),inside=open||edge;if(edge)open=!open;return inside;});
````

  d. In `src/detectors/entrypoints.ts`, replace

```text
   let j=i-1;while(j>=0&&!lines[j]!.startsWith("#"))j--;
```

  with

```text
   let j=i-1;while(j>=0&&!(lines[j]!.startsWith("#")&&!fenced[j]))j--;
```

  e. In `src/detectors/entrypoints.ts`, replace

```text
manifest=projects.get(project!);
```

  with

```text
manifest=shared.has(project!)?undefined:projects.get(project!);
```

  f. In `src/detectors/entrypoints.ts`, replace

```text
  out.push(observe("policy.verify-entrypoint@1",refs,e.scope,facts,["Explicit document declaration; never executed"]));
```

  with

```text
  out.push(observe("policy.verify-entrypoint@1",refs,e.scope,facts,["Explicit document declaration; never executed",
   ...(e.target&&!manifest?["No unique project.json declares this Nx project; target not checked"]:[])]));
```

  g. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
表格列多於兩格時整列略過。
```

  with

```text
表格列多於兩格時整列略過。程式碼區塊裡以 `#` 開頭的行不算章節標題；有兩個以上 `project.json` 使用同一個 `name` 時，該專案的目標一律不核對，維持 `unknown`，觀察附上說明。
```

- [ ] 4. Run the focused test; expect exit 0 and 5 passing tests. Then run the whole suite; expect 0 failures (107 tests).

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
git add -- tests/detectors/nx-targets.test.ts src/detectors/entrypoints.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-review-followups/09-nx-fences-shared-names.md
git commit -m '🐛 fix(detectors): ignore code-block comments and shared Nx project names'
```
