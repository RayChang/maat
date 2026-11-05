# T36 — Guarded checkpoints and reducer transitions

G2–G5 are enforced before state changes. Expected approved changes advance current only after a matching change record; they do not invalidate the entire plan. Any unrelated changed, added, or removed path rejects the action. Checkpoint drift enters drifted. DECISION (implementer default): an after checkpoint with reconcile:true, an accountable by field, and explicit unknown_effects reconciles stopped/interrupted work without replaying it; it clears approval/authorization and requires new approval before resume. The base history and attempt counters remain intact. Unknown external effects force handoff. DECISION (implementer default): reconciliation can confirm only the unchanged current checkpoint and clears approval/authorization without resetting counters. Any changed bytes produce checkpoint_drift, retain the old base, and require a newly presented plan and a new flow; the old flow can be stopped or handed off but cannot adopt bypassing edits.

G1, G2, G6, and G7 gate all final decisions. A recorded pass is a candidate result; acceptance separately checks the matching report, action scope, versions, material fingerprints, valid approval/authorization, and every planned target. Error, timeout, cancel, unknown, missing reports, or unknown external effects cannot pass. Meaningful input identity excludes timestamps and agent wording; it includes material, item/claim statuses, policy validity, and method. Duplicate reevaluation is rejected unless an accountable explicit resume permits one evaluation. Stop does not roll back files or cancel external requests. Resume with an unfinished checkpoint is rejected until reconciliation. Every accepted or rejected event increments the persistent sequence; attempts and fixes survive restarts. DECISION (implementer default): malformed event data throws code 3 before sequence allocation; only well-formed guard rejections append ledger rows. An approved ask can be resolved by a manual, authoritative pass on the unchanged candidate; commands and edits require a new concrete plan. Accept rechecks the report's validity deadline and bound versions.

## Files

- Create: `tests/helpers/flow.ts`, `src/flow/core.ts`, `src/flow/reducer.ts`.
- Modify: None.
- Test path: `tests/flow/checkpoints.test.ts`.

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
export declare function emptyPolicy(catalogVersion?: string): Policy;
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T11
export declare function codex(materials: Material[]): AdapterResult;
// T28
export declare function buildReport(snapshot: Snapshot, policy: Policy, catalog: Catalog, now: string, policyPath?: string | null, overridden?: boolean, policyDiagnostics?: string[], assessments?: Assessment[]): Report;
// T28
export declare function reportFingerprints(report: Report): Fingerprint[];
// T28
export declare function reportVersionBinding(report: Report): Versions;
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
// T34
export declare function openFlow(id: string, plan: Plan, snapshot: Pick<Snapshot, 'repository' | 'materials'>): Flow;
// T34
export interface Transition { flow:Flow;accepted:boolean;reason:string|null; }
// T34
export declare function validateFlowEvent(event: unknown): asserts event is FlowEvent;
// T35
export declare function actionGuard(flow: Flow, action: PlanAction, at: string): string | null;
// T35
export declare function approvalGuard(flow: Flow, approval: Approval, at: string): string | null;
// T35
export declare function eventGuard(flow: Flow, event: FlowEvent): string | null;
// T35
export declare function executionGuard(flow: Flow, execution: ExecutionSpec, at: string): string | null;
```

Produces:

```ts
export declare function reduceCore(flow: Flow, event: FlowEvent): Flow | string | undefined;
export declare function flowFixture(): Flow;
export declare function flowEvent(flow: Flow, type: FlowEvent['type'], payload: unknown, id?: string): FlowEvent;
export declare function evaluationFingerprint(record: EvaluationRecord): string;
export declare function reduceFlow(flow: Flow, event: FlowEvent): Transition;
```

## Steps

- [ ] 1. Write the failing test at `tests/flow/checkpoints.test.ts` with this complete content.

```ts
import { test,expect } from "bun:test";
import { reduceCore } from "../../src/flow/core";
import { flowFixture,flowEvent } from "../helpers/flow";
import { fingerprintSet } from "../../src/flow/model";
import { type Flow,type EvaluationRecord } from "../../src/flow/types";
import { sha256,canonical } from "../../src/canonical";
import { reduceFlow,evaluationFingerprint } from "../../src/flow/reducer";
import { buildReport } from "../../src/report";
import { makeSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { loadCatalog } from "../../src/catalog/load";
test("expected edit advances current while unrelated dirty work is preserved",()=>{
 let f=flowFixture();
 f=reduceCore(f,flowEvent(f,"approve",{plan_fingerprint:f.plan_fingerprint,base_fingerprint:fingerprintSet(f.current),
 actions:["a"],paths:["task.md"],mode:"plan",candidate_fingerprint:null,max_fixes:{a:1},role_approvals:[],
 expires_at:"2027-01-01",by:"ray",source:"user"})) as Flow;
 f=reduceCore(f,flowEvent(f,"before",{action:"a",fingerprints:f.current})) as Flow;
 const after=f.current.map(x=>x.path==="task.md"?{...x,sha256:sha256("new")}:x);
 expect(reduceCore(f,flowEvent(f,"after",{action:"a",fingerprints:[...after,{path:"unrelated.md",sha256:sha256("changed")}]})))
 .toBe("checkpoint_scope_violation");
 f=reduceCore(f,flowEvent(f,"after",{action:"a",fingerprints:after})) as Flow;
 f=reduceCore(f,flowEvent(f,"change",{action:"a",candidate_fingerprint:fingerprintSet(after),paths:["task.md"],
 executed_by:"host",source:"user session",unknown_effects:[]})) as Flow;
 expect(f.current).toEqual(after);
 expect(f.current.find(x=>x.path==="dirty.md")!.sha256).toBe(sha256("user work"));
 expect(f.approval).not.toBeNull();
 expect(f.attempts.a).toBe(1);
});
test("reconciliation never adopts an edit made outside a checkpoint",()=>{
 const f=flowFixture();f.status="stopped";
 const edited=f.current.map(x=>x.path==="task.md"?{...x,sha256:sha256("bypass")}:x);
 expect(reduceCore(f,flowEvent(f,"after",{action:"a",fingerprints:edited,reconcile:true,unknown_effects:[]}))).toBe("checkpoint_drift");
 expect(f.current).not.toEqual(edited);
 const unchanged=reduceCore(f,flowEvent(f,"after",{action:"a",fingerprints:f.current,reconcile:true,unknown_effects:[]})) as Flow;
 expect(unchanged.current).toEqual(f.current);expect(unchanged.approval).toBeNull();
});
function approve(f:Flow):Flow {
 return reduceFlow(f,flowEvent(f,"approve",{plan_fingerprint:f.plan_fingerprint,
 base_fingerprint:fingerprintSet(f.current),actions:["a"],paths:f.plan.actions[0]!.kind==="ask"?[]:["task.md"],mode:"plan",
 candidate_fingerprint:null,max_fixes:{a:1},role_approvals:[],expires_at:"2027-01-01",by:"ray",source:"user"})).flow;
}
async function passRecord(f:Flow):Promise<EvaluationRecord> {
 const p=emptyPolicy(),materials=[{path:"task.md",text:"old",sha256:sha256("old")},{path:"dirty.md",text:"user work",sha256:sha256("user work")}];
 p.applicability["prompt.task-spec"]={status:"applicable"};p.targets["prompt.task-spec"]={baseline:true};
 p.attestations=[{check:"prompt.task-spec",claims:["goal","scope","constraints","acceptance"],
 answer:"The quoted representative task was reviewed for all four agreed task contract fields.",
 materials:[{path:"task.md",sha256:sha256("old"),lines:"1-1",quote:"old"}],scope:{},attested_by:"ray",
 attested_at:"2026-11-04T00:00:00Z",expires_at:"2026-12-01",catalog_version:"0.1.0",adapter_version:{}}];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const report=buildReport(s,p,await loadCatalog("catalog"),"2026-11-04T01:00:00Z","provided");
 return {action:"a",candidate_fingerprint:fingerprintSet(f.current),method:{kind:"manual",id:"review",version:"1"},
 result:"pass",report,execution:null,evidence:f.current,by:"ray",source:"user review",unknown_effects:[]};
}
test("each non-pass evaluation is recorded but cannot be accepted",async()=>{
 for(const result of ["fail","unknown","error","timeout","cancel"] as const) {
  let f=approve(flowFixture());const record={...await passRecord(f),result,report:null};
  const recorded=reduceFlow(f,flowEvent(f,"evaluation",record));
  expect(recorded.accepted).toBe(true);expect(recorded.flow.status).toBe("evaluated");f=recorded.flow;
  expect(reduceFlow(f,flowEvent(f,"accept",{})).reason).toBe("target_not_verified");
  expect(evaluationFingerprint(record)).toBe(evaluationFingerprint({...record,by:"rewritten agent"}));
 }
});
test("clarification resolves through evidence; expiry is checked at acceptance",async()=>{
 let f=flowFixture();f.plan.actions[0]!.kind="ask";
 const {plan_fingerprint,...unsigned}=f.plan;f.plan_fingerprint=f.plan.plan_fingerprint=sha256(canonical(unsigned));
 f=approve(f);
 expect(reduceFlow(f,flowEvent(f,"before",{action:"a",fingerprints:f.current})).reason).toBe("clarification_only");
 const record=await passRecord(f);
 const command={...record,method:{kind:"command" as const,id:"bun test",version:"1"},
 execution:{action:"a",command:"bun test",script:null,inputs:f.current,cwd:f.repository.path,permissions:["read"],effects:[]}};
 expect(reduceFlow(f,flowEvent(f,"evaluation",command)).reason).toBe("clarification_only");
 f=reduceFlow(f,flowEvent(f,"evaluation",record)).flow;
 expect(reduceFlow(f,flowEvent(f,"accept",{})).accepted).toBe(true);
 expect(reduceFlow(f,{...flowEvent(f,"accept",{}),at:"2026-12-02T00:00:00Z"}).reason).toBe("evidence_expired");
});
test("rejections persist, malformed payloads do not allocate sequence, and counts survive resume",()=>{
 let f=approve(flowFixture());f.attempts.a=1;f.fixes.a=1;
 expect(()=>reduceFlow(f,flowEvent(f,"before",{action:"a",fingerprints:[{path:"task.md",sha256:"bad"}]}))).toThrow("checkpoint_shape");
 expect(f.seq).toBe(1);
 f=reduceFlow(f,flowEvent(f,"stop",{},"stop-id")).flow;
 expect(reduceFlow(f,flowEvent(f,"stop",{},"stop-id")).reason).toBe("duplicate_event");
 const resumed=reduceFlow(f,flowEvent(f,"resume",{}));
 expect(resumed.accepted).toBe(true);expect(resumed.flow.fixes.a).toBe(1);expect(resumed.flow.attempts.a).toBe(1);
});
test("rewriting an evaluation does not count as new relevant input",async()=>{
 let f=approve(flowFixture());const record=await passRecord(f);
 f=reduceFlow(f,flowEvent(f,"evaluation",record)).flow;
 expect(reduceFlow(f,flowEvent(f,"evaluation",{...record,by:"another agent",source:"reworded"})).reason).toBe("no_new_input");
});
test("authorized command changes are limited to the exact approved file set",()=>{
 let f=flowFixture(),action=f.plan.actions[0]!;
 action.kind="command";action.command="npx skills add owner/repo --skill verify-before-done -a codex";action.target_path=null;
 const {plan_fingerprint,...unsigned}=f.plan;f.plan_fingerprint=f.plan.plan_fingerprint=sha256(canonical(unsigned));
 const installed=".agents/skills/verify-before-done/SKILL.md";
 f=reduceFlow(f,flowEvent(f,"approve",{plan_fingerprint:f.plan_fingerprint,base_fingerprint:fingerprintSet(f.current),
 actions:["a"],paths:[installed],mode:"plan",candidate_fingerprint:null,max_fixes:{a:0},role_approvals:[],
 expires_at:"2027-01-01",by:"ray",source:"user"})).flow;
 const execution={action:"a",command:action.command,script:null,inputs:f.current,cwd:"/r",
 permissions:["write approved skill file"],effects:["install one skill"]};
 f=reduceFlow(f,flowEvent(f,"authorize",{execution,expires_at:"2027-01-01",by:"ray",source:"user"})).flow;
 f=reduceFlow(f,flowEvent(f,"before",{action:"a",fingerprints:f.current,execution})).flow;
 const after=[...f.current,{path:installed,sha256:sha256("skill body")}];
 expect(reduceFlow(f,flowEvent(f,"after",{action:"a",fingerprints:after})).accepted).toBe(true);
 expect(reduceFlow(f,flowEvent(f,"after",{action:"a",fingerprints:[...after,{path:"unapproved",sha256:sha256("extra")}]})).reason).toBe("checkpoint_scope_violation");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/flow/core'`.

```sh
bun test tests/flow/checkpoints.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**tests/helpers/flow.ts** (complete file)

```ts
import { versions } from "../../src/versions";
import type { Flow,FlowEvent } from "../../src/flow/types";
import type { Plan,PlanAction } from "../../src/plan/types";
import { openFlow } from "../../src/flow/model";
import { makeSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { canonical,sha256 } from "../../src/canonical";
export function flowFixture():Flow {
 const materials=[{path:"task.md",text:"old",sha256:sha256("old")},{path:"dirty.md",text:"user work",sha256:sha256("user work")}];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},emptyPolicy());
 const fingerprints=materials.map(({path,sha256})=>({path,sha256}));
 const action:PlanAction={id:"a",check:"prompt.task-spec",scope:{},item_version:1,rule_cards:[{id:"plan-before-act",version:1}],
 template:null,current:"missing",target:"verified",kind:"modify",actions:["Fill the task contract"],target_path:"task.md",command:null,
 depends_on:[],necessity:"required",risk:"low",needs_approval:true,role_approval_required:false,
 verification:{detectors:[],expected:"Four task claims established",manual:"Confirm task content"},
 fingerprints,fix_conditions:{max_fixes:1},stop_conditions:["scope_change","fingerprint_drift","unknown_effect","no_progress","cancelled"]};
 const unsigned={report_schema:"1.0.0",versions:{...versions,adapters:[]},catalog_version:"0.1.0",repository:s.repository,source_report_fingerprint:sha256("source report"),
 actions:[action],fingerprints,authoritative:true,diagnostics:[]};
 const p:Plan={...unsigned,plan_fingerprint:sha256(canonical(unsigned))};
 return openFlow("fixture",p,s);
}
export function flowEvent(f:Flow,type:FlowEvent["type"],payload:unknown,id=type+"-"+f.seq):FlowEvent {
 return {id,expected_seq:f.seq,at:"2026-11-04T01:00:00Z",expires_at:"2027-01-01",type,by:"ray",payload};
}
```

**src/flow/core.ts** (complete file)

```ts
import type { Flow,FlowEvent,Approval,Authorization,ChangeRecord,ExecutionSpec } from "./types";
import type { Fingerprint } from "../models";
import { fingerprintSet } from "./model";
import { actionGuard,executionGuard,approvalGuard } from "./guards";
const changed=(a:Fingerprint[],b:Fingerprint[])=>[...new Set([...a.map(x=>x.path),...b.map(x=>x.path)])]
 .filter(path=>a.find(x=>x.path===path)?.sha256!==b.find(x=>x.path===path)?.sha256).sort();
export function reduceCore(original:Flow,e:FlowEvent):Flow|string|undefined {
 const f=structuredClone(original);
 if(e.type==="approve") {
  if(f.pending)return "unfinished_checkpoint";
  const a=e.payload as Approval,reason=approvalGuard(f,a,e.at);
  if(reason)return reason;
  f.approval=a;
  if(!["stopped","handoff","drifted"].includes(f.status))f.status="approved";
  return f;
 }
 if(e.type==="authorize") {
  const a=e.payload as Authorization;
  if(!a?.execution?.action||!a.execution.command?.trim()||!a.by?.trim()||!a.source?.trim()||
   !Number.isFinite(Date.parse(a.expires_at))||Date.parse(a.expires_at)<=Date.parse(e.at))return "authorization_shape";
  const action=f.plan.actions.find(x=>x.id===a.execution.action);
  if(!action)return "unknown_action";
  const reason=actionGuard(f,action,e.at);if(reason)return reason;
  if(a.execution.cwd!==f.repository.path||!Array.isArray(a.execution.inputs)||!Array.isArray(a.execution.permissions)||!Array.isArray(a.execution.effects))
   return "authorization_scope";
  fingerprintSet(a.execution.inputs);
  f.authorizations.push(a);return f;
 }
 if(e.type==="before"||e.type==="after") {
  const p=e.payload as {action:string;fingerprints:Fingerprint[];execution?:ExecutionSpec;reconcile?:boolean;unknown_effects?:string[]};
  const action=f.plan.actions.find(x=>x.id===p?.action);if(!action)return "unknown_action";
  fingerprintSet(p.fingerprints);
  if(e.type==="after"&&p.reconcile===true&&["executing","stopped","handoff","drifted"].includes(f.status)) {
   if(!Array.isArray(p.unknown_effects))return "reconciliation_effects_required";
   if(fingerprintSet(p.fingerprints)!==fingerprintSet(f.current))return "checkpoint_drift";
   if(f.pending&&fingerprintSet(f.pending.before)!==fingerprintSet(f.current))return "checkpoint_drift";
   f.pending=null;f.approval=null;f.authorizations=[];f.unknown_effects=p.unknown_effects;
   f.status=p.unknown_effects.length?"handoff":"stopped";return f;
  }
  const reason=actionGuard(f,action,e.at);if(reason)return reason;
  if(e.type==="before") {
   if(action.kind==="ask")return "clarification_only";
   if(!["approved","evaluated"].includes(f.status)||f.pending)return "illegal_before";
   if(fingerprintSet(p.fingerprints)!==fingerprintSet(f.current))return "checkpoint_drift";
   if((f.attempts[action.id]??0)>=(f.fixes[action.id]??0)+1)return "fix_not_granted";
   if(action.kind==="command") {
    if(!p.execution||p.execution.command!==action.command)return "command_binding_missing";
    const auth=executionGuard(f,p.execution,e.at);if(auth)return auth;
   }
   f.pending={action:action.id,before:p.fingerprints,after:null,execution:p.execution??null};
   f.attempts[action.id]=(f.attempts[action.id]??0)+1;f.status="executing";return f;
  }
  if(f.status!=="executing"||f.pending?.action!==p.action||f.pending.after)return "illegal_after";
  const paths=changed(f.pending.before,p.fingerprints);
  if(paths.some(path=>!f.approval!.paths.includes(path)||(action.kind!=="command"&&path!==action.target_path)))return "checkpoint_scope_violation";
  if(f.approval!.mode==="candidate"&&f.approval!.candidate_fingerprint!==fingerprintSet(p.fingerprints))return "candidate_not_approved";
  f.pending.after=p.fingerprints;return f;
 }
 if(e.type==="change") {
  const record=e.payload as ChangeRecord;
  if(f.status!=="executing"||!f.pending?.after||record?.action!==f.pending.action)return "change_without_checkpoints";
  if(!record.executed_by?.trim()||!record.source?.trim()||!Array.isArray(record.unknown_effects))return "change_source";
  if(record.candidate_fingerprint!==fingerprintSet(f.pending.after)||
   JSON.stringify([...record.paths].sort())!==JSON.stringify(changed(f.pending.before,f.pending.after)))return "change_binding_mismatch";
  f.current=f.pending.after;f.pending=null;f.changes.push(record);f.unknown_effects=record.unknown_effects;
  f.status=record.unknown_effects.length?"handoff":"changed";return f;
 }
 return undefined;
}
```

**src/flow/reducer.ts** (complete file)

```ts
import { reportFingerprints,reportVersionBinding } from "../report";
import type { Flow,FlowEvent,EvaluationRecord,Transition } from "./types";
import { validateFlowEvent } from "./validate";
import { eventGuard,actionGuard,executionGuard } from "./guards";
import { reduceCore } from "./core";
import { fingerprintSet } from "./model";
import { canonical,sha256 } from "../canonical";
export function evaluationFingerprint(r:EvaluationRecord):string {
 return sha256(canonical({candidate:r.candidate_fingerprint,method:r.method,result:r.result,
 evidence:r.evidence,unknown_effects:r.unknown_effects,
 report:r.report?{catalog:r.report.catalog_version,materials:reportFingerprints(r.report),
 policy:r.report.policy.valid,items:r.report.items.map(i=>({id:i.id,scope:i.scope,result:i.result,
 claims:i.claims.map(c=>({name:c.name,status:c.status}))}))}:null}));
}
function decide(f:Flow,e:FlowEvent):Flow|string {
 if(e.type==="stop"||e.type==="handoff"){f.status=e.type==="stop"?"stopped":"handoff";return f;}
 if(e.type==="resume") {
  if(!["stopped","handoff","drifted"].includes(f.status))return "illegal_resume";
  if(f.pending||f.unknown_effects.length)return "reconcile_before_resume";
  if(!f.approval)return "approval_expired_or_missing";
  for(const id of f.approval.actions) {
   const action=f.plan.actions.find(x=>x.id===id)!;
   const reason=actionGuard(f,action,e.at);if(reason)return reason;
  }
  f.status="approved";f.resume_permit=true;return f;
 }
 if(e.type==="evaluation") {
  const r=e.payload as EvaluationRecord;
  if(!["changed","evaluated","approved"].includes(f.status)||f.pending)return "evaluation_state";
  if(!r?.method||!["manual","command"].includes(r.method.kind)||!r.method.id||!r.method.version||
   !["pass","fail","unknown","error","timeout","cancel"].includes(r.result)||!r.by?.trim()||!r.source?.trim()||
   !Array.isArray(r.unknown_effects)||!Array.isArray(r.evidence))return "evaluation_shape";
  if(r.candidate_fingerprint!==fingerprintSet(f.current))return "evaluation_candidate_mismatch";
  const action=f.plan.actions.find(a=>a.id===r.action);if(!action)return "unknown_action";
  const guard=actionGuard(f,action,e.at);if(guard)return guard;
  if(action.kind==="ask"&&r.method.kind!=="manual")return "clarification_only";
  if(r.method.kind==="command") {
   if(!r.execution)return "execution_evidence_missing";
   const auth=executionGuard(f,r.execution,e.at);if(auth)return auth;
   if(r.execution.action!==action.id)return "execution_action_mismatch";
  }
  if(r.result==="pass"&&(!r.report||r.unknown_effects.length||fingerprintSet(r.evidence)!==fingerprintSet(f.current)))return "pass_evidence_missing";
  if(r.report && (r.report.catalog_version!==f.plan.catalog_version || canonical(reportVersionBinding(r.report))!==canonical(f.plan.versions) ||
   r.report.repository.repo_id!==f.repository.repo_id || reportFingerprints(r.report).some(p=>!f.current.some(m=>m.path===p.path&&m.sha256===p.sha256))))
   return "evaluation_report_mismatch";
  const key=evaluationFingerprint(r);
  if(f.meaningful_inputs.includes(key)&&!f.resume_permit)return "no_new_input";
  f.meaningful_inputs.push(key);f.resume_permit=false;f.evaluations.push(r);f.unknown_effects=r.unknown_effects;
  f.status=r.unknown_effects.length?"handoff":"evaluated";return f;
 }
 if(e.type==="continue-fix") {
  if(f.status!=="evaluated"||f.pending||f.unknown_effects.length)return "fix_state";
  const last=f.evaluations.at(-1);if(!last||last.result==="pass")return "fix_not_needed";
  const action=f.plan.actions.find(a=>a.id===last.action)!;
  const guard=actionGuard(f,action,e.at);if(guard)return guard;
  const used=f.fixes[action.id]??0,limit=f.approval!.max_fixes[action.id]??0;
  if(used>=limit)return "fix_conditions_exhausted";
  f.fixes[action.id]=used+1;f.status="approved";return f;
 }
 if(e.type==="accept") {
  if(f.status!=="evaluated")return "not_evaluated";
  if(!f.plan.authoritative)return "policy_unapproved";
  if(f.pending||f.unknown_effects.length)return "incomplete_effects";
  for(const action of f.plan.actions) {
   const guard=actionGuard(f,action,e.at);if(guard)return guard;
   const r=[...f.evaluations].reverse().find(r=>r.action===action.id&&r.candidate_fingerprint===fingerprintSet(f.current));
   if(!r || r.result!=="pass" || !r.report || r.unknown_effects.length)return "target_not_verified";
   if(r.method.kind==="command"&&(!r.execution||executionGuard(f,r.execution,e.at)))return "execution_not_authorized";
   if(r.report.valid_until&&Date.parse(r.report.valid_until)<=Date.parse(e.at))return "evidence_expired";
   if(canonical(reportVersionBinding(r.report))!==canonical(f.plan.versions))return "version_changed";
   if(!r.report.policy.valid||r.report.layers.some(l=>!l.authoritative))return "non_authoritative_report";
   const item=r.report.items.find(i=>i.id===action.check&&canonical(i.scope)===canonical(action.scope));
   if(!item||item.result!=="verified"||item.item_version!==action.item_version||
    item.prerequisites.required.some(x=>x.status!=="holds")||item.attestations.some(a=>!a.valid))return "target_not_verified";
  }
  f.status="accepted";return f;
 }
 return "illegal_event";
}
export function reduceFlow(original:Flow,e:FlowEvent):Transition {
 validateFlowEvent(e);
 let reason=eventGuard(original,e),next:Flow|string|undefined;
 if(!reason && original.status==="accepted")reason="terminal_flow";
 if(!reason) {
  next=reduceCore(original,e)??decide(structuredClone(original),e);
  if(typeof next==="string")reason=next;
 }
 const f=reason?structuredClone(original):next as Flow;
 if(reason==="checkpoint_drift"||reason==="checkpoint_scope_violation")f.status="drifted";
 f.seq=original.seq+1;f.seen=[...new Set([...original.seen,e.id])];f.last_rejection=reason;
 return {flow:f,accepted:!reason,reason};
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/flow/checkpoints.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- tests/helpers/flow.ts src/flow/core.ts src/flow/reducer.ts tests/flow/checkpoints.test.ts
git commit -m '✨ feat(flow): bind approved actions to before and after checkpoints'
```

