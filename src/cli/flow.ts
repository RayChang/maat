import { readFile,realpath,lstat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve,join,dirname } from "node:path";
import type { Args } from "./args";
import { one } from "./args";
import type { CommandResult } from "./audit";
import type { FlowEvent,Flow } from "../flow/types";
import { MaatError } from "../errors";
import { parsePlan } from "../plan";
import { parseSnapshot } from "../snapshot";
import { openFlow } from "../flow/model";
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
  const parent=dirname(path);if(parent===path)return realpath(resolve(cwd));path=parent;
 }
}
async function input(path:string):Promise<string>{try{return await readFile(path,"utf8");}catch{throw new MaatError(3,"input_read");}}
function status(f:Flow):unknown {
 return {...f,remaining_fixes:Object.fromEntries(f.plan.actions.map(a=>[a.id,
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
     let envelope:Record<string,unknown>;try{envelope=JSON.parse(await input(file!));}catch{throw new MaatError(3,"event_parse");}
     if(!envelope || typeof envelope.id!=="string" || !Number.isInteger(envelope.expected_seq) ||
       typeof envelope.expires_at!=="string" || !envelope.payload || typeof envelope.payload!=="object")throw new MaatError(3,"event_shape");
     const payload=envelope.payload as Record<string,unknown>;
     const type=(a.command==="flow checkpoint"?one(a,"phase"):a.command==="flow record"?one(a,"kind"):a.command.slice(5)) as FlowEvent["type"];
     if(a.command==="flow checkpoint") {
      if(payload.action!==undefined&&payload.action!==one(a,"action"))throw new MaatError(3,"action_mismatch");
      payload.action=one(a,"action");
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
