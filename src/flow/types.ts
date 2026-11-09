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
export interface Transition { flow:Flow;accepted:boolean;reason:string|null;detail?:string|null; }
export interface LedgerRow { ledger_schema:string;seq:number;at:string;before:FlowStatus|null;after:FlowStatus;event:FlowEvent|{type:"open";id:string;plan:Plan;fingerprints:Fingerprint[]};accepted:boolean;reason:string|null; }
