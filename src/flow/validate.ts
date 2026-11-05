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
