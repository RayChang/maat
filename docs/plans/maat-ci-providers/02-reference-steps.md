# F02 — Keep GitLab reference steps in place and test the unknown branches

The cloud review of PR #34 (F01) left two follow-ups the owner chose to fix (2026-11-06):

1. GitLab `!reference` tags. Bun.YAML parses `script: [!reference [.setup, script], bun test]` as `[[".setup","script"],"bun test"]` (checked locally with Bun 1.4.4). `gitlabSteps` flattens it, so `.setup` and `script` become fake steps and every later step boundary shifts. Fix: do not flatten; a nested list is one unrecognized step (`command: null`, invocation `unknown`), and later steps keep their own index.
2. Untested unknown branches: GitLab `rules`, `extends`, non-boolean `allow_failure`; Bitbucket `retry`, and `on-fail` inherited from a stage or a parallel mapping. Add one test that pins them.

Owner rule: over-design is forbidden. One code token and one test. The Bitbucket `fail-fast` note (reported advisory, conservative) and the extra commit note are not changed.

## Files

- Create: None.
- Modify: `tests/detectors/ci.test.ts` (append one test), `src/detectors/ci.ts` (one anchored substring).
- Test paths: `tests/detectors/ci.test.ts`.

## Interfaces

Consumes:

```ts
// F01
export declare function ciObservations(s: ScanData, _p: Policy): Observation[];
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Write the failing test. Append exactly this to the end of `tests/detectors/ci.test.ts` (it contains `\n` inside strings; keep it byte-exact):

```ts
test("unrecognized GitLab and Bitbucket shapes stay unknown",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:".gitlab-ci.yml",text:"ref:\n  script: [!reference [.setup, script], bun test]\nruled:\n  script: [bun test]\n  rules: [{when: always}]\nextended:\n  extends: .base\n  script: [bun test]\ncodes:\n  script: [bun test]\n  allow_failure: {exit_codes: 1}\n"},
 {path:"bitbucket-pipelines.yml",text:"pipelines:\n  default:\n    - step:\n        on-fail:\n          strategy: retry\n        script:\n          - bun test\n    - stage:\n        on-fail:\n          strategy: ignore\n        steps:\n          - step:\n              script:\n                - bun test\n    - parallel:\n        on-fail:\n          strategy: ignore\n        steps:\n          - step:\n              script:\n                - bun test\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 expect(ciObservations(s,p).flatMap(o=>o.facts).filter(f=>f.claim!=="configuration").map(f=>[f.claim,f.scope.workflow,f.scope.boundary,f.claim==="invocation"?f.status:f.basis])).toEqual([["invocation",".gitlab-ci.yml","ref/0","unknown"],["consequence",".gitlab-ci.yml","ref/0","blocking"],
  ["invocation",".gitlab-ci.yml","ref/1","holds"],["consequence",".gitlab-ci.yml","ref/1","blocking"],
  ["invocation",".gitlab-ci.yml","ruled/0","holds"],["consequence",".gitlab-ci.yml","ruled/0","unknown"],
  ["invocation",".gitlab-ci.yml","extended/0","holds"],["consequence",".gitlab-ci.yml","extended/0","unknown"],
  ["invocation",".gitlab-ci.yml","codes/0","holds"],["consequence",".gitlab-ci.yml","codes/0","unknown"],
  ["invocation","bitbucket-pipelines.yml","default/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/0/0","unknown"],
  ["invocation","bitbucket-pipelines.yml","default/1/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/1/0/0","advisory"],
  ["invocation","bitbucket-pipelines.yml","default/2/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/2/0/0","advisory"]]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the new test failing on `toEqual` (the reference list is flattened into `ref/0`, `ref/1`, `ref/2`).

```sh
bun test tests/detectors/ci.test.ts
```

- [ ] 3. In `src/detectors/ci.ts`, replace

```ts
Array.isArray(job.script)?job.script.flat():[]
```

  with

```ts
Array.isArray(job.script)?job.script:[]
```

- [ ] 4. Run the focused test; expect exit 0 and 3 passing tests. Then run the whole suite; expect 0 failures (92 tests).

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
git add -- tests/detectors/ci.test.ts src/detectors/ci.ts docs/plans/maat-ci-providers/02-reference-steps.md
git commit -m '🐛 fix(ci): keep GitLab reference steps in place and pin unknown branches'
```
