import { readFile,realpath,lstat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve,join,dirname } from "node:path";
import type { Args } from "./args";
import { one } from "./args";
import type { CommandResult } from "./audit";
import type { FlowEvent,Flow } from "../flow/types";
import { MaatError } from "../errors";
import { parsePlan } from "../plan";
import { parseReport } from "../report";
import { parseSnapshot } from "../snapshot";
import { openFlow,fingerprintSet } from "../flow/model";
import { ledgerDirectory,createLedger,readFlow,appendEvent,listFlows,flowDirectory } from "../flow/ledger";
import { canonical,sha256,repoId } from "../canonical";
import { flowTemplate } from "../flow/template";
async function repositoryRoot(cwd:string):Promise<string> {
 let path=await realpath(resolve(cwd));
 for(;;) {
  for(const name of [".git",".maat/policy.yaml"]) {
   try{await lstat(join(path,name));return path;}
   catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw new MaatError(3,"repository_read");}
  }
  const parent=dirname(path);if(parent===path)throw new MaatError(3,"repository_not_found: run maat flow list inside the project (no .git or .maat/policy.yaml above the current directory)");path=parent;
 }
}
async function input(path:string):Promise<string>{try{return await readFile(path,"utf8");}catch{throw new MaatError(3,"input_read");}}
function status(f:Flow):unknown {
 return {flow_id:f.flow_id,status:f.status,seq:f.seq,repository:f.repository,plan_fingerprint:f.plan_fingerprint,
 current_fingerprint:fingerprintSet(f.current),materials:f.current.length,
 actions:f.plan.actions.map(a=>({id:a.id,check:a.check,kind:a.kind,target_path:a.target_path,extra_paths:a.extra_paths??[]})),
 approval:f.approval&&{actions:f.approval.actions,paths:f.approval.paths,max_fixes:f.approval.max_fixes,expires_at:f.approval.expires_at,by:f.approval.by},
 pending:f.pending&&{action:f.pending.action,after_recorded:!!f.pending.after},
 changes:f.changes.map(c=>({action:c.action,candidate_fingerprint:c.candidate_fingerprint,paths:c.paths})),
 evaluations:f.evaluations.map(e=>({action:e.action,candidate_fingerprint:e.candidate_fingerprint,method:e.method,result:e.result})),
 fixes:f.fixes,attempts:f.attempts,unknown_effects:f.unknown_effects,last_rejection:f.last_rejection,
 remaining_fixes:Object.fromEntries(f.plan.actions.map(a=>[a.id,
 Math.max(0,(f.approval?.max_fixes[a.id]??0)-(f.fixes[a.id]??0))]))};
}
export async function runFlowCommand(a:Args,now:string,cwd=process.cwd()):Promise<CommandResult&{diagnostics?:string[]}> {
 let repository=await realpath(resolve(cwd)),value:unknown,diagnostics:string[]|undefined;
 if(a.command==="flow open") {
  const plan=parsePlan(await input(one(a,"plan")!)),snapshot=parseSnapshot(await input(one(a,"snapshot")!));
  repository=plan.repository.path;
  const flow=openFlow(plan.repository.repo_id+"-"+randomUUID(),plan,snapshot),dir=await ledgerDirectory(repository,one(a,"ledger"));
  await createLedger(dir,flow);value={flow_id:flow.flow_id,state:status(flow)};
 } else {
  if(a.command==="flow list")repository=await repositoryRoot(cwd);
  const dir=a.command==="flow list"?await ledgerDirectory(repository,one(a,"ledger")):await flowDirectory(one(a,"flow")!,one(a,"ledger"));
  if(a.command==="flow list") {
   const listed=await listFlows(dir,repoId(repository));diagnostics=listed.diagnostics;
   value=listed.flows.map(f=>({flow_id:f.flow_id,status:f.status}));
  }
  else {
   const id=one(a,"flow")!,flow=await readFlow(dir,id);repository=flow.repository.path;
   if(a.command==="flow status")value=status(flow);
   else if(a.command==="flow template")value=await flowTemplate(flow,one(a,"step")!,one(a,"action"),now);
   else {
    let event:FlowEvent;
    if(a.command==="flow decide") {
     const type=one(a,"event") as FlowEvent["type"];
     if(type==="resume"&&!one(a,"by"))throw new MaatError(2,"usage_error: resume requires --by");
     const by=one(a,"by")??"host-provided:unknown";
     event={id:sha256(canonical({flow:id,seq:flow.seq,type,by})),expected_seq:flow.seq,at:now,
      expires_at:new Date(Date.parse(now)+60000).toISOString(),type,by,payload:{}};
    } else {
     const file=one(a,"scope")??one(a,"command")??one(a,"fingerprints")??one(a,"file");
     let envelope:Record<string,unknown>;
     if(a.command==="flow checkpoint"&&!file) {
      if(!one(a,"by")?.trim())throw new MaatError(3,"event_actor");
      try{envelope=await flowTemplate(flow,one(a,"phase")!,one(a,"action"),now) as Record<string,unknown>;}
      catch(e){if(!(e instanceof MaatError)||e.code!==4)throw e;
       envelope={id:sha256(canonical({flow:id,seq:flow.seq,step:one(a,"phase"),action:one(a,"action")})),expected_seq:flow.seq,
        expires_at:new Date(Date.parse(now)+86400000).toISOString(),by:null,payload:{fingerprints:[]}};}
     }
     else {
      const hint=" (--"+["scope","command","fingerprints","file"].find(k=>one(a,k))+" takes the event JSON file saved from maat flow template --json and filled in)";
      let text:string;try{text=await readFile(file!,"utf8");}catch{throw new MaatError(3,"input_read: "+file+hint);}
      try{envelope=JSON.parse(text);}catch{throw new MaatError(3,"event_parse: "+file+hint);}
      if(envelope&&typeof envelope==="object"&&envelope.id===undefined) {
       const p=(envelope.payload??{}) as Record<string,unknown>,execution=p.execution as {action?:unknown}|undefined;
       const step=a.command==="flow checkpoint"?one(a,"phase")!:a.command==="flow record"?one(a,"kind")!:a.command.slice(5);
       const action=one(a,"action")??(typeof p.action==="string"?p.action:typeof execution?.action==="string"?execution.action:undefined);
       if(step==="evaluation"&&action===undefined)throw new MaatError(3,"event_action: a partial evaluation file needs payload.action");
       if(step==="approve"&&!Array.isArray(p.actions))throw new MaatError(3,"event_actions: a partial approve file must list the approved action ids in payload.actions");
       let t:Record<string,unknown>;
       try{t=await flowTemplate(flow,step,action,now) as Record<string,unknown>;}
       catch(e){if(!(e instanceof MaatError)||e.code!==4)throw e;
        t={id:sha256(canonical({flow:id,seq:flow.seq,step,action:action??null})),expected_seq:flow.seq,
         expires_at:new Date(Date.parse(now)+86400000).toISOString(),by:null,
         payload:step==="change"||step==="evaluation"?{action:action??"unknown",candidate_fingerprint:fingerprintSet([]),
          ...(step==="change"?{paths:[]}:{report:null,execution:null,evidence:[]})}:{fingerprints:[]}};}
       if(step==="approve") {
        const chosen=flow.plan.actions.filter(x=>(p.actions as unknown[]).includes(x.id));
        t.payload={...t.payload as Record<string,unknown>,paths:[...new Set(chosen.flatMap(x=>[x.target_path,...(x.extra_paths??[])]).filter((x):x is string=>!!x))].sort(),
         max_fixes:Object.fromEntries(chosen.map(x=>[x.id,x.fix_conditions.max_fixes])),role_approvals:chosen.filter(x=>x.role_approval_required).map(x=>({check:x.check,by:null}))};
       }
       envelope={...t,...envelope,payload:{...t.payload as Record<string,unknown>,...p}};
      }
     }
     if(!envelope || typeof envelope.id!=="string" || !Number.isInteger(envelope.expected_seq) ||
       typeof envelope.expires_at!=="string" || !envelope.payload || typeof envelope.payload!=="object")throw new MaatError(3,"event_shape");
     const payload=envelope.payload as Record<string,unknown>;
     const type=(a.command==="flow checkpoint"?one(a,"phase"):a.command==="flow record"?one(a,"kind"):a.command.slice(5)) as FlowEvent["type"];
     if(a.command==="flow checkpoint") {
      if(payload.action!==undefined&&payload.action!==one(a,"action"))throw new MaatError(3,"action_mismatch");
      payload.action=one(a,"action");
     }
     if(one(a,"report")) {
      if(type!=="evaluation")throw new MaatError(2,"usage_error: --report needs --kind evaluation");
      payload.report=parseReport(await input(one(a,"report")!));
     }
     const by=one(a,"by")??envelope.by??payload.by??payload.executed_by;
     if(typeof by!=="string"||!by.trim())throw new MaatError(3,"event_actor");
     if(type==="approve"||type==="authorize")payload.by=by;
     event={id:envelope.id,expected_seq:envelope.expected_seq as number,at:now,
      expires_at:envelope.expires_at,type,by,payload};
    }
    const t=await appendEvent(dir,id,event);
    if(!t.accepted)throw new MaatError(4,"flow_rejected: "+t.reason+(t.detail?" ("+t.detail+")":""));
    value=status(t.flow);
   }
  }
 }
 return {value,markdown:"# maat "+a.command+"\n\n\u0060\u0060\u0060json\n"+JSON.stringify(value,null,2)+"\n\u0060\u0060\u0060\n",
 repository,kind:a.command.replaceAll(" ","-"),diagnostics};
}
