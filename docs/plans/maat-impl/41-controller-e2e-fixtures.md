# T41 — Materialize controller fixtures and test both loops through the CLI

The fixture recipe defines base and candidate snapshots, a finite plan, explicit approvals, before/after fingerprints, change/evaluation records, and variant rejected events. No host action is executed by the product; fixtures describe effects that the test host supplies. Every record has a stable event ID and expected sequence. Tests use isolated external ledgers. Same evidence with revised agent prose must not count as new progress. Historical flow violation does not poison an independent fresh content report. The same fixture helper and materialization command serve both evidence repositories and controller event fixtures.

## Files

- Create: None.
- Modify: `tests/helpers/fixtures.ts`, `scripts/materialize-fixtures.ts`.
- Test path: `tests/e2e/controller.test.ts`.
- Create from the exact resource recipe in Step 3:
  - <code>tests/fixtures/flow/base.plan.json</code>
  - <code>tests/fixtures/flow/base.snapshot.json</code>
  - <code>tests/fixtures/flow/candidate.snapshot.json</code>
  - <code>tests/fixtures/flow/candidate.report.json</code>
  - <code>tests/fixtures/flow/approval.json</code>
  - <code>tests/fixtures/flow/stale-approval.json</code>
  - <code>tests/fixtures/flow/before.json</code>
  - <code>tests/fixtures/flow/after.json</code>
  - <code>tests/fixtures/flow/change.json</code>
  - <code>tests/fixtures/flow/evaluation.json</code>
  - <code>tests/fixtures/flow/timeout.json</code>
  - <code>tests/fixtures/flow/unauthorized-command.json</code>
  - <code>tests/fixtures/flow/drift-before.json</code>
  - <code>tests/fixtures/flow/out-of-scope-after.json</code>
  - <code>tests/fixtures/flow/expired-approval.json</code>
  - <code>tests/fixtures/flow-target/task.md</code>
  - <code>tests/fixtures/flow-target/dirty.md</code>

## Interfaces

Consumes:

```ts
// T01
export declare const versions: Versions;
// T01
export interface Versions {
  tool_version: string; report_schema: string; policy_schema: string;
  ledger_schema: string;
  catalog_version: string;
  adapters: { name: string; adapter_version: string; verified_cli_range: string; checked_at: string }[];
}
// T03
export interface Catalog {
  root: string; catalog_version: string; approved: boolean; items: CatalogItem[];
  capabilities: RegistryEntry[]; detectors: RegistryEntry[]; rule_cards: RegistryEntry[];
  templates: RegistryEntry[]; source_metadata: string;
}
// T03
export interface CatalogItem {
  id: string; item_version: number; catalog_version: string; question: string;
  layer: { primary: string; related: string[] };
  baseline: { proposed_tier: "baseline" | "advanced"; when: string | false };
  applicability: { applicable: string; not_applicable: string; unknown: string; questions: string[] };
  inspection: { inputs: string[]; detectors: string[]; methods: string[]; review?: string; limits: string };
  evidence_requirements: Record<string, unknown>;
  prerequisites: {
    required: (string | { capability: string; scope: string })[]; recommended: string[];
    conditional?: { when: string; required: string[]; recommended: string[] }[];
  };
  remediation: { rule_cards: { id: string; version: number }[]; actions: string[];
    targets: string; risk: string; needs_approval: boolean };
  verification: { rerun: string[]; logic: string; expected: unknown;
    attestation: { question: string; requires: string[] } };
  sources: { type: string; ref: string; use: string }[];
}
// T03
export declare function extractCatalog(markdown: string, out: string): Promise<void>;
// T03
export declare function loadCatalog(root?: string): Promise<Catalog>;
// T03
export interface RegistryEntry{ id: string; version: number; [key: string]: unknown; }
// T05
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
// T05
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
// T05
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
// T05
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
// T05
export declare function canonical(value: unknown): string;
// T05
export interface CapabilityResult { id:string;status:Truth;scope:Scope;basis:string[];claims:Claim[]; }
// T05
export interface Claim { name:string;status:Truth;basis:string[]; }
// T05
export interface Decision { status: "applicable"|"not_applicable"|"unknown"; reason?: string; owner?: string; expires_at?: string; loops?: {id:string;kind:"execution-feedback"|"event-driven"|"cross-run-improvement";scope:string}[]; }
// T05
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; document?:string; }
// T05
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
// T05
export interface Fact { subject: string; claim: string; status: Truth; scope: Scope; basis: string; complete: boolean; signal?: boolean; }
// T05
export interface Fingerprint { path: string; sha256: string; }
// T05
export interface ItemResult {
 id:string;item_version:number;layer:Layer;scope:Scope;
 applicability:{status:Decision["status"];reason:string;questions:string[]};
 result:ItemStatus;claims:Claim[];observations:Observation[];assessments:Assessment[];
 attestations:{ref:string;valid:boolean;invalid_reason:string|null}[];
 prerequisites:{required:{capability:string;status:Truth}[];recommended:{capability:string;status:Truth}[]};
 baseline:{tier:"baseline"|"advanced";when_status:Truth};diagnostics:string[];
}
// T05
export type ItemStatus = "verified"|"partial"|"missing"|"not_applicable"|"unknown";
// T05
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
// T05
export interface LayerResult { layer:Layer;scope:Scope;status:LayerStatus;authoritative:boolean;missing_required:string[];unknown_required:string[];baseline_gaps:string[];usage_signals:string[]; }
// T05
export type LayerStatus = "adopted"|"ready"|"blocked"|"not_applicable"|"in_use_unsupported"|"pending";
// T05
export interface Material extends Fingerprint { text: string; }
// T05
export interface Observation { detector: string; version: number; scope: Scope; evidence: Evidence[]; limits: string[]; facts: Fact[]; diagnostics: string[]; }
// T05
export interface Policy {
 policy_schema:string; catalog_version:string; target_clis:string[];
 scope:{include:string[];exclude:string[]};
 applicability:Record<string,Decision>;
 targets:Record<string,{baseline?:boolean}>;
 exemptions:{check:string;reason:string;owner:string;expires_at:string;fingerprints:Fingerprint[];scope?:Scope}[];
 attestations:Attestation[];
}
// T05
export interface ProtectionObservation { measure:string;protects:string;threat:string;boundary:string;evidence:Evidence[];unknown:string[]; }
// T05
export declare function repoId(absolutePath: string): string;
// T05
export interface Report {
 report_schema:string;tool_version:string;catalog_version:string;adapters:(Omit<AdapterResult,"sources"|"observations"|"surfaces">&{surfaces:Omit<AdapterSurface,"paths">[]})[];
 generated_at:string;valid_until:string|null;repository:Snapshot["repository"];scope:Snapshot["scope"];target_clis:string[];
 policy:{path:string|null;policy_schema:string;valid:boolean;diagnostics:string[]};
 items:ItemResult[];capabilities:Omit<CapabilityResult,"claims">[];layers:LayerResult[];
 protection_observations:ProtectionObservation[];diagnostics:string[];
}
// T05
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
// T05
export declare function sha256(value: string | Uint8Array): string;
// T05
export interface Snapshot {
 report_schema:string; versions:Versions; repository:{path:string;repo_id:string};
 scope:{include:string[];exclude:string[];limits:string[];diagnostics:string[];complete:boolean};
 target_clis:string[]; materials:Fingerprint[]; adapters:AdapterResult[]; observations:Observation[];
}
// T05
export type Truth = "holds"|"fails"|"unknown";
// T06
export declare function emptyPolicy(catalogVersion?: string): Policy;
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T28
export declare function buildReport(snapshot: Snapshot, policy: Policy, catalog: Catalog, now: string, policyPath?: string | null, overridden?: boolean, policyDiagnostics?: string[], assessments?: Assessment[]): Report;
// T31
export interface Plan {
 report_schema:string;versions:Versions;catalog_version:string;repository:{path:string;repo_id:string};
 source_report_fingerprint:string;plan_fingerprint:string;actions:PlanAction[];
 fingerprints:Fingerprint[];authoritative:boolean;diagnostics:string[];
}
// T31
export interface PlanAction {
 id:string;check:string;scope:Scope;item_version:number;rule_cards:{id:string;version:number}[];
 template:{id:string;version:number;body:string}|null;current:string;target:string;
 kind:"ask"|"modify"|"command";actions:string[];target_path:string|null;command:string|null;
 depends_on:string[];necessity:"required"|"recommended";risk:string;needs_approval:boolean;
 role_approval_required:boolean;verification:{detectors:string[];expected:unknown;manual:string};
 fingerprints:Fingerprint[];fix_conditions:{max_fixes:number};stop_conditions:string[];
}
// T34
export interface Approval { plan_fingerprint:string;base_fingerprint:string;actions:string[];paths:string[];mode:"plan"|"candidate";candidate_fingerprint:string|null;max_fixes:Record<string,number>;role_approvals:{check:string;by:string}[];expires_at:string;by:string;source:string; }
// T34
export interface Authorization { execution:ExecutionSpec;expires_at:string;by:string;source:string; }
// T34
export interface ChangeRecord { action:string;candidate_fingerprint:string;paths:string[];executed_by:string;source:string;unknown_effects:string[]; }
// T34
export interface EvaluationRecord { action:string;candidate_fingerprint:string;method:{kind:"manual"|"command";id:string;version:string};result:"pass"|"fail"|"unknown"|"error"|"timeout"|"cancel";report:Report|null;execution:ExecutionSpec|null;evidence:Fingerprint[];by:string;source:string;unknown_effects:string[]; }
// T34
export interface ExecutionSpec { action:string;command:string;script:Fingerprint|null;inputs:Fingerprint[];cwd:string;permissions:string[];effects:string[]; }
// T34
export declare function fingerprintSet(fingerprints: Fingerprint[]): string;
// T34
export interface Flow {
 ledger_schema:string;flow_id:string;repository:{path:string;repo_id:string};plan:Plan;plan_fingerprint:string;
 status:FlowStatus;seq:number;seen:string[];current:Fingerprint[];base:Fingerprint[];
 approval:Approval|null;authorizations:Authorization[];fixes:Record<string,number>;attempts:Record<string,number>;
 pending:{action:string;before:Fingerprint[];after:Fingerprint[]|null;execution:ExecutionSpec|null}|null;
 changes:ChangeRecord[];evaluations:EvaluationRecord[];meaningful_inputs:string[];
 unknown_effects:string[];last_rejection:string|null;resume_permit:boolean;
}
// T34
export interface FlowEvent { id:string;expected_seq:number;at:string;expires_at:string;type:"approve"|"authorize"|"before"|"after"|"change"|"evaluation"|"accept"|"continue-fix"|"stop"|"handoff"|"resume";by:string;payload:unknown; }
// T34
export type FlowStatus="open"|"approved"|"executing"|"changed"|"evaluated"|"accepted"|"stopped"|"handoff"|"drifted";
// T36
export declare function flowEvent(flow: Flow, type: FlowEvent['type'], payload: unknown, id?: string): FlowEvent;
// T36
export declare function flowFixture(): Flow;
// T38
export declare function main(argv: string[], now?: string, cwd?: string): Promise<{code:number;stdout:string;stderr:string}>;
// T40
export declare const fixtureFiles: Record<string,Record<string,string>>;
```

Produces:

```ts
export declare function materializeFlowFixtures(): Promise<void>;
```

## Steps

- [ ] 1. Write the failing test at `tests/e2e/controller.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { mkdtemp,readFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z",fixture="tests/fixtures/flow/";
test("approved edits accept only their matching evidence and survive restart",async()=>{
 const ledger=await mkdtemp(join(tmpdir(),"maat-flow-e2e-"));
 const call=(args:string[])=>main(["flow",...args,"--ledger",ledger,"--json"],time);
 try {
  const opened=await call(["open","--plan",fixture+"base.plan.json","--snapshot",fixture+"base.snapshot.json"]);
  if(opened.code!==0)throw Error("controller_fixture_missing");
  expect(opened.code).toBe(0);const id=JSON.parse(opened.stdout).flow_id as string;
  for(const args of [
   ["approve","--scope",fixture+"approval.json","--by","ray"],
   ["checkpoint","--action","a","--phase","before","--fingerprints",fixture+"before.json"],
   ["checkpoint","--action","a","--phase","after","--fingerprints",fixture+"after.json"],
   ["record","--kind","change","--file",fixture+"change.json"],
   ["record","--kind","evaluation","--file",fixture+"evaluation.json"]
  ]) expect((await call([...args,"--flow",id])).code).toBe(0);
  const accepted=await call(["decide","--event","accept","--by","ray","--flow",id]);
  expect(accepted.code).toBe(0);expect(JSON.parse(accepted.stdout).status).toBe("accepted");
  const repeated=await call(["decide","--event","accept","--by","ray","--flow",id]);
  expect(repeated.code).toBe(4);
  const status=await call(["status","--flow",id]);expect(JSON.parse(status.stdout).attempts.a).toBe(1);
  const rows=(await readFile(join(ledger,id+".jsonl"),"utf8")).trim().split("\n").map(x=>JSON.parse(x));
  expect(rows.at(-1).accepted).toBe(false);
 }finally{await rm(ledger,{recursive:true,force:true});}
});
test("timeout, command without authorization, and stale approval do not pass",async()=>{
 for(const variant of ["timeout","unauthorized-command","stale-approval"]) {
  const ledger=await mkdtemp(join(tmpdir(),"maat-flow-reject-"));
  const call=(args:string[])=>main(["flow",...args,"--ledger",ledger,"--json"],time);
  try{
   const opened=await call(["open","--plan",fixture+"base.plan.json","--snapshot",fixture+"base.snapshot.json"]);
   const id=JSON.parse(opened.stdout).flow_id;
   if(variant==="stale-approval") {
    expect((await call(["approve","--flow",id,"--scope",fixture+"stale-approval.json","--by","ray"])).code).toBe(4);
    continue;
   }
   for(const args of [
    ["approve","--scope",fixture+"approval.json","--by","ray"],
    ["checkpoint","--action","a","--phase","before","--fingerprints",fixture+"before.json"],
    ["checkpoint","--action","a","--phase","after","--fingerprints",fixture+"after.json"],
    ["record","--kind","change","--file",fixture+"change.json"]
   ])expect((await call([...args,"--flow",id])).code).toBe(0);
   const result=await call(["record","--kind","evaluation","--flow",id,"--file",fixture+variant+".json"]);
   expect(result.code).toBe(variant==="timeout"?0:4);
   expect((await call(["decide","--event","accept","--flow",id])).code).toBe(4);
  }finally{await rm(ledger,{recursive:true,force:true});}
 }
});
test("fresh content evidence can conform despite an unrelated prior flow violation",async()=>{
 const report=JSON.parse(await readFile(fixture+"candidate.report.json","utf8"));
 expect(report.items.find((i:{id:string})=>i.id==="prompt.task-spec").result).toBe("verified");
 expect(report.diagnostics).not.toContain("historical_flow_violation");
});
test("drift, out-of-scope edits, and expired events cannot enter a legal flow",async()=>{
 for(const variant of ["drift-before","out-of-scope-after","expired-approval"]) {
  const ledger=await mkdtemp(join(tmpdir(),"maat-flow-boundary-"));
  const call=(args:string[])=>main(["flow",...args,"--ledger",ledger,"--json"],time);
  try {
   const opened=await call(["open","--plan",fixture+"base.plan.json","--snapshot",fixture+"base.snapshot.json"]);
   const id=JSON.parse(opened.stdout).flow_id;
   if(variant==="expired-approval"){
    expect((await call(["approve","--flow",id,"--scope",fixture+variant+".json","--by","ray"])).code).toBe(4);continue;
   }
   expect((await call(["approve","--flow",id,"--scope",fixture+"approval.json","--by","ray"])).code).toBe(0);
   if(variant==="out-of-scope-after")
    expect((await call(["checkpoint","--flow",id,"--action","a","--phase","before","--fingerprints",fixture+"before.json"])).code).toBe(0);
   expect((await call(["checkpoint","--flow",id,"--action","a","--phase",variant==="drift-before"?"before":"after","--fingerprints",fixture+variant+".json"])).code).toBe(4);
   expect(JSON.parse((await call(["status","--flow",id])).stdout).status).toBe("drifted");
  }finally{await rm(ledger,{recursive:true,force:true});}
 }
});
```

- [ ] 2. Run the focused test; expect exit 1 and `controller_fixture_missing`.

```sh
bun test tests/e2e/controller.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**tests/helpers/fixtures.ts** (append the exact imports and exported function below)

```ts
import { mkdir,writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { flowFixture } from "./flow";
import { fingerprintSet } from "../../src/flow/model";
import { makeSnapshot } from "../../src/snapshot";
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { canonical,repoId } from "../../src/canonical";
export async function materializeFlowFixtures():Promise<void> {
const dir="tests/fixtures/flow";await mkdir(dir,{recursive:true});
const root=resolve("tests/fixtures/flow-target");await mkdir(root,{recursive:true});
const task="Goal: Fix login feedback.\nScope: Login view.\nConstraints: Keep the API.\nAcceptance: Show Invalid password.\n";
await writeFile(root+"/task.md","old");await writeFile(root+"/dirty.md","user work");
const f=flowFixture();
f.repository={path:root,repo_id:repoId(root)};f.plan.repository=f.repository;
const {plan_fingerprint:old,...unsigned}=f.plan;f.plan.plan_fingerprint=sha256(canonical(unsigned));
const baseMaterials=[{path:"task.md",text:"old",sha256:sha256("old")},{path:"dirty.md",text:"user work",sha256:sha256("user work")}];
const candidate=baseMaterials.map(x=>x.path==="task.md"?{...x,text:task,sha256:sha256(task)}:x);
const p=emptyPolicy();
p.applicability["prompt.task-spec"]={status:"applicable"};p.targets["prompt.task-spec"]={baseline:true};
p.attestations=[{check:"prompt.task-spec",claims:["goal","scope","constraints","acceptance"],
 answer:"This representative task states the agreed goal, scope, constraint, and observable acceptance result.",
 materials:[{path:"task.md",sha256:sha256(task),lines:"1-4",quote:task.trim()}],scope:{},attested_by:"ray",
 attested_at:"2026-11-04T01:00:00Z",expires_at:"2027-02-01",catalog_version:"0.1.0",adapter_version:{}}];
const inventory=(materials:typeof baseMaterials)=>({root,repo_id:repoId(root),materials,complete:true,
 include:["."],exclude:[],limits:[],diagnostics:[]});
const base=makeSnapshot(inventory(baseMaterials),emptyPolicy()),after=makeSnapshot(inventory(candidate),p);
const report=buildReport(after,p,await loadCatalog("catalog"),"2026-11-04T12:00:00Z","provided-policy");
const envelope=(id:string,seq:number,payload:unknown)=>({id,expected_seq:seq,expires_at:"2027-01-01",by:"ray",payload});
const before=f.plan.fingerprints,afterFP=candidate.map(({path,sha256})=>({path,sha256}));
const approval={plan_fingerprint:f.plan.plan_fingerprint,base_fingerprint:fingerprintSet(before),
 actions:["a"],paths:["task.md"],mode:"plan",candidate_fingerprint:null,max_fixes:{a:1},role_approvals:[],
 expires_at:"2027-01-01",by:"ray",source:"user"};
const evaluation={action:"a",candidate_fingerprint:fingerprintSet(afterFP),
 method:{kind:"manual",id:"task-review",version:"1"},result:"pass",report,execution:null,
 evidence:afterFP,by:"ray",source:"user confirmation",unknown_effects:[]};
const files:Record<string,unknown>={
 "drift-before.json":envelope("drift",1,{action:"a",fingerprints:before.map(x=>x.path==="dirty.md"?{...x,sha256:sha256("outside change")}:x)}),
 "out-of-scope-after.json":envelope("outside",2,{action:"a",fingerprints:afterFP.map(x=>x.path==="dirty.md"?{...x,sha256:sha256("outside change")}:x)}),
 "expired-approval.json":{...envelope("expired",0,approval),expires_at:"2026-01-01"},
 "base.plan.json":f.plan,"base.snapshot.json":base,"candidate.snapshot.json":after,"candidate.report.json":report,
 "approval.json":envelope("approval",0,approval),
 "stale-approval.json":envelope("stale",0,{...approval,plan_fingerprint:sha256("different plan")}),
 "before.json":envelope("before",1,{action:"a",fingerprints:before}),
 "after.json":envelope("after",2,{action:"a",fingerprints:afterFP}),
 "change.json":envelope("change",3,{action:"a",candidate_fingerprint:fingerprintSet(afterFP),paths:["task.md"],
 executed_by:"host",source:"fixture host",unknown_effects:[]}),
 "evaluation.json":envelope("evaluation",4,evaluation),
 "timeout.json":envelope("timeout",4,{...evaluation,result:"timeout",report:null,unknown_effects:["Remote result uncertain"]}),
 "unauthorized-command.json":envelope("command",4,{...evaluation,method:{kind:"command",id:"bun test",version:"1"},
 execution:{action:"a",command:"bun test",script:null,inputs:afterFP,cwd:root,permissions:["read"],effects:[]}})
};
for(const [name,value] of Object.entries(files))await writeFile(dir+"/"+name,JSON.stringify(value,null,2)+"\n");
}
```

**scripts/materialize-fixtures.ts** (replace complete file)

```ts
import { mkdir,writeFile } from "node:fs/promises";
import { dirname,join } from "node:path";
import { fixtureFiles,materializeFlowFixtures } from "../tests/helpers/fixtures";
import { extractCatalog } from "./extract-catalog";
for(const [name,files] of Object.entries(fixtureFiles))for(const [path,text] of Object.entries(files)) {
 const target=join("tests/fixtures",name,path);await mkdir(dirname(target),{recursive:true});await writeFile(target,text);
}
const catalog="tests/fixtures/unapproved-catalog/catalog";
await extractCatalog(await Bun.file("docs/specs/2026-11-03-five-layer-catalog.md").text(),catalog);
const meta=await Bun.file(catalog+"/metadata.json").json();meta.approved=false;
await writeFile(catalog+"/metadata.json",JSON.stringify(meta,null,2)+"\n");
await materializeFlowFixtures();
```

**command: materialize all fixtures** (complete file)

```sh
bun scripts/materialize-fixtures.ts
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/e2e/controller.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- tests/helpers/fixtures.ts scripts/materialize-fixtures.ts tests/e2e/controller.test.ts tests/fixtures/flow tests/fixtures/flow-target
git commit -m '✨ feat(e2e): verify controller acceptance rejection and restart paths'
```

