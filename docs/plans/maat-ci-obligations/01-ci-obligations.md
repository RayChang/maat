# O01 — CI verification holds only when every declared entrypoint has a literal CI step

M01 made `foundation.ci-verification` hold when any one CI step literally invokes a declared verification entrypoint. A research review (Codex, 2026-11-06) pointed out that this contradicts the frozen catalog: the item's `invocation` claim requires "每個指定 CI 驗證義務，都有步驟對應其宣告的進入點；不是任一成功步驟代表全部", and `partial` is for "至少一項指定叫用已確認，其餘缺少或未知". Owner decision 2026-11-06: follow the catalog. Each declared verification entrypoint (from `detectedEntrypoints`) is one obligation. The CI detector keeps its per-step observations but marks the per-step invocation facts as signals, and adds one project-scope fact: `invocation` holds only when there is at least one declared entrypoint and every one of them has a literal CI step; otherwise `unknown`, with a basis listing matched and unmatched commands. A per-obligation `partial` would need sub-claims and is not supported yet; a partial match stays `unknown` (never a pass).

Owner rule: over-design is forbidden. Change only the CI detector, its tests, and the contract sentence M01 added.

## Files

- Create: None.
- Modify: `tests/detectors/ci.test.ts`, `src/detectors/ci.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/detectors/ci.test.ts`.

## Interfaces

Consumes:

```ts
export declare function ciObservations(s: ScanData, _p: Policy): Observation[];   // src/detectors/ci.ts
export declare function detectedEntrypoints(s: ScanData): Entrypoint[];          // src/detectors/entrypoints.ts
// Fact: { subject; claim; status; scope; basis; complete; signal?: boolean }; signal facts never decide a claim (src/evaluate/truth.ts)
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Update and add tests in `tests/detectors/ci.test.ts`.

  a. In `tests/detectors/ci.test.ts`, replace

```text
["invocation","bitbucket-pipelines.yml","branches/main/0/0/0","unknown"],["consequence","bitbucket-pipelines.yml","branches/main/0/0/0","blocking"]]);
```

  with

```text
["invocation","bitbucket-pipelines.yml","branches/main/0/0/0","unknown"],["consequence","bitbucket-pipelines.yml","branches/main/0/0/0","blocking"],
  ["invocation",undefined,undefined,"holds"]]);
```

  b. In `tests/detectors/ci.test.ts`, replace

```text
["invocation","bitbucket-pipelines.yml","default/2/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/2/0/0","advisory"]]);
```

  with

```text
["invocation","bitbucket-pipelines.yml","default/2/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/2/0/0","advisory"],
  ["invocation",undefined,undefined,"holds"]]);
```

  c. Append exactly this to the end of `tests/detectors/ci.test.ts` (it contains `\n` inside strings; copy it byte-exact):

```ts
test("CI holds only when every declared verification entrypoint has a literal step",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:"docs/lint.md",text:"Verification command: biome check\nVerification purpose: static analysis\n"},
 {path:".gitlab-ci.yml",text:"test:\n  script: [bun test]\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const summary=()=>ciObservations(s,p).flatMap(o=>o.facts).find(f=>f.claim==="invocation"&&!f.scope.workflow)!;
 expect(summary().status).toBe("unknown");
 expect(summary().basis).toBe("matched: bun test; unmatched: biome check");
 s.materials[2]!.text+="lint:\n  script: [biome check]\n";
 expect(summary().status).toBe("holds");
});
```

- [ ] 2. Run the focused test; expect exit 1: the two updated tests fail (the project-scope summary fact does not exist yet) and the new last test fails.

```sh
bun test tests/detectors/ci.test.ts
```

- [ ] 3. Implement with these anchored edits, each anchor occurring exactly once. Change nothing else. Blocks contain quotes and backslashes; copy them byte-exact.

  a. In `src/detectors/ci.ts`, replace

```text
import type { ScanData,Policy,Observation,Fact } from "../models";
```

  with

```text
import type { ScanData,Policy,Observation,Fact,Material } from "../models";
```

  b. In `src/detectors/ci.ts`, replace

```text
 const out:Observation[]=[],entries=detectedEntrypoints(s);
```

  with

```text
 const out:Observation[]=[],entries=detectedEntrypoints(s),ci:Material[]=[],matched=new Set<string>();
```

  c. In `src/detectors/ci.ts`, replace

```text
  if(!provider)continue;
```

  with

```text
  if(!provider)continue;
  ci.push(m);
```

  d. In `src/detectors/ci.ts`, replace

```text
   const status:Fact["status"]=literal&&entry?"holds":"unknown";
```

  with

```text
   const status:Fact["status"]=literal&&entry?"holds":"unknown";
   if(status==="holds")matched.add(step.command!);
```

  e. In `src/detectors/ci.ts`, replace

```text
basis:step.command??"Unrecognized step",complete:status==="holds"}],
```

  with

```text
basis:step.command??"Unrecognized step",complete:status==="holds",signal:true}],
```

  f. In `src/detectors/ci.ts`, replace

```text
    ["Configured failure consequence only"]));
  }
 }
 return out;
}
```

  with

```text
    ["Configured failure consequence only"]));
  }
 }
 if(ci.length) {
  const missing=entries.filter(e=>!matched.has(e.command)).map(e=>e.command);
  const status:Fact["status"]=entries.length&&!missing.length?"holds":"unknown";
  const basis=entries.length?"matched: "+([...matched].join(", ")||"none")+"; unmatched: "+(missing.join(", ")||"none"):"No declared verification entrypoint";
  out.push(observe("ci.step-invokes-entrypoint@1",[...ci,...s.materials.filter(x=>entries.some(e=>e.document===x.path))],{},
   [{subject:"foundation.ci-verification",claim:"invocation",status,scope:{},basis,complete:status==="holds"}],
   ["Every declared verification entrypoint needs a literal CI step; a partial match stays unknown"]));
 }
 return out;
}
```

  g. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
持續整合這題只要有一個步驟字面呼叫已宣告的驗證指令即成立（2026-11-06 補充）
```

  with

```text
持續整合這題要每個已宣告的驗證指令都有 CI 步驟字面呼叫才成立，只對上部分時為 `unknown` 並列出已對上與未對上的指令；catalog 的 partial 需要逐項子主張，目前未支援（2026-11-06 修訂，依 catalog `foundation.ci-verification` 的 invocation 規定）
```

- [ ] 4. Run the focused test; expect exit 0. Then run the whole suite; expect 0 failures (102 tests).

```sh
bun test tests/detectors/ci.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/detectors/ci.test.ts src/detectors/ci.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-ci-obligations/01-ci-obligations.md
git commit -m '🐛 fix(ci): require a CI step for every declared verification entrypoint'
```
