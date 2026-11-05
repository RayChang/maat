# T28 — Build JSON and summary-first Markdown from one evaluated report

Catalog overrides and unapproved catalog policy remain non-authoritative. The report uses the interface §5.1 fields; fingerprints are derived from its existing evidence references when planning. Agent assessments are passed separately from policy. DECISION (implementer default): retain valid_until as the earliest evidence/applicability/exemption expiry, because the required report fields omit those dates and the accept guard must re-check current validity under architecture §8.3.

## Files

- Create: `src/report/index.ts`.
- Modify: None.
- Test path: `tests/report/render.test.ts`.

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
export declare function checkShape(value: unknown, shape: Shape, path?: string): void;
// T06
export declare function emptyPolicy(catalogVersion?: string): Policy;
// T06
export interface Shape { type?: "object"|"array"|"string"|"number"|"boolean"; required?: string[]; properties?: Record<string,Shape>; additionalProperties?: boolean | Shape; items?: Shape; enum?: unknown[]; minItems?: number; minLength?: number; pattern?: string; }
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T19
export declare function evaluateCapabilities(catalog: Catalog, scopes: Scope[], snapshot: Snapshot, policy: Policy, now: string): CapabilityResult[];
// T26
export declare function evaluateItems(catalog: Catalog, snapshot: Snapshot, policy: Policy, capabilities: CapabilityResult[], now: string, assessments?: Assessment[]): ItemResult[];
// T26
export declare function evaluationScopes(snapshot: Snapshot, policy: Policy): Scope[];
// T27
export declare function evaluateLayers(catalog: Catalog, snapshot: Snapshot, policy: Policy, items: ItemResult[], capabilities: CapabilityResult[], now: string, authoritative: boolean): LayerResult[];
```

Produces:

```ts
export declare function buildReport(snapshot: Snapshot, policy: Policy, catalog: Catalog, now: string, policyPath?: string | null, overridden?: boolean, policyDiagnostics?: string[], assessments?: Assessment[]): Report;
export declare function renderReport(report: Report): string;
export declare function parseReport(text: string): Report;
export declare function reportFingerprints(report: Report): Fingerprint[];
export declare function reportVersionBinding(report: Report): Versions;
```

## Steps

- [ ] 1. Write the failing test at `tests/report/render.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { buildReport, renderReport, parseReport } from "../../src/report";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
import { loadCatalog } from "../../src/catalog/load";
test("report order, separate evidence, and unapproved policy",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p,
 [{name:"codex",adapter_version:"1.0.0",verified_cli_range:">=0",checked_at:"2026-11-04",sources:["https://example.test/doc"],surfaces:[{surface:"runtime",support:"unknown",reason:"r",paths:["p"]}],observations:[]}]);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z",null,true);
 const md=renderReport(r);
 const labels=["## Summary","## Layer findings","## Item details","## Protection observations","## Scope and limits","## Versions"];
 expect(labels.map(x=>md.indexOf(x))).toEqual(labels.map(x=>md.indexOf(x)).sort((a,b)=>a-b));
 expect(md).toContain("Machine observations | Agent assessments | User attestations");
 expect(r.layers.every(x=>!x.authoritative)).toBe(true);
 expect(r.diagnostics).toContain("catalog_overridden");
 expect(parseReport(JSON.stringify(r))).toEqual(r);
 expect(Object.keys(r)).not.toContain("score");
 expect(Object.keys(r.adapters[0]!)).not.toContain("sources");expect(Object.keys(r.adapters[0]!)).not.toContain("observations");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/report'`.

```sh
bun test tests/report/render.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/report/index.ts** (complete file)

```ts
import type { Report,Snapshot,Policy,ProtectionObservation,Assessment,Fingerprint } from "../models";
import type { Catalog } from "../catalog/types";
import { versions } from "../versions";
import { evaluationScopes,evaluateItems } from "../evaluate/items";
import { evaluateCapabilities } from "../evaluate/capabilities";
import { evaluateLayers } from "../evaluate/layers";
import { canonical } from "../canonical";
import { checkShape } from "../schema";
import { MaatError } from "../errors";
export function buildReport(s:Snapshot,p:Policy,c:Catalog,now:string,policyPath:string|null=null,overridden=false,policyDiagnostics:string[]=[],assessments:Assessment[]=[]):Report {
 const capabilities=evaluateCapabilities(c,evaluationScopes(s,p),s,p,now);
 const items=evaluateItems(c,s,p,capabilities,now,assessments);
 const authoritative=c.approved&&!overridden&&s.versions.catalog_version===c.catalog_version;
 const layers=evaluateLayers(c,s,p,items,capabilities,now,authoritative);
 const diagnostics=[...s.scope.diagnostics,...policyDiagnostics,...s.observations.flatMap(o=>o.diagnostics)];
 if(overridden)diagnostics.push("catalog_overridden");
 if(!c.approved)diagnostics.push("policy_unapproved");
 if(s.versions.catalog_version!==c.catalog_version)diagnostics.push("catalog_version_mismatch");
 const invalid=items.flatMap(i=>i.attestations.filter(a=>!a.valid).map(a=>a.invalid_reason!));
 const protection_observations:ProtectionObservation[]=s.observations.filter(o=>o.detector==="permissions.declarations@1")
 .flatMap(o=>o.facts.filter(f=>f.claim==="deny").map(f=>({measure:"Declared deny rules",protects:f.basis,
 threat:"Unconfirmed threat model",boundary:"Repository configuration",evidence:o.evidence,
 unknown:["Runtime enforcement","Other write paths",...o.limits]})));
 const expiries=[...p.attestations.map(a=>a.expires_at),...Object.values(p.applicability).map(d=>d.expires_at),
 
 ...p.exemptions.map(d=>d.expires_at)].filter((x):x is string=>!!x&&Number.isFinite(Date.parse(x)));
 const valid_until=expiries.length?new Date(Math.min(...expiries.map(Date.parse))).toISOString():null;
 return {valid_until,report_schema:versions.report_schema,tool_version:versions.tool_version,catalog_version:c.catalog_version,
 adapters:s.adapters.map(({name,adapter_version,verified_cli_range,checked_at,surfaces})=>({name,adapter_version,verified_cli_range,checked_at,
 surfaces:surfaces.map(({surface,support,reason})=>({surface,support,reason}))})),generated_at:now,repository:s.repository,scope:s.scope,target_clis:s.target_clis,
 policy:{path:policyPath,policy_schema:p.policy_schema,valid:!invalid.length&&!policyDiagnostics.length,
 diagnostics:[...policyDiagnostics,...invalid]},items,capabilities:capabilities.map(({id,status,scope,basis})=>({id,status,scope,basis})),layers,protection_observations,
 diagnostics:[...new Set(diagnostics)].sort()};
}
const cell=(v:unknown)=>canonical(v).replaceAll("|","\\|").replaceAll("\n"," ");
export function renderReport(r:Report):string {
 const lines=["# maat audit report","","## Summary","",
 "| Layer / scope | State | Required gaps | Unknown requirements |","|---|---|---|---|"];
 for(const l of r.layers) lines.push("| "+[l.layer+" "+cell(l.scope),l.status,cell(l.missing_required),cell(l.unknown_required)].join(" | ")+" |");
 lines.push("","Pending items: "+r.items.filter(i=>i.result==="unknown").length,
 "Authoritative: "+r.layers.every(l=>l.authoritative),"","## Layer findings","");
 for(const l of r.layers) {
  lines.push("### "+l.layer+" "+cell(l.scope),"","Baseline gaps: "+cell(l.baseline_gaps));
  for(const i of r.items.filter(i=>i.layer===l.layer&&canonical(i.scope)===canonical(l.scope)&&
   (i.baseline.tier==="advanced"||i.baseline.when_status==="fails"))) lines.push("- "+i.id+": "+i.result);
 }
 lines.push("","## Item details","","| Item / scope / result | Machine observations | Agent assessments | User attestations |","|---|---|---|---|");
 for(const i of r.items) lines.push("| "+[i.id+" "+cell(i.scope)+" "+i.result,cell(i.observations),cell(i.assessments),cell(i.attestations)].join(" | ")+" |",
 "\nClaims: "+cell(i.claims)+"; applicability: "+cell(i.applicability)+"; prerequisites: "+cell(i.prerequisites)+"; diagnostics: "+cell(i.diagnostics)+"\n");
 lines.push("","## Protection observations","");
 for(const p of r.protection_observations) lines.push("- "+cell(p));
 lines.push("","## Scope and limits","",cell(r.repository),cell(r.scope),cell(r.diagnostics),
 "Static declarations do not establish runtime enforcement. Role identities are source-provided.",
 "","## Versions","",cell({tool_version:r.tool_version,report_schema:r.report_schema,catalog_version:r.catalog_version,policy_schema:r.policy.policy_schema,adapters:r.adapters}));
 return lines.join("\n")+"\n";
}
export function parseReport(text:string):Report {
 let value:unknown;try{value=JSON.parse(text);}catch{throw new MaatError(3,"report_parse");}
 checkShape(value,{"type":"object","required":["report_schema","tool_version","catalog_version","adapters","generated_at","repository","scope","target_clis","policy","items","capabilities","layers","protection_observations","diagnostics","valid_until"],"properties":{"report_schema":{"type":"string","pattern":"^1\\."},"tool_version":{"type":"string"},"catalog_version":{"type":"string"},"adapters":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["name","adapter_version","verified_cli_range","checked_at","surfaces"],"properties":{"name":{"type":"string"},"adapter_version":{"type":"string"},"verified_cli_range":{"type":"string"},"checked_at":{"type":"string"},"surfaces":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["surface","support","reason"],"properties":{"surface":{"type":"string"},"support":{"enum":["supported","unsupported","unknown"]},"reason":{"type":"string"}}}}}}},"generated_at":{"type":"string"},"repository":{"type":"object","required":["path","repo_id"],"properties":{"path":{"type":"string"},"repo_id":{"type":"string","pattern":"^[a-f0-9]{16}$"}}},"scope":{"type":"object"},"target_clis":{"type":"array"},"policy":{"type":"object","required":["path","policy_schema","valid","diagnostics"],"properties":{"policy_schema":{"type":"string"},"valid":{"type":"boolean"},"diagnostics":{"type":"array","items":{"type":"string"}}}},"items":{"type":"array","items":{"type":"object","required":["id","item_version","layer","scope","applicability","result","claims","observations","assessments","attestations","prerequisites","baseline","diagnostics"],"properties":{"id":{"type":"string"},"item_version":{"type":"number"},"layer":{"enum":["foundation","prompt","context","harness","loop","graph"]},"scope":{"type":"object"},"applicability":{"type":"object","required":["status","reason","questions"],"properties":{"status":{"enum":["applicable","not_applicable","unknown"]},"reason":{"type":"string"},"questions":{"type":"array"}}},"result":{"enum":["verified","partial","missing","not_applicable","unknown"]},"claims":{"type":"array","items":{"type":"object","required":["name","status","basis"],"properties":{"name":{"type":"string"},"status":{"enum":["holds","fails","unknown"]},"basis":{"type":"array"}}}},"observations":{"type":"array","items":{"type":"object","required":["detector","version","scope","evidence","limits","facts","diagnostics"],"properties":{"detector":{"type":"string"},"version":{"type":"number"},"scope":{"type":"object"},"evidence":{"type":"array","items":{"type":"object","required":["path","sha256","lines"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"lines":{"type":"string","pattern":"^[1-9][0-9]*-[1-9][0-9]*$"},"quote":{"type":"string"}}}},"limits":{"type":"array"},"facts":{"type":"array","items":{"type":"object","required":["subject","claim","status","scope","basis","complete"],"properties":{"subject":{"type":"string"},"claim":{"type":"string"},"status":{"enum":["holds","fails","unknown"]},"scope":{"type":"object"},"basis":{"type":"string"},"complete":{"type":"boolean"}}}},"diagnostics":{"type":"array"}}}},"assessments":{"type":"array"},"attestations":{"type":"array","items":{"type":"object","required":["ref","valid","invalid_reason"],"properties":{"ref":{"type":"string"},"valid":{"type":"boolean"}}}},"prerequisites":{"type":"object","required":["required","recommended"],"properties":{"required":{"type":"array","items":{"type":"object","required":["capability","status"],"properties":{"capability":{"type":"string"},"status":{"enum":["holds","fails","unknown"]}}}},"recommended":{"type":"array","items":{"type":"object","required":["capability","status"],"properties":{"capability":{"type":"string"},"status":{"enum":["holds","fails","unknown"]}}}}}},"baseline":{"type":"object","required":["tier","when_status"],"properties":{"tier":{"enum":["baseline","advanced"]},"when_status":{"enum":["holds","fails","unknown"]}}},"diagnostics":{"type":"array"}}}},"capabilities":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","status","scope","basis"],"properties":{"id":{"type":"string"},"status":{"enum":["holds","fails","unknown"]},"scope":{"type":"object"},"basis":{"type":"array"}}}},"layers":{"type":"array","items":{"type":"object","required":["layer","scope","status","authoritative","missing_required","unknown_required","baseline_gaps","usage_signals"],"properties":{"status":{"enum":["adopted","ready","blocked","not_applicable","in_use_unsupported","pending"]},"authoritative":{"type":"boolean"}}}},"protection_observations":{"type":"array"},"diagnostics":{"type":"array"}}});
 return value as Report;
}
export function reportFingerprints(r:Report):Fingerprint[] {
 const refs=[...r.items.flatMap(i=>[...i.observations.flatMap(o=>o.evidence),...i.assessments.flatMap(a=>a.citations)]),
 ...r.protection_observations.flatMap(o=>o.evidence)];
 const byPath=new Map<string,Fingerprint>();
 for(const e of refs) {
  const prior=byPath.get(e.path);if(prior&&prior.sha256!==e.sha256)throw new MaatError(3,"report_fingerprint_conflict");
  byPath.set(e.path,{path:e.path,sha256:e.sha256});
 }
 return [...byPath.values()].sort((a,b)=>a.path.localeCompare(b.path));
}
export function reportVersionBinding(r:Report):import("../versions").Versions {
 return {...versions,tool_version:r.tool_version,report_schema:r.report_schema,policy_schema:r.policy.policy_schema,
 catalog_version:r.catalog_version,adapters:r.adapters.map(({name,adapter_version,verified_cli_range,checked_at})=>({name,adapter_version,verified_cli_range,checked_at}))};
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/report/render.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/report/index.ts tests/report/render.test.ts
git commit -m '✨ feat(report): render traceable reports with separate evidence columns'
```

