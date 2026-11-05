# T34 — Define the controller state, event envelopes, and checkpoint identity

DECISION (implementer default): controller states and event fields are fixed by the types below. File-backed events require id, expected_seq, expires_at, and payload; the CLI supplies type/at/by where a flag exists. Timestamps use UTC ISO strings. A checkpoint is a sorted set of unique path/digest pairs; it includes relevant dependencies, policy, and template/catalog references supplied by the host. Identical digests at different paths are distinct. The flow reconstructs current state, counts, and unknown effects from events; it never executes an action. Controller identity fields are host-provided, not authenticated.

## Files

- Create: `src/flow/types.ts`, `src/flow/model.ts`, `src/flow/validate.ts`.
- Modify: None.
- Test path: `tests/flow/model.test.ts`.

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
export interface Shape { type?: "object"|"array"|"string"|"number"|"boolean"; required?: string[]; properties?: Record<string,Shape>; additionalProperties?: boolean | Shape; items?: Shape; enum?: unknown[]; minItems?: number; minLength?: number; pattern?: string; }
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T28
export declare function parseReport(text: string): Report;
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
```

Produces:

```ts
export type FlowStatus="open"|"approved"|"executing"|"changed"|"evaluated"|"accepted"|"stopped"|"handoff"|"drifted";
export interface ExecutionSpec { action:string;command:string;script:Fingerprint|null;inputs:Fingerprint[];cwd:string;permissions:string[];effects:string[]; }
export interface Approval { plan_fingerprint:string;base_fingerprint:string;actions:string[];paths:string[];mode:"plan"|"candidate";candidate_fingerprint:string|null;max_fixes:Record<string,number>;role_approvals:{check:string;by:string}[];expires_at:string;by:string;source:string; }
export interface Authorization { execution:ExecutionSpec;expires_at:string;by:string;source:string; }
export interface ChangeRecord { action:string;candidate_fingerprint:string;paths:string[];executed_by:string;source:string;unknown_effects:string[]; }
export interface EvaluationRecord { action:string;candidate_fingerprint:string;method:{kind:"manual"|"command";id:string;version:string};result:"pass"|"fail"|"unknown"|"error"|"timeout"|"cancel";report:Report|null;execution:ExecutionSpec|null;evidence:Fingerprint[];by:string;source:string;unknown_effects:string[]; }
export interface FlowEvent { id:string;expected_seq:number;at:string;expires_at:string;type:"approve"|"authorize"|"before"|"after"|"change"|"evaluation"|"accept"|"continue-fix"|"stop"|"handoff"|"resume";by:string;payload:unknown; }
export interface Flow {
 ledger_schema:string;flow_id:string;repository:{path:string;repo_id:string};plan:Plan;plan_fingerprint:string;
 status:FlowStatus;seq:number;seen:string[];current:Fingerprint[];base:Fingerprint[];
 approval:Approval|null;authorizations:Authorization[];fixes:Record<string,number>;attempts:Record<string,number>;
 pending:{action:string;before:Fingerprint[];after:Fingerprint[]|null;execution:ExecutionSpec|null}|null;
 changes:ChangeRecord[];evaluations:EvaluationRecord[];meaningful_inputs:string[];
 unknown_effects:string[];last_rejection:string|null;resume_permit:boolean;
}
export interface Transition { flow:Flow;accepted:boolean;reason:string|null; }
export interface LedgerRow { ledger_schema:string;seq:number;at:string;before:FlowStatus|null;after:FlowStatus;event:FlowEvent|{type:"open";id:string;plan:Plan;fingerprints:Fingerprint[]};accepted:boolean;reason:string|null; }
export declare function fingerprintSet(fingerprints: Fingerprint[]): string;
export declare function openFlow(id: string, plan: Plan, snapshot: Pick<Snapshot, 'repository' | 'materials'>): Flow;
export declare function validateFlowEvent(event: unknown): asserts event is FlowEvent;
```

## Steps

- [ ] 1. Write the failing test at `tests/flow/model.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { fingerprintSet } from "../../src/flow/model";
test("checkpoint order is irrelevant but duplicate paths are rejected",()=>{
 const a={path:"a",sha256:"a".repeat(64)},b={path:"b",sha256:"b".repeat(64)};
 expect(fingerprintSet([a,b])).toBe(fingerprintSet([b,a]));
 expect(()=>fingerprintSet([a,a])).toThrow("checkpoint_duplicate");
 expect(()=>fingerprintSet([{path:"a",sha256:"bad"}])).toThrow("checkpoint_shape");
});
import { validateFlowEvent } from "../../src/flow/validate";
test("malformed checkpoint is a data error before a reducer sees it",()=>{
 expect(()=>validateFlowEvent({id:"x",expected_seq:0,at:"2026-11-04",expires_at:"2027-01-01",
 type:"before",by:"ray",payload:{action:"a",fingerprints:[{path:"task.md",sha256:"invalid"}]}})).toThrow("checkpoint_shape");
});
test("unparseable approval and authorization dates are data errors",()=>{
 for(const type of ["approve","authorize"] as const)
  expect(()=>validateFlowEvent({id:"date",expected_seq:0,at:"2026-11-04T00:00:00Z",expires_at:"2027-01-01",type,by:"ray",payload:{expires_at:"not-a-date"}})).toThrow("approval_time");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/flow/model'`.

```sh
bun test tests/flow/model.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/flow/types.ts** (complete file)

```ts
import type { Fingerprint,Report } from "../models";
import type { Plan } from "../plan/types";
export type FlowStatus="open"|"approved"|"executing"|"changed"|"evaluated"|"accepted"|"stopped"|"handoff"|"drifted";
export interface ExecutionSpec { action:string;command:string;script:Fingerprint|null;inputs:Fingerprint[];cwd:string;permissions:string[];effects:string[]; }
export interface Approval { plan_fingerprint:string;base_fingerprint:string;actions:string[];paths:string[];mode:"plan"|"candidate";candidate_fingerprint:string|null;max_fixes:Record<string,number>;role_approvals:{check:string;by:string}[];expires_at:string;by:string;source:string; }
export interface Authorization { execution:ExecutionSpec;expires_at:string;by:string;source:string; }
export interface ChangeRecord { action:string;candidate_fingerprint:string;paths:string[];executed_by:string;source:string;unknown_effects:string[]; }
export interface EvaluationRecord { action:string;candidate_fingerprint:string;method:{kind:"manual"|"command";id:string;version:string};result:"pass"|"fail"|"unknown"|"error"|"timeout"|"cancel";report:Report|null;execution:ExecutionSpec|null;evidence:Fingerprint[];by:string;source:string;unknown_effects:string[]; }
export interface FlowEvent { id:string;expected_seq:number;at:string;expires_at:string;type:"approve"|"authorize"|"before"|"after"|"change"|"evaluation"|"accept"|"continue-fix"|"stop"|"handoff"|"resume";by:string;payload:unknown; }
export interface Flow {
 ledger_schema:string;flow_id:string;repository:{path:string;repo_id:string};plan:Plan;plan_fingerprint:string;
 status:FlowStatus;seq:number;seen:string[];current:Fingerprint[];base:Fingerprint[];
 approval:Approval|null;authorizations:Authorization[];fixes:Record<string,number>;attempts:Record<string,number>;
 pending:{action:string;before:Fingerprint[];after:Fingerprint[]|null;execution:ExecutionSpec|null}|null;
 changes:ChangeRecord[];evaluations:EvaluationRecord[];meaningful_inputs:string[];
 unknown_effects:string[];last_rejection:string|null;resume_permit:boolean;
}
export interface Transition { flow:Flow;accepted:boolean;reason:string|null; }
export interface LedgerRow { ledger_schema:string;seq:number;at:string;before:FlowStatus|null;after:FlowStatus;event:FlowEvent|{type:"open";id:string;plan:Plan;fingerprints:Fingerprint[]};accepted:boolean;reason:string|null; }
```

**src/flow/model.ts** (complete file)

```ts
import type { Fingerprint,Snapshot } from "../models";
import type { Plan } from "../plan/types";
import type { Flow } from "./types";
import { canonical,sha256 } from "../canonical";
import { MaatError } from "../errors";
export function fingerprintSet(fps:Fingerprint[]):string {
 if(!Array.isArray(fps))throw new MaatError(3,"checkpoint_shape");
 const paths=new Set<string>();
 for(const f of fps) {
  if(!f||typeof f.path!=="string"||!f.path||!/^[a-f0-9]{64}$/.test(f.sha256))throw new MaatError(3,"checkpoint_shape");
  if(paths.has(f.path))throw new MaatError(3,"checkpoint_duplicate");paths.add(f.path);
 }
 return sha256(canonical(fps.map(({path,sha256})=>({path,sha256})).sort((a,b)=>a.path.localeCompare(b.path))));
}
export function openFlow(id:string,plan:Plan,snapshot:Pick<Snapshot,'repository'|'materials'>):Flow {
 if(!/^[a-zA-Z0-9-]+$/.test(id))throw new MaatError(3,"flow_id");
 if(plan.repository.repo_id!==snapshot.repository.repo_id ||
 plan.repository.path!==snapshot.repository.path ||
 plan.fingerprints.some(p=>!snapshot.materials.some(m=>m.path===p.path&&m.sha256===p.sha256)))
  throw new MaatError(4,"open_binding_mismatch");
 return {ledger_schema:"1.0.0",flow_id:id,repository:plan.repository,plan,plan_fingerprint:plan.plan_fingerprint,
 status:"open",seq:0,seen:[],current:snapshot.materials.map(({path,sha256})=>({path,sha256})),base:snapshot.materials.map(({path,sha256})=>({path,sha256})),
 approval:null,authorizations:[],fixes:{},attempts:{},pending:null,changes:[],evaluations:[],
 meaningful_inputs:[],unknown_effects:[],last_rejection:null,resume_permit:false};
}
```

**src/flow/validate.ts** (complete file)

```ts
import type { FlowEvent,ExecutionSpec } from "./types";
import { MaatError } from "../errors";
import { checkShape, type Shape } from "../schema";
import { parseReport } from "../report";
import { fingerprintSet } from "./model";
const str:Shape={type:"string",minLength:1,pattern:"\\S"},strings:Shape={type:"array",items:str},obj:Shape={type:"object"};
const hash:Shape={type:"string",pattern:"^[a-f0-9]{64}$"};
const object=(required:string[],properties:Record<string,Shape>):Shape=>({type:"object",required,properties});
function execution(value:unknown):void {
 checkShape(value,object(["action","command","script","inputs","cwd","permissions","effects"],
 {action:str,command:str,inputs:{type:"array"},cwd:str,permissions:strings,effects:strings}));
 const x=value as ExecutionSpec;fingerprintSet(x.inputs);
 if(x.script!==null)fingerprintSet([x.script]);
}
export function validateFlowEvent(event:unknown):asserts event is FlowEvent {
 checkShape(event,object(["id","expected_seq","at","expires_at","type","by","payload"],
 {id:str,expected_seq:{type:"number"},at:str,expires_at:str,by:str,payload:obj,
 type:{enum:["approve","authorize","before","after","change","evaluation","accept","continue-fix","stop","handoff","resume"]}}));
 const e=event as FlowEvent,p=e.payload as Record<string,unknown>;
 if(!Number.isInteger(e.expected_seq)||e.expected_seq<0||!Number.isFinite(Date.parse(e.at))||
 !Number.isFinite(Date.parse(e.expires_at)))throw new MaatError(3,"event_shape");
 const iso=(value:unknown)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)&&Number.isFinite(Date.parse(value));
 if(!iso(e.at)||!iso(e.expires_at))throw new MaatError(3,"event_time");
 if((e.type==="approve"||e.type==="authorize")&&!iso(p.expires_at))throw new MaatError(3,"approval_time");
 if(e.type==="approve") {
  checkShape(p,object(["plan_fingerprint","base_fingerprint","actions","paths","mode","candidate_fingerprint","max_fixes","role_approvals","expires_at","by","source"],
  {plan_fingerprint:hash,base_fingerprint:hash,actions:strings,paths:strings,mode:{enum:["plan","candidate"]},
  max_fixes:{type:"object",additionalProperties:{type:"number"}},role_approvals:{type:"array",items:object(["check","by"],{check:str,by:str})},expires_at:str,by:str,source:str}));
  if(p.candidate_fingerprint!==null)checkShape(p.candidate_fingerprint,hash);
  if(p.mode==="candidate"&&p.candidate_fingerprint===null)throw new MaatError(3,"candidate_shape");
  if(Object.values(p.max_fixes as Record<string,number>).some(n=>!Number.isInteger(n)||n<0))throw new MaatError(3,"fix_count_shape");
 } else if(e.type==="authorize") {
  checkShape(p,object(["execution","expires_at","by","source"],{expires_at:str,by:str,source:str}));execution(p.execution);
 } else if(e.type==="before"||e.type==="after") {
  checkShape(p,object(["action","fingerprints"],{action:str,fingerprints:{type:"array"},reconcile:{type:"boolean"},unknown_effects:strings}));
  fingerprintSet(p.fingerprints as import("../models").Fingerprint[]);if(p.execution!==undefined)execution(p.execution);
 } else if(e.type==="change") {
  checkShape(p,object(["action","candidate_fingerprint","paths","executed_by","source","unknown_effects"],
  {action:str,candidate_fingerprint:hash,paths:strings,executed_by:str,source:str,unknown_effects:strings}));
 } else if(e.type==="evaluation") {
  checkShape(p,object(["action","candidate_fingerprint","method","result","report","execution","evidence","by","source","unknown_effects"],
  {action:str,candidate_fingerprint:hash,method:object(["kind","id","version"],{kind:{enum:["manual","command"]},id:str,version:str}),
  result:{enum:["pass","fail","unknown","error","timeout","cancel"]},evidence:{type:"array"},by:str,source:str,unknown_effects:strings}));
  fingerprintSet(p.evidence as import("../models").Fingerprint[]);
  if(p.execution!==null)execution(p.execution);
  if(p.report!==null)parseReport(JSON.stringify(p.report));
 }
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/flow/model.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/flow/types.ts src/flow/model.ts src/flow/validate.ts tests/flow/model.test.ts
git commit -m '✨ feat(flow): define controller events and checkpoint bindings'
```

