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
