# T35 — Guard approved versions, action scope, and separate execution authorization

Guards G1–G4 are explicit functions. Unknown or non-authoritative plans may be inspected and opened, but cannot receive a formal accept transition. Approval covers a finite action set and exact relative modification paths, binds the current checkpoint, and carries role approvals where the catalog requires them. Candidate mode additionally binds the proposed after-checkpoint digest. Authorization binds the entire execution specification including script version, inputs, cwd, permissions, and external effects; modification approval cannot substitute for it. No identity verification or host prevention is claimed. DECISION (implementer default): the reducer recomputes the complete signed plan, including filled template bodies, on every event; it compares tool/schema/adapter versions and current registered template versions. Input fingerprints and any script fingerprint must still match the current checkpoint. An ask approval grants clarification only.

## Files

- Create: `src/flow/guards.ts`.
- Modify: None.
- Test path: `tests/flow/guards.test.ts`.

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
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T30
export interface Template { id:string;version:number;layer:string;rule_card:{id:string;version:number};checks:string[];form:'text'|'config'|'script';parameters:string[];path:string;body:string;supports:string[];cannot_prove:string[];support:string; }
// T30
export declare const templateDefinitions: Template[];
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
```

Produces:

```ts
export declare function eventGuard(flow: Flow, event: FlowEvent): string | null;
export declare function actionGuard(flow: Flow, action: PlanAction, at: string): string | null;
export declare function executionGuard(flow: Flow, execution: ExecutionSpec, at: string): string | null;
export declare function approvalGuard(flow: Flow, approval: Approval, at: string): string | null;
```

## Steps

- [ ] 1. Write the failing test at `tests/flow/guards.test.ts` with this complete content.

```ts
import { fingerprintSet } from "../../src/flow/model";
import { test, expect } from "bun:test";
import { executionGuard,eventGuard,approvalGuard,actionGuard } from "../../src/flow/guards";
import type { Flow,ExecutionSpec,FlowEvent } from "../../src/flow/types";
import { canonical,sha256 } from "../../src/canonical";
import { versions } from "../../src/versions";
test("authorization pins current inputs and plan content is recomputed",()=>{
 const input={path:"task.md",sha256:sha256("old")};
 const execution:ExecutionSpec={action:"a",command:"bun test",script:null,inputs:[input],cwd:"/r",permissions:["read"],effects:[]};
 const unsigned={report_schema:"1.0.0",versions,catalog_version:"0.1.0",repository:{path:"/r",repo_id:"0".repeat(16)},
 source_report_fingerprint:sha256("report"),actions:[],fingerprints:[input],authoritative:true,diagnostics:[]};
 const fingerprint=sha256(canonical(unsigned));
 const f={seq:3,seen:["old"],current:[input],authorizations:[],plan_fingerprint:fingerprint,
 plan:{...unsigned,plan_fingerprint:fingerprint}} as unknown as Flow;
 expect(executionGuard(f,execution,"2026-11-04")).toBe("execution_not_authorized");
 const event:FlowEvent={id:"old",expected_seq:3,at:"2026-11-04",expires_at:"2027-01-01",type:"accept",by:"ray",payload:{}};
 expect(eventGuard(f,event)).toBe("duplicate_event");
 expect(eventGuard(f,{...event,id:"new",expires_at:"2026-01-01"})).toBe("expired_event");
 f.authorizations=[{execution,expires_at:"2027-01-01",by:"ray",source:"user"}];
 expect(executionGuard(f,execution,"2026-11-04")).toBeNull();
 expect(executionGuard(f,{...execution,effects:["network"]},"2026-11-04")).toBe("execution_not_authorized");
 f.current=[{...input,sha256:sha256("new")}];
 expect(executionGuard(f,execution,"2026-11-04")).toBe("execution_inputs_changed");
 expect(eventGuard(f,{...event,id:"new"})).toBeNull();
 f.plan.authoritative=false;
 expect(eventGuard(f,{...event,id:"new"})).toBe("plan_changed");
});
import type { Approval } from "../../src/flow/types";
import type { PlanAction } from "../../src/plan/types";
function guardFixture():{flow:Flow;action:PlanAction;approval:Approval} {
 const current=[{path:"task.md",sha256:sha256("current")}];
 const action:PlanAction={id:"a",check:"prompt.task-spec",scope:{},item_version:1,rule_cards:[],template:null,
 current:"unknown",target:"verified",kind:"modify",actions:["Update task"],target_path:"task.md",command:null,
 depends_on:[],necessity:"required",risk:"low",needs_approval:true,role_approval_required:true,
 verification:{detectors:[],expected:"Confirmed task contract",manual:"Review task"},fingerprints:current,
 fix_conditions:{max_fixes:0},stop_conditions:["scope_change"]};
 const unsigned={report_schema:"1.0.0",versions,catalog_version:"0.1.0",repository:{path:"/r",repo_id:"0".repeat(16)},
 source_report_fingerprint:sha256("report"),actions:[action],fingerprints:current,authoritative:true,diagnostics:[]};
 const plan={...unsigned,plan_fingerprint:sha256(canonical(unsigned))};
 const flow:Flow={ledger_schema:"1.0.0",flow_id:"fixture",repository:plan.repository,plan,plan_fingerprint:plan.plan_fingerprint,
 status:"open",seq:0,seen:[],current,base:current,approval:null,authorizations:[],fixes:{},attempts:{},pending:null,
 changes:[],evaluations:[],meaningful_inputs:[],unknown_effects:[],last_rejection:null,resume_permit:false};
 const approval:Approval={plan_fingerprint:plan.plan_fingerprint,base_fingerprint:fingerprintSet(current),actions:["a"],
 paths:["task.md"],mode:"plan",candidate_fingerprint:null,max_fixes:{a:0},role_approvals:[],expires_at:"2027-01-01",by:"ray",source:"user"};
 return {flow,action,approval};
}
test("approval guard requires the bound base and required role approval",()=>{
 const {flow,approval}=guardFixture();
 expect(approvalGuard(flow,approval,"2026-11-04")).toBe("role_approval_missing");
 approval.role_approvals=[{check:"prompt.task-spec",by:"reviewer"}];
 expect(approvalGuard(flow,approval,"2026-11-04")).toBeNull();
 expect(approvalGuard(flow,{...approval,base_fingerprint:sha256("stale")},"2026-11-04")).toBe("approval_binding_mismatch");
});
test("action guard refuses uncovered actions and accepts a covered current action",()=>{
 const {flow,action,approval}=guardFixture();
 expect(actionGuard(flow,action,"2026-11-04")).toBe("approval_expired_or_missing");
 flow.approval={...approval,role_approvals:[{check:action.check,by:"reviewer"}]};
 expect(actionGuard(flow,action,"2026-11-04")).toBeNull();
 flow.approval.actions=[];
 expect(actionGuard(flow,action,"2026-11-04")).toBe("action_not_approved");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/flow/guards'`.

```sh
bun test tests/flow/guards.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/flow/guards.ts** (complete file)

```ts
import type { Flow,FlowEvent,Approval,ExecutionSpec } from "./types";
import type { PlanAction } from "../plan/types";
import { versions } from "../versions";
import { templateDefinitions } from "../plan/templates";
import { canonical,sha256 } from "../canonical";
import { fingerprintSet } from "./model";
const live=(expiry:string,at:string)=>Number.isFinite(Date.parse(expiry))&&Date.parse(expiry)>Date.parse(at);
export function eventGuard(f:Flow,e:FlowEvent):string|null {
 if(!e.id||!e.by?.trim()||!Number.isFinite(Date.parse(e.at)))return "event_shape";
 if(f.seen.includes(e.id))return "duplicate_event";
 if(e.expected_seq!==f.seq)return "revision_conflict";
 if(!live(e.expires_at,e.at))return "expired_event";
 const {plan_fingerprint,...unsigned}=f.plan;
 if(plan_fingerprint!==f.plan_fingerprint||sha256(canonical(unsigned))!==f.plan_fingerprint)return "plan_changed";
 for(const key of ["tool_version","report_schema","policy_schema","ledger_schema","catalog_version"] as const)
  if(f.plan.versions[key]!==versions[key])return "version_changed";
 if(f.plan.versions.adapters.some(a=>!versions.adapters.some(v=>v.name===a.name&&v.adapter_version===a.adapter_version)))return "version_changed";
 if(f.plan.actions.some(a=>a.template&&!templateDefinitions.some(t=>t.id===a.template!.id&&t.version===a.template!.version)))return "template_changed";
 return null;
}
export function approvalGuard(f:Flow,a:Approval,at:string):string|null {
 if(!a || !a.by?.trim()||!a.source?.trim()||!live(a.expires_at,at))return "approval_expired_or_missing";
 if(a.plan_fingerprint!==f.plan_fingerprint || a.base_fingerprint!==fingerprintSet(f.current))return "approval_binding_mismatch";
 if(!Array.isArray(a.actions)||!a.actions.length||!Array.isArray(a.paths)||!a.max_fixes||!Array.isArray(a.role_approvals))return "approval_shape";
 if(!["plan","candidate"].includes(a.mode)||(a.mode==="candidate"&&!a.candidate_fingerprint))return "candidate_binding_missing";
 if(a.paths.some(p=>!p||p.startsWith("/")||p.split("/").includes("..")))return "approval_path";
 for(const id of a.actions) {
  const action=f.plan.actions.find(x=>x.id===id);
  if(!action)return "unknown_action";
  if(action.kind!=="ask"&&action.target_path&&!a.paths.includes(action.target_path))return "approval_scope";
  const limit=a.max_fixes[id];
  if(!Number.isInteger(limit)||limit<0||limit>action.fix_conditions.max_fixes)return "fix_condition_expansion";
  if(action.role_approval_required&&!a.role_approvals.some(r=>r.check===action.check&&r.by.trim()))return "role_approval_missing";
 }
 return null;
}
export function actionGuard(f:Flow,action:PlanAction,at:string):string|null {
 const a=f.approval;
 if(!a || !live(a.expires_at,at)||a.plan_fingerprint!==f.plan_fingerprint)return "approval_expired_or_missing";
 if(!a.actions.includes(action.id))return "action_not_approved";
 if(action.kind!=="ask"&&action.target_path&&!a.paths.includes(action.target_path))return "approval_scope";
 if(action.role_approval_required&&!a.role_approvals.some(r=>r.check===action.check&&r.by.trim()))return "role_approval_missing";
 if(action.depends_on.some(id=>!f.evaluations.some(e=>e.action===id&&e.result==="pass")))return "dependency_unaccepted";
 return null;
}
export function executionGuard(f:Flow,e:ExecutionSpec,at:string):string|null {
 if(e.inputs.some(input=>!f.current.some(m=>m.path===input.path&&m.sha256===input.sha256)) ||
 (e.script&&!f.current.some(m=>m.path===e.script!.path&&m.sha256===e.script!.sha256)))return "execution_inputs_changed";
 return f.authorizations.some(a=>a.by.trim()&&a.source.trim()&&live(a.expires_at,at)&&canonical(a.execution)===canonical(e))
 ?null:"execution_not_authorized";
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/flow/guards.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/flow/guards.ts tests/flow/guards.test.ts
git commit -m '✨ feat(flow): guard plan approval and command authorization separately'
```

