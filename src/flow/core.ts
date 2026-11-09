import type { Flow,FlowEvent,Approval,Authorization,ChangeRecord,ExecutionSpec } from "./types";
import type { Fingerprint } from "../models";
import { fingerprintSet } from "./model";
import { actionGuard,executionGuard,approvalGuard } from "./guards";
export const changed=(a:Fingerprint[],b:Fingerprint[])=>[...new Set([...a.map(x=>x.path),...b.map(x=>x.path)])]
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
  if(paths.some(path=>!f.approval!.paths.includes(path)||(action.kind!=="command"&&path!==action.target_path&&!(action.extra_paths??[]).includes(path))))return "checkpoint_scope_violation";
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
