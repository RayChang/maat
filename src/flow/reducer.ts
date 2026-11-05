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
