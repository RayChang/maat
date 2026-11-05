# V01 — Report unsupported only for detectors without a producer

v1 emits `detector_unsupported` for every catalog detector that produced no observation, so a supported detector in a repository without matching input looks unsupported. T17 reserves that diagnostic for grammars outside the bounded subset. This task adds an explicit set of the 18 detector IDs that have a v1 producer. A supported ID with no output gets one observation with no facts, no diagnostics and a limit saying why nothing was observed; every other ID keeps `detector_unsupported`. No producer, adapter, diagnostic code or report field changes. Default VD01 applies.

## Files

- Create: None.
- Modify: `src/detectors/index.ts` (complete file), `tests/detectors/registry.test.ts` (complete file).
- Test path: `tests/detectors/registry.test.ts`.

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
// T11
export declare function codex(materials: Material[]): AdapterResult;
```

Produces:

```ts
// Signature unchanged; the fallback for catalog detectors without output now depends on the supported set.
export declare function runDetectors(snapshot: ScanData, policy: Policy, catalog: Catalog): Observation[];
```

## Steps

- [ ] 1. Replace `tests/detectors/registry.test.ts` with this complete content. The first test is the unchanged v1 regression test; the other two are new.

```ts
import { test, expect } from "bun:test";
import { runDetectors } from "../../src/detectors";
import { loadCatalog } from "../../src/catalog/load";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
import { codex } from "../../src/adapters/codex";
const empty={root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[]};
const quiet="No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable";
test("every registry entry is represented and same inputs are stable",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeScan({...empty,materials:[]},p);
 const a=runDetectors(s,p,c),b=runDetectors(s,p,c);
 expect(a).toEqual(b);
 expect([...new Set(a.map(o=>o.detector))].sort()).toEqual(c.detectors.map(d=>d.id).sort());
 expect(a.flatMap(o=>o.facts).every(f=>f.status!=="holds")).toBe(true);
});
test("only detectors without a producer are reported unsupported",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const o=runDetectors(makeScan({...empty,materials:[]},p),p,c);
 const flagged=[...new Set(o.flatMap(x=>x.diagnostics).filter(d=>d.startsWith("detector_unsupported: ")).map(d=>d.slice(22)))].sort();
 expect(flagged).toEqual([
  "instructions.scoping@1",
  "loop.bounds@1",
  "loop.routing-declared@1",
  "loop.self-declared@1",
  "loop.stop-gate.model@1",
  "loop.stop-hook-active-checked@1",
  "loop.trigger@1",
  "policy.human-evaluation@1",
  "recovery.local-plan@1",
  "tests.structure@1"]);
 expect(o.filter(x=>x.detector==="analysis.config@1")).toEqual([{detector:"analysis.config@1",version:1,scope:{},
  evidence:[],facts:[],limits:[quiet],diagnostics:[]}]);
});
test("a Codex-only AGENTS.md leaves instruction-file-found unobserved, not absent",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog"),text="Use bun.\n";
 const materials=[{path:"AGENTS.md",text,sha256:sha256(text)}];
 const o=runDetectors(makeScan({...empty,materials},p,[codex(materials)]),p,c);
 expect(o.filter(x=>x.detector==="instruction-file-found@1").map(x=>[x.limits,x.diagnostics])).toEqual([[[quiet],[]]]);
 expect(o.filter(x=>x.detector==="instructions.precedence-model@1").map(x=>x.facts.length)).toEqual([1]);
});
```

- [ ] 2. Run the focused test; expect exit 1. Two tests fail: `only detectors without a producer are reported unsupported` and `a Codex-only AGENTS.md leaves instruction-file-found unobserved, not absent`. The first test passes.

```sh
bun test tests/detectors/registry.test.ts
```

- [ ] 3. Replace `src/detectors/index.ts` with this complete file. Only the `supported` constant and the fallback at the end of `runDetectors` differ from v1.

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
 "instructions.verify-entrypoint@1","loop.stop-gate.command@1","manifest.verify-entrypoint@1","permissions.declarations@1",
 "policy.verify-entrypoint@1","security.config-signals@1"]);
export function runDetectors(s:ScanData,p:Policy,c:Catalog):Observation[] {
 const out=[...s.adapters.flatMap(a=>a.observations),...entrypointObservations(s,p),
 ...ciObservations(s,p),...documentObservations(s),...configurationObservations(s)];
 for(const a of s.adapters) for(const o of a.observations) for(const f of o.facts) {
  if(!f.claim.startsWith("hook:")) continue;
  let body:{type?:string;value?:string};try{body=JSON.parse(f.basis);}catch{continue;}
  if(body.type!=="command") continue;
  for(const e of detectedEntrypoints(s).filter(e=>e.scope.cli===a.name&&e.command===body.value)) {
   const fact:Fact={subject:"harness.verification-wiring",claim:"trigger",status:"holds",
    scope:e.scope,basis:"Literal hook event "+f.claim.slice(5),complete:true};
   out.push({...o,scope:e.scope,facts:[fact],limits:[...o.limits,"Input, evaluator and result delivery require separate evidence"]});
  }
  if(["hook:Stop","hook:agentStop"].includes(f.claim))
   out.push({...o,detector:"loop.stop-gate.command@1",facts:[signal("loop","stop_event",f.basis,o.scope)]});
 }
 const ids=new Set(out.map(o=>o.detector));
 for(const d of c.detectors) if(!ids.has(d.id))
  out.push(supported.has(d.id)
   ?observe(d.id,[],{},[],["No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable"])
   :observe(d.id,[],{},[],["No supported input for this detector"],["detector_unsupported: "+d.id]));
 return out.sort((a,b)=>canonical(a).localeCompare(canonical(b)));
}
```

- [ ] 4. Run the focused test; expect exit 0 and 3 passing tests. Then run the whole suite; expect 0 failures.

```sh
bun test tests/detectors/registry.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the planning run does not commit.

```sh
git add -- src/detectors/index.ts tests/detectors/registry.test.ts
git commit -m '🐛 fix(detectors): report unsupported only for detectors without a producer'
```
