import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Flow } from "./types";
import type { Fingerprint } from "../models";
import { MaatError } from "../errors";
import { canonical,sha256 } from "../canonical";
import { fingerprintSet } from "./model";
import { changed } from "./core";
async function onDisk(f:Flow,extra:string|null):Promise<Fingerprint[]> {
 const paths=[...new Set([...f.current.map(m=>m.path),...(extra?[extra]:[])])].sort();
 const out:Fingerprint[]=[];
 for(const path of paths) {
  try{out.push({path,sha256:path.startsWith("policy:")?sha256(await readFile(path.slice(7),"utf8")):sha256(await readFile(join(f.repository.path,path)))});}
  catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw new MaatError(3,"repository_read: "+path);}
 }
 return out;
}
export async function flowTemplate(f:Flow,step:string,actionId:string|undefined,now:string):Promise<unknown> {
 const action=actionId===undefined?undefined:f.plan.actions.find(a=>a.id===actionId);
 if(actionId!==undefined&&!action)throw new MaatError(3,"unknown_action: "+actionId);
 if(["authorize","before","after","evaluation"].includes(step)&&!action)throw new MaatError(2,"usage_error: --step "+step+" requires --action");
 let payload:Record<string,unknown>;
 if(step==="approve") {
  const actions=f.plan.actions.filter(a=>a.kind!=="ask");
  payload={plan_fingerprint:f.plan_fingerprint,base_fingerprint:fingerprintSet(f.current),
  actions:actions.map(a=>a.id),paths:[...new Set(actions.map(a=>a.target_path).filter((p):p is string=>!!p))].sort(),
  mode:"plan",candidate_fingerprint:null,max_fixes:Object.fromEntries(actions.map(a=>[a.id,a.fix_conditions.max_fixes])),
  role_approvals:actions.filter(a=>a.role_approval_required).map(a=>({check:a.check,by:null})),expires_at:null,by:null,source:null};
 } else if(step==="authorize") {
  payload={execution:{action:action!.id,command:action!.command,script:null,inputs:[],cwd:f.repository.path,permissions:[],effects:[]},
  expires_at:null,by:null,source:null};
 } else if(step==="before"||step==="after") {
  payload={action:action!.id,fingerprints:await onDisk(f,action!.target_path)};
 } else if(step==="change") {
  if(!f.pending?.after)throw new MaatError(4,"flow_rejected: change_without_checkpoints");
  payload={action:f.pending.action,candidate_fingerprint:fingerprintSet(f.pending.after),paths:changed(f.pending.before,f.pending.after),
  executed_by:null,source:null,unknown_effects:null};
 } else {
  payload={action:action!.id,candidate_fingerprint:fingerprintSet(f.current),method:{kind:"manual",id:null,version:null},
  result:null,report:null,execution:null,evidence:f.current,by:null,source:null,unknown_effects:null};
 }
 return {id:sha256(canonical({flow:f.flow_id,seq:f.seq,step,action:actionId??null})),expected_seq:f.seq,
 expires_at:new Date(Date.parse(now)+86400000).toISOString(),by:null,payload};
}
