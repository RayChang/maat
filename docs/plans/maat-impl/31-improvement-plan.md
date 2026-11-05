# T31 — Produce dependency-ordered plans with material and template binding

DECISION (implementer default): no --target selects the three minimal startup checks (entrypoints, task specification, instruction authority), plus prerequisites of those checks. An explicit layer expands that layer's non-verified applicable/unknown items; an explicit check selects that check. Unknown commands, target locations, CLI choice, resource values, or distribution repository yield ask actions. Paths and known literals are taken only from observed evidence; missing values stay questions. No placeholder command is printed as executable. Every action needs plan approval; role_approval_required separately preserves the catalog's needs_approval. Each generated plan allows one initial attempt and zero automatic fixes; a human can approve an explicitly amended finite plan. Neither an action nor its template is applied. DECISION (implementer default): ask actions permit clarification only. A host may record a manual evaluation proving the requested check already holds, with an authoritative report bound to the unchanged checkpoint. An ask action never permits a before checkpoint or a command; if edits are needed, regenerate the plan and open a new flow after answering the questions.

## Files

- Create: `src/plan/types.ts`, `src/plan/index.ts`.
- Modify: None.
- Test path: `tests/plan/build.test.ts`.

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
export interface Args { command: string; positionals: string[]; flags: Record<string, string[]>; }
// T02
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; constructor(code: 1 | 2 | 3 | 4, message: string); }
// T02
export declare function one(args: Args, flag: string): string | undefined;
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
// T04
export declare function assertAcyclic(graph: Record<string, string[]>): void;
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
export declare function policySkeleton(catalogVersion?: string): string;
// T06
export interface Shape { type?: "object"|"array"|"string"|"number"|"boolean"; required?: string[]; properties?: Record<string,Shape>; additionalProperties?: boolean | Shape; items?: Shape; enum?: unknown[]; minItems?: number; minLength?: number; pattern?: string; }
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T12
export declare function copilot(materials: Material[]): AdapterResult;
// T19
export declare const capabilityRules: Record<string,{check:string;claim:string;fields:string[]}>;
// T28
export declare function buildReport(snapshot: Snapshot, policy: Policy, catalog: Catalog, now: string, policyPath?: string | null, overridden?: boolean, policyDiagnostics?: string[], assessments?: Assessment[]): Report;
// T28
export declare function reportFingerprints(report: Report): Fingerprint[];
// T28
export declare function reportVersionBinding(report: Report): Versions;
// T30
export declare function renderTemplate(template: Template, inputs: Record<string,string>): string;
// T30
export interface Template { id:string;version:number;layer:string;rule_card:{id:string;version:number};checks:string[];form:'text'|'config'|'script';parameters:string[];path:string;body:string;supports:string[];cannot_prove:string[];support:string; }
// T30
export declare const templateDefinitions: Template[];
```

Produces:

```ts
export interface PlanAction {
 id:string;check:string;scope:Scope;item_version:number;rule_cards:{id:string;version:number}[];
 template:{id:string;version:number;body:string}|null;current:string;target:string;
 kind:"ask"|"modify"|"command";actions:string[];target_path:string|null;command:string|null;
 depends_on:string[];necessity:"required"|"recommended";risk:string;needs_approval:boolean;
 role_approval_required:boolean;verification:{detectors:string[];expected:unknown;manual:string};
 fingerprints:Fingerprint[];fix_conditions:{max_fixes:number};stop_conditions:string[];
}
export interface Plan {
 report_schema:string;versions:Versions;catalog_version:string;repository:{path:string;repo_id:string};
 source_report_fingerprint:string;plan_fingerprint:string;actions:PlanAction[];
 fingerprints:Fingerprint[];authoritative:boolean;diagnostics:string[];
}
export declare function buildPlan(report: Report, targets: string[], catalog: Catalog): Plan;
export declare function renderPlan(plan: Plan): string;
export declare function parsePlan(text: string): Plan;
```

## Steps

- [ ] 1. Write the failing test at `tests/plan/build.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { buildPlan,parsePlan } from "../../src/plan";
import { buildReport } from "../../src/report";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
import { loadCatalog } from "../../src/catalog/load";
test("new project plan asks before guessing and binds its exact content",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const report=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const plan=buildPlan(report,[],c);
 expect(plan.actions).toHaveLength(3);
 expect(plan.actions.every(a=>a.kind==="ask"&&a.target_path===null)).toBe(true);
 expect(plan.actions.every(a=>a.needs_approval&&a.fix_conditions.max_fixes===0)).toBe(true);
 expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
 const changed=structuredClone(plan);changed.actions[0]!.actions.push("Changed");
 expect(()=>parsePlan(JSON.stringify(changed))).toThrow("plan_fingerprint");
 expect(()=>buildPlan(report,["absent"],c)).toThrow("unknown_target");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/plan'`.

```sh
bun test tests/plan/build.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/plan/types.ts** (complete file)

```ts
import type { Versions } from "../versions";
import type { Scope,Fingerprint } from "../models";
export interface PlanAction {
 id:string;check:string;scope:Scope;item_version:number;rule_cards:{id:string;version:number}[];
 template:{id:string;version:number;body:string}|null;current:string;target:string;
 kind:"ask"|"modify"|"command";actions:string[];target_path:string|null;command:string|null;
 depends_on:string[];necessity:"required"|"recommended";risk:string;needs_approval:boolean;
 role_approval_required:boolean;verification:{detectors:string[];expected:unknown;manual:string};
 fingerprints:Fingerprint[];fix_conditions:{max_fixes:number};stop_conditions:string[];
}
export interface Plan {
 report_schema:string;versions:Versions;catalog_version:string;repository:{path:string;repo_id:string};
 source_report_fingerprint:string;plan_fingerprint:string;actions:PlanAction[];
 fingerprints:Fingerprint[];authoritative:boolean;diagnostics:string[];
}
```

**src/plan/index.ts** (complete file)

```ts
import { reportFingerprints,reportVersionBinding } from "../report";
import { checkShape } from "../schema";
import type { Report,Scope } from "../models";
import type { Catalog } from "../catalog/types";
import type { Plan,PlanAction } from "./types";
import { MaatError } from "../errors";
import { canonical,sha256 } from "../canonical";
import { assertAcyclic } from "../catalog/validate";
import { capabilityRules } from "../evaluate/capabilities";
import { templateDefinitions,renderTemplate } from "./templates";
import { policySkeleton } from "../policy/load";
export function buildPlan(r:Report,targets:string[],c:Catalog):Plan {
 const requested=targets.length?targets:["foundation.verify-entrypoints","prompt.task-spec","context.instruction-authority"];
 const layers=["foundation","prompt","context","harness","loop","graph"];
 for(const t of requested) if(!layers.includes(t)&&!c.items.some(i=>i.id===t))throw new MaatError(3,"unknown_target: "+t);
 const selected=r.items.filter(i=>requested.includes(i.id)||requested.includes(i.layer));
 const queue=[...selected],actions:PlanAction[]=[],seen=new Set<string>();
 const id=(check:string,scope:Scope)=>check+"-"+sha256(canonical(scope)).slice(0,8);
 while(queue.length) {
  const item=queue.shift()!;
  if(item.result==="verified"||item.result==="not_applicable"||seen.has(id(item.id,item.scope)))continue;
  seen.add(id(item.id,item.scope));
  const contract=c.items.find(i=>i.id===item.id)!;
  const depends_on:string[]=[];
  for(const req of item.prerequisites.required.filter(x=>x.status!=="holds")) {
   const provider=capabilityRules[req.capability]?.check;
   const candidate=r.items.find(x=>x.id===provider&&canonical(x.scope)===canonical(item.scope));
   if(candidate && candidate.result!=="verified"){queue.push(candidate);depends_on.push(id(candidate.id,candidate.scope));}
  }
  const resource=templateDefinitions.find(t=>t.checks.includes(item.id));
  const refs=item.observations.filter(o=>contract.inspection.detectors.includes(o.detector)).flatMap(o=>o.evidence);
  const paths=[...new Set(refs.map(e=>e.path).filter(path=>path.endsWith(".md")))];
  const target_path=paths.length===1?paths[0]!:null;
  const facts=item.observations.flatMap(o=>o.facts).filter(f=>f.status==="holds");
  const inputs:Record<string,string>={};
  const invocation=facts.find(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="invocation");
  const purpose=facts.find(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="purpose");
  if(invocation)inputs.command=invocation.basis;if(purpose)inputs.purpose=purpose.basis;
  let template:PlanAction["template"]=null;
  const questions:string[]=[];
  if(resource) {
   try{template={id:resource.id,version:resource.version,body:renderTemplate(resource,Object.fromEntries(resource.parameters.filter(k=>inputs[k]).map(k=>[k,inputs[k]!])))};}
   catch{questions.push("Ask for the missing template values: "+resource.parameters.filter(k=>!inputs[k]).join(", "));}
  }
  if(!target_path)questions.push("Ask for the target location.");
  if(!r.target_clis.length)questions.push("Ask which CLI is in scope.");
  if(contract.remediation.rule_cards.some(card=>card.id==="verify-before-done"))
   questions.push("If choosing the skill form, confirm the GitHub repository and CLI before preparing its separately authorized installation command.");
  if(!r.policy.path&&item.id==="context.instruction-authority")questions.push("Review this policy skeleton before an approved host saves it:\n"+policySkeleton());
  const command:string|null=null,fingerprints=reportFingerprints(r);
  actions.push({id:id(item.id,item.scope),check:item.id,scope:item.scope,item_version:item.item_version,
   rule_cards:contract.remediation.rule_cards,template,current:item.result,target:"verified",
   kind:questions.length?"ask":command?"command":"modify",
   actions:[...questions,...contract.remediation.actions],target_path,command,depends_on,
   necessity:item.baseline.when_status==="holds"?"required":"recommended",
   risk:contract.remediation.risk,needs_approval:true,role_approval_required:contract.remediation.needs_approval,
   verification:{detectors:contract.verification.rerun,expected:contract.verification.expected,
    manual:contract.verification.attestation.question},fingerprints,fix_conditions:{max_fixes:0},
   stop_conditions:["scope_change","fingerprint_drift","unknown_effect","no_progress","cancelled"]});
 }
 const graph=Object.fromEntries(actions.map(a=>[a.id,a.depends_on]));
 assertAcyclic(graph);
 const ordered:PlanAction[]=[],done=new Set<string>();
 const visit=(a:PlanAction)=>{if(done.has(a.id))return;for(const id of a.depends_on)visit(actions.find(x=>x.id===id)!);done.add(a.id);ordered.push(a);};
 actions.sort((a,b)=>a.id.localeCompare(b.id)).forEach(visit);
 const unsigned={report_schema:"1.0.0",versions:reportVersionBinding(r),catalog_version:c.catalog_version,repository:r.repository,
 source_report_fingerprint:sha256(canonical(r)),actions:ordered,fingerprints:reportFingerprints(r),
 authoritative:r.layers.every(l=>l.authoritative),diagnostics:r.diagnostics};
 return {...unsigned,plan_fingerprint:sha256(canonical(unsigned))};
}
export function renderPlan(p:Plan):string {
 return "# maat improvement plan\n\n"+p.actions.map(a=>"## "+a.id+"\n\n"+
 "Current: "+a.current+"; target: "+a.target+"; kind: "+a.kind+"\n\n"+
 a.actions.map(x=>"- "+x).join("\n")+"\n\nTarget: "+(a.target_path??"location requires confirmation")+
 "\n\nDependencies: "+a.depends_on.join(", ")+
 "\n\nApproval required: true; command authorization is separate.\n\n"+
 "Acceptance: "+canonical(a.verification)+"\n\n"+(a.template?.body??"")).join("\n")+"\n";
}
export function parsePlan(text:string):Plan {
 let p:Plan;try{p=JSON.parse(text);}catch{throw new MaatError(3,"plan_parse");}
 checkShape(p,{"type":"object","required":["report_schema","catalog_version","repository","source_report_fingerprint","plan_fingerprint","actions","fingerprints","authoritative","diagnostics","versions"],"properties":{"report_schema":{"type":"string","pattern":"^1\\."},"catalog_version":{"type":"string"},"repository":{"type":"object","required":["path","repo_id"],"properties":{"path":{"type":"string"},"repo_id":{"type":"string","pattern":"^[a-f0-9]{16}$"}}},"source_report_fingerprint":{"type":"string","pattern":"^[a-f0-9]{64}$"},"plan_fingerprint":{"type":"string","pattern":"^[a-f0-9]{64}$"},"actions":{"type":"array","items":{"type":"object","required":["id","check","scope","item_version","rule_cards","template","current","target","kind","actions","target_path","command","depends_on","necessity","risk","needs_approval","role_approval_required","verification","fingerprints","fix_conditions","stop_conditions"],"properties":{"kind":{"enum":["ask","modify","command"]},"depends_on":{"type":"array","items":{"type":"string"}},"needs_approval":{"type":"boolean"},"fix_conditions":{"type":"object","required":["max_fixes"],"properties":{"max_fixes":{"type":"number"}}},"id":{"type":"string"},"check":{"type":"string"},"current":{"type":"string"},"target":{"type":"string"},"risk":{"type":"string"},"scope":{"type":"object"},"item_version":{"type":"number"},"rule_cards":{"type":"array","items":{"type":"object","required":["id","version"],"properties":{"id":{"type":"string"},"version":{"type":"number"}}}},"actions":{"type":"array","items":{"type":"string"}},"necessity":{"enum":["required","recommended"]},"role_approval_required":{"type":"boolean"},"verification":{"type":"object","required":["detectors","expected","manual"],"properties":{"detectors":{"type":"array","items":{"type":"string"}},"manual":{"type":"string"}}},"fingerprints":{"type":"array","items":{"type":"object","required":["path","sha256"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}}}},"stop_conditions":{"type":"array","items":{"type":"string"}}}}},"fingerprints":{"type":"array","items":{"type":"object","required":["path","sha256"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}}}},"authoritative":{"type":"boolean"},"diagnostics":{"type":"array"},"versions":{"type":"object","required":["tool_version","catalog_version","report_schema","policy_schema","ledger_schema","adapters"],"properties":{"tool_version":{"type":"string"},"catalog_version":{"type":"string"},"report_schema":{"type":"string"},"policy_schema":{"type":"string"},"ledger_schema":{"type":"string"},"adapters":{"type":"array","items":{"type":"object","required":["name","adapter_version","verified_cli_range","checked_at"],"properties":{"name":{"type":"string"},"adapter_version":{"type":"string"},"verified_cli_range":{"type":"string"},"checked_at":{"type":"string"}}}}}}}});
 for(const a of p.actions)if((a.target_path!==null&&typeof a.target_path!=="string")||(a.command!==null&&typeof a.command!=="string")||!Number.isInteger(a.fix_conditions.max_fixes)||a.fix_conditions.max_fixes<0)throw new MaatError(3,"plan_shape");
 const {plan_fingerprint,...unsigned}=p;
 if(sha256(canonical(unsigned))!==plan_fingerprint)throw new MaatError(3,"plan_fingerprint");
 assertAcyclic(Object.fromEntries(p.actions.map(a=>[a.id,a.depends_on])));
 return p;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/plan/build.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/plan/types.ts src/plan/index.ts tests/plan/build.test.ts
git commit -m '✨ feat(plan): produce finite improvement plans and explicit questions'
```

