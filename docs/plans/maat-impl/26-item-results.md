# T26 — Aggregate item results and scoped prerequisites

DECISION (implementer default): itemClaims below names each existing catalog requirement; these names are wire identifiers for human evidence and are not additional thresholds. A claim covering multiple selected topics, controls, nodes, edges, or obligations means all selected members, as stated in the catalog. A reasoned non-applicable subcomponent (for example no build) is confirmed within its claim; it does not remove the whole item. Recovery is evaluated per explicit effect: local-source uses local, another named effect uses other_effects, and an unknown effect keeps both unknown. Valid exemptions are reported but do not manufacture verified or grant capabilities. baseline.when false remains an applicable advanced finding.

## Files

- Create: `src/evaluate/items.ts`.
- Modify: None.
- Test path: `tests/evaluate/items.test.ts`.

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
// T02
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; constructor(code: 1 | 2 | 3 | 4, message: string); }
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
// T18
export declare function resolveClaim(subject: string, claim: string, scope: Scope, snapshot: Snapshot, policy: Policy, now: string, userCheck?: string, userClaim?: string): Claim;
// T19
export declare const capabilityRules: Record<string,{check:string;claim:string;fields:string[]}>;
// T20
export declare const foundationClaims: Record<string,string[]>;
// T21
export declare const promptClaims: Record<string,string[]>;
// T22
export declare const contextClaims: Record<string,string[]>;
// T23
export declare const harnessClaims: Record<string,string[]>;
// T24
export declare const loopClaims: Record<string,string[]>;
// T25
export declare const graphClaims: Record<string,string[]>;
```

Produces:

```ts
export declare const itemClaims: Record<string,string[]>;
export declare function evaluationScopes(snapshot: Snapshot, policy: Policy): Scope[];
export declare function evaluateItems(catalog: Catalog, snapshot: Snapshot, policy: Policy, capabilities: CapabilityResult[], now: string, assessments?: Assessment[]): ItemResult[];
```

## Steps

- [ ] 1. Write the failing test at `tests/evaluate/items.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { evaluateItems } from "../../src/evaluate/items";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("unknown applicability, partial, and complete negative stay distinct",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 expect(evaluateItems(c,s,p,[],"2026-11-04").find(i=>i.id==="prompt.task-spec")!.result).toBe("unknown");
 p.applicability["prompt.task-spec"]={status:"applicable"};p.targets["prompt.task-spec"]={baseline:true};
 s.observations=[{detector:"fixture",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[
 {subject:"prompt.task-spec",claim:"goal",status:"holds",scope:{},basis:"test declaration",complete:true}]}];
 expect(evaluateItems(c,s,p,[],"2026-11-04").find(i=>i.id==="prompt.task-spec")!.result).toBe("partial");
 s.observations[0]!.facts=["goal","scope","constraints","acceptance"].map(claim=>({subject:"prompt.task-spec",claim,status:"fails",scope:{},basis:"Complete negative evidence",complete:true}));
 expect(evaluateItems(c,s,p,[],"2026-11-04").find(i=>i.id==="prompt.task-spec")!.result).toBe("missing");
});
test("a complete scoped negative with no positive subclaim is missing",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();p.applicability["prompt.task-spec"]={status:"applicable"};
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[{detector:"fixture",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[
 {subject:"prompt.task-spec",claim:"goal",status:"fails",scope:{},basis:"Complete scoped negative",complete:true}]}];
 expect(evaluateItems(c,s,p,[],"2026-11-04").find(i=>i.id==="prompt.task-spec")!.result).toBe("missing");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/evaluate/items'`.

```sh
bun test tests/evaluate/items.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/evaluate/items.ts** (complete file)

```ts
import type { Catalog } from "../catalog/types";
import type { Snapshot,Policy,Scope,ItemResult,Claim,CapabilityResult,Layer,Truth,Assessment } from "../models";
import { MaatError } from "../errors";
import { canonical,sameScope } from "../canonical";
import { resolveClaim } from "./truth";
import { decisionValid,attestationIssues } from "../evidence/validate";
import { capabilityRules } from "./capabilities";
import { foundationClaims } from "./contracts/foundation";
import { promptClaims } from "./contracts/prompt";
import { contextClaims } from "./contracts/context";
import { harnessClaims } from "./contracts/harness";
import { loopClaims } from "./contracts/loop";
import { graphClaims } from "./contracts/graph";
export const itemClaims:Record<string,string[]>={...foundationClaims,...promptClaims,...contextClaims,...harnessClaims,...loopClaims,...graphClaims};
export function evaluationScopes(s:Snapshot,p:Policy):Scope[] {
 const scopes:Scope[]=[...s.observations.map(o=>o.scope),...p.attestations.filter(x=>x.scope).map(x=>x.scope),...Object.values(p.applicability).flatMap(d=>(d.loops??[]).map(l=>({workflow:l.scope})))];
 if(!scopes.length) scopes.push(...(s.target_clis.length?s.target_clis.map(cli=>({cli})):[{}]));
 return [...new Map(scopes.map(x=>[canonical(x),x])).values()].sort((a,b)=>canonical(a).localeCompare(canonical(b)));
}
export function evaluateItems(c:Catalog,s:Snapshot,p:Policy,caps:CapabilityResult[],now:string,assessments:Assessment[]=[]):ItemResult[] {
 const ids=new Set(c.items.map(i=>i.id));
 for(const a of p.attestations) {
  if(!ids.has(a.check)) throw new MaatError(3,"unknown_check: "+a.check);
  const aliases=Object.values(capabilityRules).filter(r=>r.check===a.check).flatMap(r=>[r.claim,...r.fields]);
  if(Array.isArray(a.claims) && a.claims.some(k=>![...(itemClaims[a.check]??[]),...aliases,"in_use"].includes(k)))
   throw new MaatError(3,"unknown_claim: "+a.check);
 }
 for(const key of [...Object.keys(p.targets),...p.exemptions.map(e=>e.check)])
  if(!ids.has(key)) throw new MaatError(3,"unknown_check: "+key);
 const out:ItemResult[]=[];
 for(const scope of evaluationScopes(s,p)) for(const i of c.items) {
  const selected=p.applicability[i.id]??p.applicability[i.layer.primary];
  const decision=selected??{status:"unknown" as const};
  const usage=p.attestations.some(a=>a.check===i.id&&a.claims?.includes("in_use")&&a.scope&&sameScope(a.scope,scope)&&!attestationIssues(a,s.materials,s.versions,scope,now).length);
  const invalidNA=decision.status==="not_applicable"&&(!decisionValid(decision,now)||usage);
  const app=invalidNA||(scope.cli&&!s.target_clis.includes(scope.cli))?"unknown":decision.status;
  const names=i.id==="harness.recovery"&&scope.effect
   ?[scope.effect==="local-source"?"local":"other_effects"]:itemClaims[i.id];
  if(!names) throw new MaatError(3,"item_contract_unsupported: "+i.id);
  const findCap=(id:string)=>caps.find(x=>x.id===id&&sameScope(x.scope,scope));
  const claims:Claim[]=names.map(name=>{
   const cap=i.id==="foundation.verify-entrypoints"?(name==="declared"?"verify.entrypoint-declared@1":"verify.entrypoint-documented@1")
    :i.id==="harness.recovery"?(name==="local"?"recovery.local-source-plan-declared@1":"recovery.effect-plan-declared@1"):undefined;
   if(cap){const x=findCap(cap);return {name,status:x?.status??"unknown",basis:x?.basis??[]};}
   if(i.id==="loop.feedback-routing"){
    const x=findCap("loop.feedback-routing-declared@1")?.claims.find(x=>x.name===name);
    return x??{name,status:"unknown",basis:[]};
   }
   return resolveClaim(i.id,name,scope,s,p,now);
  });
  const known=claims.filter(x=>x.status==="holds").length;
  const result=app==="not_applicable"?"not_applicable":app!=="applicable"?"unknown":
   known===claims.length&&known>0?"verified":known>0?"partial":claims.length>0&&claims.some(x=>x.status==="fails")?"missing":"unknown";
  const prerequisites={required:i.prerequisites.required.map(r=>{
   const capability=typeof r==="string"?r:r.capability;return {capability,status:findCap(capability)?.status??"unknown" as Truth};
  }),recommended:i.prerequisites.recommended.map(capability=>({capability,status:findCap(capability)?.status??"unknown" as Truth}))};
  if(i.id==="harness.verification-wiring") {
   prerequisites.required.push({capability:"verify.entrypoint-declared@1",status:findCap("verify.entrypoint-declared@1")?.status==="holds"?"holds":"unknown"});
   prerequisites.recommended.push({capability:"verify.entrypoint-documented@1",status:findCap("verify.entrypoint-documented@1")?.status??"unknown"});
  }
  const condition=p.targets[i.id]?.baseline;
  const diagnostics:string[]=invalidNA?["invalid_or_conflicting_applicability"]:[];
  if(p.exemptions.some(e=>e.check===i.id&&(!e.scope||sameScope(e.scope,scope))))
   diagnostics.push("exemption_recorded_separately");
  const when_status:Truth=i.baseline.proposed_tier==="advanced"?"fails":condition===true?"holds":condition===false?"fails":"unknown";
  out.push({id:i.id,item_version:i.item_version,layer:i.layer.primary as Layer,scope,
   applicability:{status:app,reason:decision.reason??"",questions:i.applicability.questions},
   result,claims,observations:s.observations.filter(o=>sameScope(o.scope,scope)),
   assessments:assessments.filter(a=>a.check===i.id&&sameScope(a.scope,scope)),
   attestations:p.attestations.flatMap((a,n)=>{
    if(a.check!==i.id||!a.scope||!sameScope(a.scope,scope)) return [];
    const issues=attestationIssues(a,s.materials,s.versions,scope,now);
    return [{ref:String(n),valid:!issues.length,invalid_reason:issues.length?issues.join(","):null}];
   }),prerequisites,baseline:{tier:i.baseline.proposed_tier,when_status},diagnostics});
 }
 return out;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/evaluate/items.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/evaluate/items.ts tests/evaluate/items.test.ts
git commit -m '✨ feat(evaluate): evaluate catalog items with scoped partial results'
```

