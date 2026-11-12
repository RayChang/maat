# S01 — Read one level into a CI step that runs a repository shell script

Lottery run 3 (2026-11-11): lottery's `.github/workflows/test.yml` runs its tests with `run: bash .github/scripts/run-vitest-with-retry.sh`, and that script runs `bun run test` on the line `  if bun run test 2>&1 | tee /tmp/test-output.txt; then`. maat compares the step text with the declared commands only, so `bun run test` was listed as unmatched and the owner had to attest the CI invocation by hand.

Rules of the change (all CI providers, because it works on the step command):
- A step whose whole command is `bash <path>.sh`, `sh <path>.sh`, `./<path>.sh`, or `<path>.sh` (path made of letters, digits, `_ . / -`) and whose script is a scanned material is read one level deep.
- A declared command counts when it starts a line of that script after trimming, optionally after the shell words `if`, `then`, `else`, `elif`, `do`, `while`, `until`, `exec`, or `!`, and is followed by the end of the line, a space, `;`, `|`, `&`, or `)`. Comments and `echo "..."` lines do not count.
- The step's fact then holds, its basis reads `<step> runs <command>, <command>`, its evidence adds the script (so a later script change makes attestations stale like any other material), and it gets one more limit text.
- A step whose script is not scanned, or whose script does not start a line with a declared command, stays unknown with the old basis.

Measured on a lottery copy without the ci-verification attestation: `bun run test` moves from unmatched to matched. The item stays unknown because AGENTS.md also declares `bun vitest run`, `bun run test:unit`, and `bun run test:integration`, which CI does not run directly; that is the intended strict rule. With the confirmed policy the counts stay 8 verified / 4 partial / 1 unknown.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/detectors/ci.test.ts` (append), `src/detectors/ci.ts`, `tests/skills/contracts.test.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/detectors/ci.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
export declare function ciObservations(s:ScanData,_p:Policy):Observation[]; // src/detectors/ci.ts
export declare function detectedEntrypoints(s:ScanData):Entrypoint[]; // src/detectors/entrypoints.ts
```

Produces: None (behavior only; the two new helpers in `src/detectors/ci.ts` are not exported).

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/detectors/ci.test.ts` (the file ends with a newline; add nothing else):

```ts
test("a step that runs a repository shell script counts the declared commands at the start of its lines",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:".github/workflows/ci.yml",text:"jobs:\n  test:\n    steps:\n      - run: bash scripts/ci.sh\n      - run: ./scripts/ci.sh\n      - run: bash scripts/echo.sh\n      - run: bash scripts/missing.sh\n"},
 {path:"scripts/ci.sh",text:"#!/usr/bin/env bash\nset -euo pipefail\n# bun test runs below\nif bun test 2>&1 | tee out.txt; then\n  echo ok\nfi\n"},
 {path:"scripts/echo.sh",text:"echo \"bun test\"\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const steps=ciObservations(s,p).filter(o=>o.detector==="ci.step-invokes-entrypoint@1"&&o.scope.workflow);
 expect(steps.map(o=>[o.scope.boundary,o.facts[0]!.status,o.facts[0]!.basis,o.evidence.map(e=>e.path)])).toEqual([
  ["test/0","holds","bash scripts/ci.sh runs bun test",[".github/workflows/ci.yml","scripts/ci.sh","AGENTS.md"]],
  ["test/1","holds","./scripts/ci.sh runs bun test",[".github/workflows/ci.yml","scripts/ci.sh","AGENTS.md"]],
  ["test/2","unknown","bash scripts/echo.sh",[".github/workflows/ci.yml","scripts/echo.sh"]],
  ["test/3","unknown","bash scripts/missing.sh",[".github/workflows/ci.yml"]]]);
 expect(steps[0]!.limits).toContain("Wrapper script read one level deep; a declared command counts only at the start of a script line");
 expect(ciObservations(s,p).flatMap(o=>o.facts).find(f=>f.claim==="invocation"&&!f.scope.workflow)!.status).toBe("holds");
});
```

- [ ] 2. Run the focused test; expect exit 1 with `4 pass`, `1 fail`: the script is not read yet, so the first step stays unknown.

```sh
bun test tests/detectors/ci.test.ts
```

- [ ] 3. Implement. Make these 2 edits. Each "replace" text occurs exactly once in its file.

  a. In `src/detectors/ci.ts`, replace

```ts
export function ciObservations(s:ScanData,_p:Policy):Observation[] {
```

  with

```ts
// A step like `bash scripts/ci.sh` or `./scripts/ci.sh` runs a repository script; read that script one level deep.
function wrapper(s:ScanData,command:string):Material|undefined {
 const path=/^(?:(?:bash|sh)\s+)?(?:\.\/)?([A-Za-z0-9_.\/-]+\.sh)$/.exec(command)?.[1];
 return path?s.materials.find(m=>m.path===path):undefined;
}
// The declared command must start a script line, after optional shell keywords (if, then, do, exec, !).
function invokes(text:string,command:string):boolean {
 const escaped=command.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const line=new RegExp("^(?:(?:if|then|else|elif|do|while|until|exec|!)\\s+)*"+escaped+"(?=$|[\\s;|&)])");
 return text.split("\n").some(l=>line.test(l.trim()));
}
export function ciObservations(s:ScanData,_p:Policy):Observation[] {
```

  b. In `src/detectors/ci.ts`, replace

```ts
   const entry=entries.find(e=>e.command===step.command);
   const literal=!!step.command&&!/[\n\r;&|$<>`]/.test(step.command)&&!step.remote;
   const status:Fact["status"]=literal&&entry?"holds":"unknown";
   if(status==="holds")matched.add(step.command!);
   out.push(observe("ci.step-invokes-entrypoint@1",[m,...s.materials.filter(x=>x.path===entry?.document)],scope,
    [{subject:"foundation.ci-verification",claim:"invocation",status,scope,basis:step.command??"Unrecognized step",complete:status==="holds",signal:true}],
    ["Exact declared invocation only; execution and remote gating unobserved"]));
```

  with

```ts
   const entry=entries.find(e=>e.command===step.command);
   const literal=!!step.command&&!/[\n\r;&|$<>`]/.test(step.command)&&!step.remote;
   const script=literal&&!entry?wrapper(s,step.command!):undefined;
   const invoked=entry?[entry]:script?entries.filter(e=>invokes(script.text,e.command)):[];
   const status:Fact["status"]=literal&&invoked.length?"holds":"unknown";
   if(status==="holds")for(const e of invoked)matched.add(e.command);
   out.push(observe("ci.step-invokes-entrypoint@1",[m,...(script?[script]:[]),...s.materials.filter(x=>invoked.some(e=>e.document===x.path))],scope,
    [{subject:"foundation.ci-verification",claim:"invocation",status,scope,
     basis:script&&invoked.length?step.command+" runs "+invoked.map(e=>e.command).join(", "):step.command??"Unrecognized step",complete:status==="holds",signal:true}],
    ["Exact declared invocation only; execution and remote gating unobserved",
     ...(script?["Wrapper script read one level deep; a declared command counts only at the start of a script line"]:[])]));
```

- [ ] 4. Run the focused test; expect exit 0 and `5 pass`. Then run the whole suite; expect `126 pass`, `0 fail`.

```sh
bun test tests/detectors/ci.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill, the spec, and the skill's contract test. Make these 3 edits; each "replace" text occurs exactly once in its file.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
foundation.ci-verification needs a literal CI step for every declared verification entrypoint;
```

  with

```text
foundation.ci-verification needs a literal CI step for every declared verification entrypoint; a step that runs a repository shell script (`bash path.sh`, `sh path.sh`, or `./path.sh`) counts each declared command that starts a line of that script;
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
`include`、`extends`、`rules`、遠端 action 與包裝指令（例如 `dagger call`）不追蹤，對應主張為 `unknown`。
```

  with

```text
`include`、`extends`、`rules`、遠端 action 與包裝指令（例如 `dagger call`）不追蹤，對應主張為 `unknown`。例外（2026-11-12 補充）：步驟是 `bash <路徑>.sh`、`sh <路徑>.sh` 或 `./<路徑>.sh`，而且該腳本在掃描範圍內時，往下讀一層；已宣告的驗證指令出現在腳本某一行的開頭（前面可以有 `if`、`then`、`do`、`exec`、`!` 這類關鍵字）才算叫用，註解與 `echo` 不算。
```

  c. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("a two-column table headed Task | Command");
```

  with

```ts
 expect(diagnose).toContain("a two-column table headed Task | Command");
 expect(diagnose).toContain("a step that runs a repository shell script");
```

- [ ] 7. Run the whole suite again; expect `126 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/detectors/ci.test.ts src/detectors/ci.ts tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-ci-wrapper/01-ci-wrapper-script.md
git commit -m '✨ feat(detectors): read one level into a CI step that runs a shell script'
```
