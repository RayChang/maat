# F01 — Read GitLab CI and Bitbucket Pipelines like GitHub Actions

Diagnosing alibi and fvg showed that `foundation.ci-verification` (a required item in the standard policy) can never pass for GitLab projects: discovery skips root dot files, so `.gitlab-ci.yml` is never a material and cannot even be cited in an attestation, and the CI detectors only parse `.github/workflows/*.yml`. Owner decision 2026-11-06: support GitHub Actions, GitLab CI and Bitbucket Pipelines.

What changes:

- Discovery reads the root file `.gitlab-ci.yml` and the hidden directory `.gitlab/` (common home of included CI files; read so they can be cited). `bitbucket-pipelines.yml` is not a dot file and is already read.
- `src/detectors/ci.ts` keeps the GitHub logic unchanged and adds two readers that produce the same per-step observations (`ci.step-invokes-entrypoint@1`, `ci.failure-consequence@1`, scope `{workflow, boundary, evaluator:"command"}`).
  - GitLab (docs.gitlab.com/ci/yaml, checked 2026-11-06): every top-level mapping is a job except global keywords (`default include stages variables workflow spec` and the deprecated globals `image services cache before_script after_script`) and hidden jobs whose name starts with `.`. Each `script` line is a step. Consequence: `allow_failure: true` is advisory; `when: manual` without `allow_failure` defaults to advisory; a job with `rules`, `extends` or a non-boolean `allow_failure` is unknown (those can change the result and are not followed); otherwise blocking.
  - Bitbucket (support.atlassian.com/bitbucket-cloud/docs/step-options, checked 2026-11-06): `pipelines.default` is a list; `branches`, `pull-requests`, `tags` and `custom` map names to lists. Items are `step`, `parallel` (a list, or a mapping with `steps`) and `stage` (with `steps`). Each string `script` line is a step; pipes are unrecognized. Consequence: `on-fail.strategy` on the step, or inherited from its parallel group or stage: absent or `fail` is blocking, `ignore` is advisory, anything else (`retry`) is unknown.
- Detector ids and versions stay `@1`: their catalog contracts are provider-neutral, and catalog 0.1.0 is not changed.

Owner rule: over-design is forbidden. No include/extends resolution, no other providers, no new detectors.

## Files

- Create: None.
- Modify: `tests/detectors/ci.test.ts`, `tests/discovery/inventory.test.ts` (append one test each), `src/detectors/ci.ts` (complete file), `src/discovery/inventory.ts` (two anchored lines), `docs/specs/2026-11-04-maat-cli-interface.md` (one anchored insertion).
- Test paths: `tests/detectors/ci.test.ts`, `tests/discovery/inventory.test.ts`.

## Interfaces

Consumes:

```ts
// existing, unchanged
export declare function observe(detector: string, materials: Material[], scope?: Scope, facts?: Fact[], limits?: string[], diagnostics?: string[]): Observation;
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
export declare function parseConfig(m: Material, format: "json" | "toml" | "yaml"): { data: Record<string, unknown>; diagnostics: string[] };
export declare function detectedEntrypoints(s: ScanData): Entrypoint[];
export declare function discover(input: string, scope: Policy["scope"]): Promise<Inventory>;
```

Produces:

```ts
// src/detectors/ci.ts (signature unchanged)
export function ciObservations(s: ScanData, _p: Policy): Observation[];
```

## Steps

- [ ] 1. Write the failing tests.

  a. Append exactly this to the end of `tests/detectors/ci.test.ts`:

```ts
test("GitLab and Bitbucket steps are read like GitHub steps",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:".gitlab-ci.yml",text:"stages: [verify]\n.template:\n  script: [bun test]\ntest:\n  stage: verify\n  script:\n    - bun test\nlint:\n  script: bun test\n  allow_failure: true\nmanual:\n  script: [bun test]\n  when: manual\n"},
 {path:"bitbucket-pipelines.yml",text:"pipelines:\n  default:\n    - step:\n        script:\n          - bun test\n    - parallel:\n        - step:\n            on-fail:\n              strategy: ignore\n            script:\n              - bun test\n  branches:\n    main:\n      - stage:\n          steps:\n            - step:\n                script:\n                  - bun test && echo ok\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const obs=ciObservations(s,p);
 expect(obs.filter(o=>o.detector==="ci-config-found@1").map(o=>o.evidence[0]!.path)).toEqual([".gitlab-ci.yml","bitbucket-pipelines.yml"]);
 expect(obs.flatMap(o=>o.facts).filter(f=>f.claim!=="configuration").map(f=>[f.claim,f.scope.workflow,f.scope.boundary,f.claim==="invocation"?f.status:f.basis])).toEqual([
  ["invocation",".gitlab-ci.yml","test/0","holds"],["consequence",".gitlab-ci.yml","test/0","blocking"],
  ["invocation",".gitlab-ci.yml","lint/0","holds"],["consequence",".gitlab-ci.yml","lint/0","advisory"],
  ["invocation",".gitlab-ci.yml","manual/0","holds"],["consequence",".gitlab-ci.yml","manual/0","advisory"],
  ["invocation","bitbucket-pipelines.yml","default/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/0/0","blocking"],
  ["invocation","bitbucket-pipelines.yml","default/1/0/0","holds"],["consequence","bitbucket-pipelines.yml","default/1/0/0","advisory"],
  ["invocation","bitbucket-pipelines.yml","branches/main/0/0/0","unknown"],["consequence","bitbucket-pipelines.yml","branches/main/0/0/0","blocking"]]);
});
```

  b. Append exactly this to the end of `tests/discovery/inventory.test.ts`:

```ts
test("reads GitLab and Bitbucket CI files but no other dot files",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-discovery-ci-"));
 try{
  await mkdir(join(root,".gitlab/ci"),{recursive:true});
  await writeFile(join(root,".gitlab-ci.yml"),"test:\n  script: [bun test]\n");
  await writeFile(join(root,".gitlab/ci/verify.yml"),"verify:\n  script: [bun test]\n");
  await writeFile(join(root,"bitbucket-pipelines.yml"),"pipelines: {}\n");
  await writeFile(join(root,".other.yml"),"skip: true\n");
  const r=await discover(root,{include:["."],exclude:[]});
  expect(r.materials.map(m=>m.path)).toEqual([".gitlab/ci/verify.yml",".gitlab-ci.yml","bitbucket-pipelines.yml"]);
 }finally{await rm(root,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused tests; expect exit 1 with both new tests failing on `toEqual` (GitLab and Bitbucket files are not parsed yet; `.gitlab-ci.yml` and `.gitlab/` are not read yet).

```sh
bun test tests/detectors/ci.test.ts tests/discovery/inventory.test.ts
```

- [ ] 3. Implement.

  a. Replace the whole content of `src/detectors/ci.ts` with exactly (it contains regex backslashes; keep them byte-exact):

```ts
import type { ScanData,Policy,Observation,Fact } from "../models";
import { observe,parseConfig,signal } from "../adapters/common";
import { detectedEntrypoints } from "./entrypoints";
type Consequence="blocking"|"advisory"|"unknown";
interface CiStep { boundary:string; command:string|null; remote:boolean; consequence:Consequence; }
const record=(v:unknown):Record<string,unknown>|null=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
function githubSteps(data:Record<string,unknown>):CiStep[] {
 const out:CiStep[]=[],jobs=record(data.jobs);
 if(!jobs)return out;
 for(const [name,raw] of Object.entries(jobs)) {
  const job=record(raw);if(!job||!Array.isArray(job.steps))continue;
  for(const [index,rawStep] of job.steps.entries()) {
   const step=record(rawStep);if(!step)continue;
   const a=step["continue-on-error"],b=job["continue-on-error"];
   out.push({boundary:name+"/"+index,command:typeof step.run==="string"?step.run.trim():null,remote:!!step.uses,
    consequence:a===true||b===true?"advisory":(a===undefined||a===false)&&(b===undefined||b===false)?"blocking":"unknown"});
  }
 }
 return out;
}
const gitlabGlobal=new Set(["default","include","stages","variables","workflow","spec","image","services","cache","before_script","after_script"]);
function gitlabSteps(data:Record<string,unknown>):CiStep[] {
 const out:CiStep[]=[];
 for(const [name,raw] of Object.entries(data)) {
  const job=record(raw);
  if(!job||name.startsWith(".")||gitlabGlobal.has(name))continue;
  const script:unknown[]=typeof job.script==="string"?[job.script]:Array.isArray(job.script)?job.script.flat():[];
  const allow=job.allow_failure;
  const consequence:Consequence=job.rules!==undefined||job.extends!==undefined||(allow!==undefined&&typeof allow!=="boolean")?"unknown":
   allow===true||(allow===undefined&&job.when==="manual")?"advisory":"blocking";
  for(const [index,line] of script.entries())
   out.push({boundary:name+"/"+index,command:typeof line==="string"?line.trim():null,remote:false,consequence});
 }
 return out;
}
function bitbucketSteps(data:Record<string,unknown>):CiStep[] {
 const out:CiStep[]=[],pipelines=record(data.pipelines);
 if(!pipelines)return out;
 const strategy=(o:Record<string,unknown>|null)=>record(o?.["on-fail"])?.strategy;
 const walk=(items:unknown,path:string,inherited:unknown):void=>{
  if(!Array.isArray(items))return;
  for(const [index,raw] of items.entries()) {
   const item=record(raw);if(!item)continue;
   const here=path+"/"+index,step=record(item.step);
   if(step) {
    const s=strategy(step)??inherited;
    const consequence:Consequence=s===undefined||s==="fail"?"blocking":s==="ignore"?"advisory":"unknown";
    const script:unknown[]=Array.isArray(step.script)?step.script:[];
    for(const [n,line] of script.entries())
     out.push({boundary:here+"/"+n,command:typeof line==="string"?line.trim():null,remote:false,consequence});
    continue;
   }
   if(item.parallel!==undefined){const group=record(item.parallel);walk(Array.isArray(item.parallel)?item.parallel:group?.steps,here,strategy(group)??inherited);continue;}
   const stage=record(item.stage);
   if(stage)walk(stage.steps,here,strategy(stage)??inherited);
  }
 };
 for(const [kind,value] of Object.entries(pipelines)) {
  if(Array.isArray(value))walk(value,kind,undefined);
  else for(const [name,list] of Object.entries(record(value)??{}))walk(list,kind+"/"+name,undefined);
 }
 return out;
}
const providers:[RegExp,(data:Record<string,unknown>)=>CiStep[]][]=[
 [/^\.github\/workflows\/[^/]+\.ya?ml$/,githubSteps],[/^\.gitlab-ci\.yml$/,gitlabSteps],[/^bitbucket-pipelines\.yml$/,bitbucketSteps]];
export function ciObservations(s:ScanData,_p:Policy):Observation[] {
 const out:Observation[]=[],entries=detectedEntrypoints(s);
 for(const m of s.materials) {
  const provider=providers.find(([pattern])=>pattern.test(m.path));
  if(!provider)continue;
  const parsed=parseConfig(m,"yaml");
  out.push(observe("ci-config-found@1",[m],{},[signal("ci","configuration",m.path)],
   ["Configuration does not establish an agent loop"],parsed.diagnostics));
  for(const step of provider[1](parsed.data)) {
   const scope={workflow:m.path,boundary:step.boundary,evaluator:"command"};
   const entry=entries.find(e=>e.command===step.command);
   const literal=!!step.command&&!/[\n\r;&|$<>`]/.test(step.command)&&!step.remote;
   const status:Fact["status"]=literal&&entry?"holds":"unknown";
   out.push(observe("ci.step-invokes-entrypoint@1",[m,...s.materials.filter(x=>x.path===entry?.document)],scope,
    [{subject:"foundation.ci-verification",claim:"invocation",status,scope,basis:step.command??"Unrecognized step",complete:status==="holds"}],
    ["Exact declared invocation only; execution and remote gating unobserved"]));
   out.push(observe("ci.failure-consequence@1",[m],scope,[signal("foundation.ci-verification","consequence",step.consequence,scope)],
    ["Configured failure consequence only"]));
  }
 }
 return out;
}
```

  b. In `src/discovery/inventory.ts`, replace

```ts
 const hidden=new Set([".claude",".codex",".github",".agents",".maat",".git"]);
```

  with

```ts
 const hidden=new Set([".claude",".codex",".github",".agents",".maat",".git",".gitlab"]);
```

  and replace

```ts
   if(name.startsWith(".") && ![".gitignore",".tool-versions"].includes(name) && !hidden.has(rel.split("/")[0]!)) continue;
```

  with

```ts
   if(name.startsWith(".") && ![".gitignore",".tool-versions",".gitlab-ci.yml"].includes(name) && !hidden.has(rel.split("/")[0]!)) continue;
```

  c. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace the line

```text
### 3.2 `maat evaluate`
```

  with these three lines

```text
CI 設定支援三種格式（2026-11-06 補充）：GitHub Actions 的 `.github/workflows/*.yml`、GitLab CI 的 `.gitlab-ci.yml`（discovery 另讀 `.gitlab/` 目錄，供引用）、Bitbucket Pipelines 的 `bitbucket-pipelines.yml`。每個步驟的指令與失敗後果逐一記錄；`include`、`extends`、`rules`、遠端 action 與包裝指令（例如 `dagger call`）不追蹤，對應主張為 `unknown`。

### 3.2 `maat evaluate`
```

- [ ] 4. Run the focused tests; expect exit 0. Then run the whole suite; expect 0 failures (91 tests).

```sh
bun test tests/detectors/ci.test.ts tests/discovery/inventory.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/detectors/ci.test.ts tests/discovery/inventory.test.ts src/detectors/ci.ts src/discovery/inventory.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-ci-providers/01-ci-providers.md
git commit -m '✨ feat(ci): read GitLab CI and Bitbucket Pipelines like GitHub Actions'
```
