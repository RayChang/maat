# T17 — Run the detector registry and retain unsupported observations

All 28 registered detectors return observations, including detector_unsupported for grammars outside the v1 bounded subset. Absence of a detector result is never a negative fact. Repeated detector IDs are allowed because observations retain separate scope and material bindings. Hook command matching requires exact literal command equality within the selected CLI; it establishes only a declared trigger. No tests, hooks, shells, models, or network clients are invoked.

## Files

- Create: `src/detectors/index.ts`.
- Modify: None.
- Test path: `tests/detectors/registry.test.ts`.

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
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
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
export type ScanData = Omit<Snapshot,"materials"> & { materials:Material[] };
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
export declare function makeScan(i: Inventory, p: Policy, adapters?: AdapterResult[], observations?: Observation[]): ScanData;
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
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
```

Produces:

```ts
export declare function runDetectors(snapshot: ScanData, policy: Policy, catalog: Catalog): Observation[];
```

## Steps

- [ ] 1. Write the failing test at `tests/detectors/registry.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { runDetectors } from "../../src/detectors";
import { loadCatalog } from "../../src/catalog/load";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
test("every registry entry is represented and same inputs are stable",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const a=runDetectors(s,p,c),b=runDetectors(s,p,c);
 expect(a).toEqual(b);
 expect([...new Set(a.map(o=>o.detector))].sort()).toEqual(c.detectors.map(d=>d.id).sort());
 expect(a.flatMap(o=>o.facts).every(f=>f.status!=="holds")).toBe(true);
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/detectors'`.

```sh
bun test tests/detectors/registry.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

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
  out.push(observe(d.id,[],{},[],["No supported input for this detector"],["detector_unsupported: "+d.id]));
 return out.sort((a,b)=>canonical(a).localeCompare(canonical(b)));
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/detectors/registry.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/detectors/index.ts tests/detectors/registry.test.ts
git commit -m '✨ feat(detectors): compose deterministic observations with explicit limits'
```

