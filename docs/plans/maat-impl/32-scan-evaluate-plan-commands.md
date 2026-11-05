# T32 — Connect scan, snapshot reevaluation, and planning

DECISION (implementer default): evaluate reads only the explicit snapshot, policy/evidence files, and catalog. It retains raw observations and never re-runs detectors or opens target materials. Without --policy it uses empty policy choices; new answers must be supplied explicitly. Scan loads only the named repository policy (or explicit --policy), runs bounded detectors once, and captures their observations. Windows marks platform_unknown and makes layer output non-authoritative.

## Files

- Create: `src/cli/audit.ts`.
- Modify: None.
- Test path: `tests/cli/audit.test.ts`.

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
// T02
export declare function parseArgs(argv: string[]): Args;
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
export declare function validateCatalog(catalog: Catalog): void;
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
// T06
export declare function loadPolicy(path: string, catalogVersion: string, optional?: boolean): Promise<{ policy: Policy; diagnostics: string[] }>;
// T07
export interface EvidenceBundle { attestations:Attestation[];assessments:Assessment[]; }
// T07
export declare function loadEvidence(paths: string[]): Promise<EvidenceBundle>;
// T08
export declare function discover(root: string, scope: Policy['scope']): Promise<Inventory>;
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeScan(i: Inventory, p: Policy, adapters?: AdapterResult[], observations?: Observation[]): ScanData;
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T09
export declare function parseSnapshot(text: string): Snapshot;
// T10
export declare function claudeCode(materials: Material[]): AdapterResult;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T11
export declare function codex(materials: Material[]): AdapterResult;
// T12
export declare function copilot(materials: Material[]): AdapterResult;
// T17
export declare function runDetectors(snapshot: ScanData, policy: Policy, catalog: Catalog): Observation[];
// T28
export declare function buildReport(snapshot: Snapshot, policy: Policy, catalog: Catalog, now: string, policyPath?: string | null, overridden?: boolean, policyDiagnostics?: string[], assessments?: Assessment[]): Report;
// T28
export declare function parseReport(text: string): Report;
// T28
export declare function renderReport(report: Report): string;
// T31
export declare function buildPlan(report: Report, targets: string[], catalog: Catalog): Plan;
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
// T31
export declare function renderPlan(plan: Plan): string;
```

Produces:

```ts
export interface CommandResult { value:unknown;markdown:string;repository:string;kind:string;snapshot?:Snapshot; }
export declare function runAuditCommand(args: Args, now: string): Promise<CommandResult>;
```

## Steps

- [ ] 1. Write the failing test at `tests/cli/audit.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { mkdtemp,writeFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAuditCommand } from "../../src/cli/audit";
import { parseArgs } from "../../src/cli/args";
test("evaluate survives removal of the source repository",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-audit-")),input=await mkdtemp(join(tmpdir(),"maat-input-"));
 try{
  await writeFile(join(root,"AGENTS.md"),"# Guide\n");
  const scan=await runAuditCommand(parseArgs(["scan",root]),"2026-11-04T00:00:00Z");
  const file=join(input,"snapshot.json");await writeFile(file,JSON.stringify(scan.snapshot));
  await rm(root,{recursive:true,force:true});
  const evaluated=await runAuditCommand(parseArgs(["evaluate","--snapshot",file]),"2026-11-04T00:00:00Z");
  expect((evaluated.value as {items:unknown[]}).items).toEqual((scan.value as {items:unknown[]}).items);
 }finally{await rm(root,{recursive:true,force:true});await rm(input,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/cli/audit'`.

```sh
bun test tests/cli/audit.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/cli/audit.ts** (complete file)

```ts
import { readFile,realpath } from "node:fs/promises";
import { resolve,join,relative } from "node:path";
import type { Args } from "./args";
import { one } from "./args";
import type { Snapshot,Policy } from "../models";
import { MaatError } from "../errors";
import { loadCatalog } from "../catalog/load";
import { validateCatalog } from "../catalog/validate";
import { loadPolicy,emptyPolicy } from "../policy/load";
import { discover } from "../discovery/inventory";
import { makeSnapshot,makeScan,parseSnapshot } from "../snapshot";
import { loadEvidence } from "../evidence/validate";
import { claudeCode } from "../adapters/claude-code";
import { codex } from "../adapters/codex";
import { copilot } from "../adapters/copilot";
import { runDetectors } from "../detectors";
import { buildReport,renderReport,parseReport } from "../report";
import { buildPlan,renderPlan } from "../plan";
import { sha256 } from "../canonical";
export interface CommandResult {value:unknown;markdown:string;repository:string;kind:string;snapshot?:Snapshot;}
const adapters={ "claude-code":claudeCode,codex,copilot };
async function input(path:string):Promise<string> {
 try{return await readFile(path,"utf8");}catch{throw new MaatError(3,"input_read: "+path);}
}
export async function runAuditCommand(a:Args,now:string):Promise<CommandResult> {
 const c=await loadCatalog(one(a,"catalog"));validateCatalog(c);
 if(a.command==="plan") {
  const report=parseReport(await input(one(a,"report")!)),plan=buildPlan(report,a.flags.target??[],c);
  return {value:plan,markdown:renderPlan(plan),repository:report.repository.path,kind:"plan"};
 }
 let s:Snapshot,p:Policy,policyPath:string|null=null,diagnostics:string[]=[];
 if(a.command==="scan") {
  let root:string;try{root=await realpath(resolve(a.positionals[0]??"."));}catch{throw new MaatError(3,"repository_path");}
  policyPath=one(a,"policy")??join(root,".maat/policy.yaml");
  if(!one(a,"policy")) {
   try {
    const actual=await realpath(policyPath),rel=relative(root,actual);
    if(rel===".."||rel.startsWith("../"))throw new MaatError(3,"policy_outside_repository");
   }catch(e){if(e instanceof MaatError)throw e;if((e as NodeJS.ErrnoException).code!=="ENOENT")throw new MaatError(3,"policy_read");}
  }
  const loaded=await loadPolicy(policyPath,c.catalog_version,!one(a,"policy"));p=loaded.policy;diagnostics=loaded.diagnostics;
  if(a.flags.cli)p={...p,target_clis:[...new Set(a.flags.cli)]};
  const inventory=await discover(root,p.scope);
  if(!diagnostics.includes("policy_missing")) {
   const text=await input(policyPath),path=one(a,"policy")?"policy:"+resolve(policyPath):".maat/policy.yaml";
   if(!inventory.materials.some(m=>m.path===path))inventory.materials.push({path,text,sha256:sha256(text)});
  } else policyPath=null;
  const interpreted=p.target_clis.map(name=>adapters[name as keyof typeof adapters](inventory.materials));
  const observations=runDetectors(makeScan(inventory,p,interpreted),p,c);
  s=makeSnapshot(inventory,p,interpreted,observations);
 } else if(a.command==="evaluate") {
  s=parseSnapshot(await input(one(a,"snapshot")!));
  p=one(a,"policy")?(await loadPolicy(one(a,"policy")!,c.catalog_version)).policy:emptyPolicy(c.catalog_version);
  policyPath=one(a,"policy")??null;
 } else throw new MaatError(2,"usage_error: expected scan, evaluate or plan");
 const evidence=await loadEvidence(a.flags.evidence??[]);
 p={...p,attestations:[...p.attestations,...evidence.attestations]};
 s={...s,target_clis:p.target_clis.length?p.target_clis:s.target_clis};
 if(process.platform==="win32")diagnostics.push("platform_unknown");
 const report=buildReport(s,p,c,now,policyPath,!!one(a,"catalog"),diagnostics,evidence.assessments);
 if(process.platform==="win32")report.layers.forEach(l=>{l.authoritative=false;});
 return {value:report,markdown:renderReport(report),repository:s.repository.path,kind:"report",snapshot:s};
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/cli/audit.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/cli/audit.ts tests/cli/audit.test.ts
git commit -m '✨ feat(cli): connect read-only scan evaluate and plan commands'
```

