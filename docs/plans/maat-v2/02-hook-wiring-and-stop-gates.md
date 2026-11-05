# V02 — Wire hook entrypoint triggers and Claude Stop-gate signals

Three changes inside the existing hook loop of `runDetectors`; no adapter changes.

1. Repair the hook-to-entrypoint correspondence. v1 filtered declared entrypoints by `e.scope.cli===a.name`, but every declared entrypoint has scope `{}`, so the `trigger` fact was unreachable. Now a literal command hook on an adapter-recognized event whose command equals a declared entrypoint command yields the `trigger` fact at the hook observation scope (`{cli}`), with the hook file, the declaring document and the bound manifest as evidence. The adapters accept any event key, so the recognized events are the ones v1 already names: Claude `Stop` and Copilot `agentStop` (T17 stop-gate branch). Other events, such as `PostToolUse`, need a documentation review first (OQ-6) and yield no trigger fact. Equality establishes only a declared trigger (T17); whether the script exists remains the `verify.entrypoint-declared@1` prerequisite. Default VD02 applies.
2. `loop.stop-gate.model@1`: a Claude `Stop` hook of type `prompt` or `agent` (already parsed by the Claude adapter) yields a signal with the canonical hook body. v1 skipped these hooks.
3. `loop.stop-hook-active-checked@1`: a Claude `Stop` command hook whose literal command contains `stop_hook_active` yields a weak signal labeled as a literal occurrence. Absence yields nothing (positive-only); referenced scripts are never read. Default VD03 applies.

Both new detector IDs join the supported set from V01. After this task, exactly eight detectors stay unsupported; the acceptance test proves this with input for every supported detector and carries the repaired trigger through a snapshot and a report.

## Files

- Create: `tests/detectors/hooks.test.ts`, `tests/detectors/v2-acceptance.test.ts`.
- Modify: `src/detectors/index.ts` (complete file), `tests/detectors/registry.test.ts` (anchored deletion of two lines).
- Test paths: `tests/detectors/registry.test.ts`, `tests/detectors/hooks.test.ts`, `tests/detectors/v2-acceptance.test.ts`.

## Interfaces

Consumes:

```ts
// T05
export type Truth = "holds"|"fails"|"unknown";
// T05
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
// T05
export interface Fingerprint { path: string; sha256: string; }
// T05
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
// T05
export interface Material extends Fingerprint { text: string; }
// T05
export interface Fact { subject: string; claim: string; status: Truth; scope: Scope; basis: string; complete: boolean; signal?: boolean; }
// T05
export interface Observation { detector: string; version: number; scope: Scope; evidence: Evidence[]; limits: string[]; facts: Fact[]; diagnostics: string[]; }
// T05
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
// T05
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; document?:string; }
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
export type ScanData = Omit<Snapshot,"materials"> & { materials:Material[] };
// T05
export declare function canonical(value: unknown): string;
// T05
export declare function sha256(value: string | Uint8Array): string;
// T03
export interface RegistryEntry { id: string; version: number; [key: string]: unknown; }
// T03
export interface Catalog {
  root: string; catalog_version: string; approved: boolean; items: CatalogItem[];
  capabilities: RegistryEntry[]; detectors: RegistryEntry[]; rule_cards: RegistryEntry[];
  templates: RegistryEntry[]; source_metadata: string;
}
// T03
export declare function loadCatalog(root?: string): Promise<Catalog>;
// T06
export declare function emptyPolicy(catalogVersion?: string): Policy;
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeScan(i: Inventory, p: Policy, adapters?: AdapterResult[], observations?: Observation[]): ScanData;
// T10
export declare function observe(detector: string, materials: Material[], scope?: Scope, facts?: Fact[], limits?: string[], diagnostics?: string[]): Observation;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T13
export declare function detectedEntrypoints(s: ScanData): Entrypoint[];
// T13
export declare function entrypointObservations(snapshot: ScanData, policy: Policy): Observation[];
// T14
export declare function ciObservations(snapshot: ScanData, policy: Policy): Observation[];
// T15
export declare function documentObservations(snapshot: ScanData): Observation[];
// T16
export declare function configurationObservations(snapshot: ScanData): Observation[];
// T17
export declare function runDetectors(snapshot: ScanData, policy: Policy, catalog: Catalog): Observation[];
// T05
export interface Snapshot {
 report_schema:string; versions:Versions; repository:{path:string;repo_id:string};
 scope:{include:string[];exclude:string[];limits:string[];diagnostics:string[];complete:boolean};
 target_clis:string[]; materials:Fingerprint[]; adapters:AdapterResult[]; observations:Observation[];
}
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T09
export declare function parseSnapshot(text: string): Snapshot;
// T10
export declare function claudeCode(materials: Material[]): AdapterResult;
// T11
export declare function codex(materials: Material[]): AdapterResult;
// T12
export declare function copilot(materials: Material[]): AdapterResult;
// T28
export declare function buildReport(s: Snapshot, p: Policy, c: Catalog, now: string, policyPath?: string|null, overridden?: boolean, policyDiagnostics?: string[], assessments?: Assessment[]): Report;
// V01
// src/detectors/index.ts holds const supported=new Set([...]) with 18 IDs and the no-output fallback.
```

Produces:

```ts
// Signature unchanged.
export declare function runDetectors(snapshot: ScanData, policy: Policy, catalog: Catalog): Observation[];
```

## Steps

- [ ] 1. Write the failing tests.

  a. In `tests/detectors/registry.test.ts`, delete exactly these two lines from the expected list in the test `only detectors without a producer are reported unsupported`, and change nothing else:

```ts
  "loop.stop-gate.model@1",
  "loop.stop-hook-active-checked@1",
```

  b. Create `tests/detectors/hooks.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { runDetectors } from "../../src/detectors";
import { loadCatalog } from "../../src/catalog/load";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
import { claudeCode } from "../../src/adapters/claude-code";
import { copilot } from "../../src/adapters/copilot";
const doc="Verification command: bun test\nVerification purpose: regression\n";
const quiet="No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable";
async function run(pairs:[string,string][]) {
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const materials=pairs.map(([path,text])=>({path,text,sha256:sha256(text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},
  p,[claudeCode(materials),copilot(materials)]);
 return {o:runDetectors(s,p,c),hash:(path:string)=>materials.find(m=>m.path===path)!.sha256};
}
test("a literal command on a recognized Stop event that equals a declared entrypoint is a trigger with traceable evidence",async()=>{
 const declared="Verification command: bun run test\nVerification purpose: regression\n";
 const manifest=JSON.stringify({scripts:{test:"bun test"}});
 const settings=JSON.stringify({hooks:{Stop:[{hooks:[{type:"command",command:"bun run test"}]}]}});
 const copilotHooks=JSON.stringify({version:1,hooks:{agentStop:[{type:"command",bash:"bun run test"}]}});
 const {o,hash}=await run([["AGENTS.md",declared],["package.json",manifest],[".claude/settings.json",settings],[".github/hooks/check.json",copilotHooks]]);
 const wired=o.filter(x=>x.facts.some(f=>f.claim==="trigger"));
 const refs=(hook:string)=>[hook,"AGENTS.md","package.json"].map(path=>[path,hash(path)]);
 expect(wired.map(x=>[x.detector,x.scope,x.evidence.map(e=>[e.path,e.sha256])])).toEqual([
  ["hooks.invokes-entrypoint@1",{cli:"claude-code"},refs(".claude/settings.json")],
  ["hooks.invokes-entrypoint@1",{cli:"copilot"},refs(".github/hooks/check.json")]]);
 expect(wired[0]!.facts).toEqual([{subject:"harness.verification-wiring",claim:"trigger",status:"holds",scope:{cli:"claude-code"},
  basis:"Literal hook event Stop",complete:true}]);
 for(const hooks of [{DefinitelyNotAnEvent:[{hooks:[{type:"command",command:"bun run test"}]}]},
  {Stop:[{hooks:[{type:"command",command:"bun run test --watch"}]}]}])
  expect((await run([["AGENTS.md",declared],["package.json",manifest],[".claude/settings.json",JSON.stringify({hooks})]]))
   .o.some(x=>x.facts.some(f=>f.claim==="trigger"))).toBe(false);
});
test("Claude Stop hooks give a model-gate signal and a positive-only stop_hook_active signal",async()=>{
 const settings=JSON.stringify({hooks:{Stop:[{hooks:[{type:"command",command:"jq -e .stop_hook_active"},{type:"prompt",prompt:"Check the work"}]}]}});
 const copilotHooks=JSON.stringify({version:1,hooks:{agentStop:[{type:"command",bash:"echo stop_hook_active"}]}});
 const {o}=await run([[".claude/settings.json",settings],[".github/hooks/stop.json",copilotHooks]]);
 expect(o.filter(x=>x.detector==="loop.stop-gate.model@1").map(x=>[x.scope,x.facts])).toEqual([[{cli:"claude-code"},
  [{subject:"loop",claim:"stop_model_gate",status:"unknown",scope:{cli:"claude-code"},
   basis:'{"type":"prompt","value":"Check the work"}',complete:false,signal:true}]]]);
 const active=o.filter(x=>x.detector==="loop.stop-hook-active-checked@1");
 expect(active.map(x=>[x.scope,x.facts.map(f=>f.basis),x.diagnostics])).toEqual([[{cli:"claude-code"},["literal occurrence in hook command"],[]]]);
 expect(active[0]!.limits).toContain("Literal occurrence only; referenced scripts are not read; a read does not decide blocking or budget");
 const quietStop=JSON.stringify({hooks:{Stop:[{hooks:[{type:"command",command:"bash .claude/hooks/stop.sh"}]}]}});
 expect((await run([[".claude/settings.json",quietStop]])).o.filter(x=>x.detector==="loop.stop-hook-active-checked@1")
  .map(x=>[x.facts,x.limits,x.diagnostics])).toEqual([[[],[quiet],[]]]);
});
```

  c. Create `tests/detectors/v2-acceptance.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { runDetectors } from "../../src/detectors";
import { loadCatalog } from "../../src/catalog/load";
import { makeScan,makeSnapshot,parseSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
import { buildReport } from "../../src/report";
import { claudeCode } from "../../src/adapters/claude-code";
import { codex } from "../../src/adapters/codex";
import { copilot } from "../../src/adapters/copilot";
const files:Record<string,string>={
 "AGENTS.md":"# Guide\nVerification command: bun test\nVerification purpose: regression\nSee [ci](.github/workflows/ci.yml).\n",
 "CLAUDE.md":"@AGENTS.md\n",
 "package.json":JSON.stringify({scripts:{test:"bun test"},engines:{bun:">=1.4.0"}}),
 "tsconfig.json":JSON.stringify({compilerOptions:{strict:true}}),
 ".github/dependabot.yml":"version: 2\nupdates: []\n",
 ".github/workflows/ci.yml":"on: [push]\njobs:\n  test:\n    steps:\n      - run: bun test\n",
 ".claude/settings.json":JSON.stringify({permissions:{deny:["Read(./.env)"]},hooks:{
  Stop:[{hooks:[{type:"command",command:"jq -e .stop_hook_active"},{type:"command",command:"bun test"},{type:"agent",prompt:"Review the diff"}]}]}}),
 ".codex/config.toml":"approval_policy = \"on-request\"\n",
 ".github/hooks/stop.json":JSON.stringify({version:1,hooks:{agentStop:[{type:"command",bash:"bun test"}]}})};
const unsupported=["instructions.scoping@1","loop.bounds@1","loop.routing-declared@1","loop.self-declared@1",
 "loop.trigger@1","policy.human-evaluation@1","recovery.local-plan@1","tests.structure@1"];
test("v2 leaves exactly eight detectors unsupported and the repaired trigger survives snapshot and evaluation",async()=>{
 const p={...emptyPolicy(),target_clis:["claude-code","codex","copilot"]},c=await loadCatalog("catalog");
 const materials=Object.entries(files).map(([path,text])=>({path,text,sha256:sha256(text)}));
 const inventory={root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials};
 const adapters=[claudeCode(materials),codex(materials),copilot(materials)];
 const o=runDetectors(makeScan(inventory,p,adapters),p,c);
 const flagged=[...new Set(o.flatMap(x=>x.diagnostics).filter(d=>d.startsWith("detector_unsupported: ")).map(d=>d.slice(22)))].sort();
 expect(flagged).toEqual(unsupported);
 for(const d of c.detectors.map(x=>x.id).filter(id=>!unsupported.includes(id)))
  expect([d,o.some(x=>x.detector===d&&x.evidence.length>0&&x.facts.length>0)]).toEqual([d,true]);
 const snapshot=parseSnapshot(JSON.stringify(makeSnapshot(inventory,p,adapters,o)));
 const report=buildReport(snapshot,p,c,"2026-11-05T00:00:00Z");
 const wiring=report.items.find(i=>i.id==="harness.verification-wiring"&&i.scope.cli==="claude-code"&&Object.keys(i.scope).length===1)!;
 expect(wiring.claims.find(x=>x.name==="trigger")).toEqual({name:"trigger",status:"holds",basis:["static: Literal hook event Stop"]});
});
```

- [ ] 2. Run the three focused test files; expect exit 1 with 4 failing and 2 passing tests. Failing: `only detectors without a producer are reported unsupported`, `a literal command on a recognized Stop event that equals a declared entrypoint is a trigger with traceable evidence`, `Claude Stop hooks give a model-gate signal and a positive-only stop_hook_active signal`, `v2 leaves exactly eight detectors unsupported and the repaired trigger survives snapshot and evaluation`.

```sh
bun test tests/detectors/registry.test.ts tests/detectors/hooks.test.ts tests/detectors/v2-acceptance.test.ts
```

- [ ] 3. Replace `src/detectors/index.ts` with this complete file. Compared with V01: two IDs join `supported`; the hook loop gains `claudeStop` and `recognizedStop`, the model-gate branch before `continue`, the repaired entrypoint match (recognized Stop events only) with evidence, and the positive-only `stop_hook_active` branch.

**src/detectors/index.ts** (complete file)

```ts
import type { ScanData,Policy,Observation,Fact } from "../models";
import type { Catalog } from "../catalog/types";
import { observe,signal } from "../adapters/common";
import { entrypointObservations,detectedEntrypoints } from "./entrypoints";
import { ciObservations } from "./ci";
import { documentObservations } from "./documents";
import { configurationObservations } from "./configuration";
import { canonical } from "../canonical";
const supported=new Set(["analysis.config@1","ci-config-found@1","ci.failure-consequence@1","ci.step-invokes-entrypoint@1",
 "context-size-reported@1","documents.local-links@1","environment.declarations@1","evaluation.model-gate@1",
 "hooks.invokes-entrypoint@1","instruction-file-found@1","instructions.import-topology@1","instructions.precedence-model@1",
 "instructions.verify-entrypoint@1","loop.stop-gate.command@1","loop.stop-gate.model@1","loop.stop-hook-active-checked@1",
 "manifest.verify-entrypoint@1","permissions.declarations@1","policy.verify-entrypoint@1","security.config-signals@1"]);
export function runDetectors(s:ScanData,p:Policy,c:Catalog):Observation[] {
 const out=[...s.adapters.flatMap(a=>a.observations),...entrypointObservations(s,p),
 ...ciObservations(s,p),...documentObservations(s),...configurationObservations(s)];
 for(const a of s.adapters) for(const o of a.observations) for(const f of o.facts) {
  if(!f.claim.startsWith("hook:")) continue;
  let body:{type?:string;value?:string};try{body=JSON.parse(f.basis);}catch{continue;}
  const claudeStop=a.name==="claude-code"&&f.claim==="hook:Stop";
  const recognizedStop=claudeStop||a.name==="copilot"&&f.claim==="hook:agentStop";
  if(body.type!=="command") {
   if(claudeStop) out.push({...o,detector:"loop.stop-gate.model@1",facts:[signal("loop","stop_model_gate",f.basis,o.scope)],
    limits:[...o.limits,"Model independence and gate effectiveness unobserved"]});
   continue;
  }
  if(recognizedStop) for(const e of detectedEntrypoints(s).filter(e=>e.command===body.value)) {
   const fact:Fact={subject:"harness.verification-wiring",claim:"trigger",status:"holds",
    scope:o.scope,basis:"Literal hook event "+f.claim.slice(5),complete:true};
   const refs=observe(o.detector,s.materials.filter(m=>m.path===e.document||m.path===e.manifest)).evidence;
   out.push({...o,evidence:[...o.evidence,...refs],facts:[fact],limits:[...o.limits,"Input, evaluator and result delivery require separate evidence"]});
  }
  if(["hook:Stop","hook:agentStop"].includes(f.claim))
   out.push({...o,detector:"loop.stop-gate.command@1",facts:[signal("loop","stop_event",f.basis,o.scope)]});
  if(claudeStop&&body.value?.includes("stop_hook_active"))
   out.push({...o,detector:"loop.stop-hook-active-checked@1",facts:[signal("loop","stop_hook_active","literal occurrence in hook command",o.scope)],
    limits:[...o.limits,"Literal occurrence only; referenced scripts are not read; a read does not decide blocking or budget"]});
 }
 const ids=new Set(out.map(o=>o.detector));
 for(const d of c.detectors) if(!ids.has(d.id))
  out.push(supported.has(d.id)
   ?observe(d.id,[],{},[],["No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable"])
   :observe(d.id,[],{},[],["No supported input for this detector"],["detector_unsupported: "+d.id]));
 return out.sort((a,b)=>canonical(a).localeCompare(canonical(b)));
}
```

- [ ] 4. Run the focused tests; expect exit 0 and 6 passing tests. Then run the whole suite; expect 0 failures.

```sh
bun test tests/detectors/registry.test.ts tests/detectors/hooks.test.ts tests/detectors/v2-acceptance.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the planning run does not commit.

```sh
git add -- src/detectors/index.ts tests/detectors/registry.test.ts tests/detectors/hooks.test.ts tests/detectors/v2-acceptance.test.ts
git commit -m '✨ feat(detectors): wire hook entrypoint triggers and Claude stop-gate signals'
```
