# T27 — Apply layer prerequisites and the catalog truth table

Applicability comes from the existing applicability entries. Material-bound user attestations and observations retain their own scopes. Conditional requirements that cannot be established from the existing contract inputs remain unknown; no new policy fields encode those answers. If every potentially required capability already holds in scope, it satisfies either branch. Foundation, Prompt and Context have no required capabilities. Recovery remains candidate policy. File presence never proves actual usage.

## Files

- Create: `src/evaluate/layers.ts`.
- Modify: None.
- Test path: `tests/evaluate/layers.test.ts`.

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
export declare function sameScope(a: Scope, b: Scope): boolean;
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
// T07
export declare function attestationIssues(a: Attestation, materials: Fingerprint[], versions: Versions, scope: Scope, now: string): string[];
// T07
export declare function decisionValid(value: { reason?: string; owner?: string; expires_at?: string }, now: string): boolean;
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T26
export declare function evaluationScopes(snapshot: Snapshot, policy: Policy): Scope[];
```

Produces:

```ts
export declare function evaluateLayers(catalog: Catalog, snapshot: Snapshot, policy: Policy, items: ItemResult[], capabilities: CapabilityResult[], now: string, authoritative: boolean): LayerResult[];
```

## Steps

- [ ] 1. Write the failing test at `tests/evaluate/layers.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { evaluateLayers } from "../../src/evaluate/layers";
import { loadCatalog } from "../../src/catalog/load";
import { makeSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
test("unknown requirements block, unknown applicability stays pending, empty cannot adopt",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 p.applicability.loop={status:"applicable",reason:"Feedback workflow"};
 const layers=evaluateLayers(c,s,p,[],[],"2026-11-04",true);
 expect(layers.find(l=>l.layer==="loop")!.status).toBe("blocked");
 expect(layers.find(l=>l.layer==="graph")!.status).toBe("pending");
 p.applicability={foundation:{status:"applicable",reason:"Code project"}};
 expect(evaluateLayers(c,s,p,[],[],"2026-11-04",true).find(l=>l.layer==="foundation")!.status).toBe("ready");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/evaluate/layers'`.

```sh
bun test tests/evaluate/layers.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/evaluate/layers.ts** (complete file)

```ts
import type { Layer,ItemResult,CapabilityResult,LayerResult,Snapshot,Policy } from "../models";
import type { Catalog } from "../catalog/types";
import { sameScope } from "../canonical";
import { decisionValid,attestationIssues } from "../evidence/validate";
import { evaluationScopes } from "./items";
export function evaluateLayers(c:Catalog,s:Snapshot,p:Policy,items:ItemResult[],caps:CapabilityResult[],now:string,authoritative:boolean):LayerResult[] {
 const out:LayerResult[]=[];
 const layers:Layer[]=["foundation","prompt","context","harness","loop","graph"];
 for(const scope of evaluationScopes(s,p)) for(const layer of layers) {
  const fallback=p.applicability[layer];
  const usage=p.attestations.some(a=>a.check.startsWith(layer+".")&&a.claims?.includes("in_use")&&a.scope&&sameScope(a.scope,scope)&&!attestationIssues(a,s.materials,s.versions,scope,now).length);
  let app=fallback?.status??"unknown";
  if(scope.cli&&!s.target_clis.includes(scope.cli))app="unknown";
  const valid=fallback;
  if(app==="not_applicable" && (!valid||!decisionValid(valid,now)||usage)) app="unknown";
  const required:string[]=[],unknown:string[]=[],missing:string[]=[];
  const holds=(id:string)=>caps.some(c=>c.id===id&&sameScope(c.scope,scope)&&c.status==="holds");
  if(layer==="harness"&&!(holds("verify.entrypoint-declared@1")&&holds("verify.entrypoint-documented@1")))
   unknown.push("worker_evaluation_requirement");
  if((layer==="loop"||layer==="graph")&&!holds("evaluation.config-declared@1"))unknown.push("conditional_evaluation_requirement");
  for(const id of required) {
   const status=caps.find(x=>x.id===id&&sameScope(x.scope,scope))?.status??"unknown";
   if(status==="fails")missing.push(id);else if(status==="unknown")unknown.push(id);
  }
  const selected=items.filter(i=>i.layer===layer&&sameScope(i.scope,scope));
  const gaps=selected.filter(i=>i.baseline.tier==="baseline" &&
   (i.applicability.status==="unknown"||i.baseline.when_status==="unknown"||
    (i.applicability.status==="applicable"&&i.baseline.when_status==="holds"&&i.result!=="verified"))).map(i=>i.id);
  const evaluated=selected.some(i=>i.result==="verified"||i.result==="partial"||i.result==="missing");
  const status:LayerResult["status"]=app==="unknown"?"pending":app==="not_applicable"?"not_applicable":
   missing.length||unknown.length?(usage?"in_use_unsupported":"blocked"):
   gaps.length||!selected.length||!evaluated?"ready":"adopted";
  out.push({layer,scope,status,authoritative,missing_required:missing,unknown_required:unknown,
   baseline_gaps:gaps,usage_signals:usage?["attested scoped use"]:[]});
 }
 return out;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/evaluate/layers.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/evaluate/layers.ts tests/evaluate/layers.test.ts
git commit -m '✨ feat(evaluate): derive scoped layer states without scores'
```

