import { link,mkdir,open,readFile,readdir,unlink,writeFile } from "node:fs/promises";
import { join,resolve } from "node:path";
import { homedir,hostname } from "node:os";
import { randomUUID } from "node:crypto";
import type { Flow,FlowEvent,LedgerRow,Transition } from "./types";
import { MaatError } from "../errors";
import { canonical,repoId } from "../canonical";
import { outsidePath,writeOutside } from "../cli/output";
import { reduceFlow } from "./reducer";
import { openFlow } from "./model";
import { validateFlowEvent } from "./validate";
function path(dir:string,id:string):string {
 if(!/^[a-zA-Z0-9-]+$/.test(id))throw new MaatError(3,"flow_id");
 return join(dir,id+".jsonl");
}
export async function ledgerDirectory(repository:string,override?:string,env:Record<string,string|undefined>=process.env,platform=process.platform,home=homedir()):Promise<string> {
 const id=repoId(resolve(repository));
 const dir=override??env.MAAT_STATE_DIR??(env.XDG_STATE_HOME?join(env.XDG_STATE_HOME,"maat",id):
 platform==="darwin"?join(home,"Library/Application Support/maat",id):join(home,".local/state/maat",id));
 return outsidePath(dir,repository);
}
export async function flowDirectory(id:string,override?:string,env:Record<string,string|undefined>=process.env,platform=process.platform,home=homedir()):Promise<string> {
 const chosen=override??env.MAAT_STATE_DIR;if(chosen)return resolve(chosen);
 const match=/^([a-f0-9]{16})-[a-zA-Z0-9-]+$/.exec(id);
 if(!match)throw new MaatError(3,"flow_id_requires_repository_prefix");
 const base=env.XDG_STATE_HOME?join(env.XDG_STATE_HOME,"maat"):
 platform==="darwin"?join(home,"Library/Application Support/maat"):join(home,".local/state/maat");
 return join(base,match[1]!);
}
function decode(text:string):{rows:LedgerRow[];flow:Flow} {
 if(!text.endsWith("\n"))throw new MaatError(3,"ledger_truncated");
 let rows:LedgerRow[];
 try{rows=text.trimEnd().split("\n").map(line=>JSON.parse(line));}catch{throw new MaatError(3,"ledger_parse");}
 const first=rows[0];
 if(!first||first.event?.type!=="open"||first.seq!==0||first.before!==null)throw new MaatError(3,"ledger_integrity");
 let flow=openFlow(first.event.id,first.event.plan,{repository:first.event.plan.repository,materials:first.event.fingerprints});
 for(let n=0;n<rows.length;n++) {
  const row=rows[n]!;
  if(row.ledger_schema!=="1.0.0"||row.seq!==n||!Number.isFinite(Date.parse(row.at)))throw new MaatError(3,"ledger_integrity");
  if(n===0) {
   if(row.after!=="open"||!row.accepted||row.reason!==null)throw new MaatError(3,"ledger_integrity");
   continue;
  }
  if(row.event.type==="open"||row.before!==flow.status)throw new MaatError(3,"ledger_integrity");
  const transition=reduceFlow(flow,row.event);
  if(row.after!==transition.flow.status||row.accepted!==transition.accepted||row.reason!==transition.reason)
   throw new MaatError(3,"ledger_integrity");
  flow=transition.flow;
 }
 return {rows,flow};
}
async function textFile(dir:string,id:string):Promise<string> {
 try{return await readFile(path(dir,id),"utf8");}catch{throw new MaatError(3,"ledger_read");}
}
export async function readFlow(dir:string,id:string):Promise<Flow> {
 return decode(await textFile(dir,id)).flow;
}
const errno=(e:unknown)=>(e as NodeJS.ErrnoException).code;
const lockedError=()=>new MaatError(1,"ledger_locked");
async function attempt(lock:string,token:string):Promise<boolean> {
 const temp=lock+"."+randomUUID()+".tmp";
 try{await writeFile(temp,token,{flag:"wx",mode:0o600});await link(temp,lock);return true;}
 catch(e){if(errno(e)==="EEXIST")return false;throw new MaatError(1,"ledger_lock_io");}
 finally{await unlink(temp).catch(()=>{});}
}
function stale(text:string):boolean {
 let owner;try{owner=JSON.parse(text);}catch{return false;}
 if(owner?.host!==hostname()||!Number.isInteger(owner.pid)||owner.pid<=0)return false;
 try{process.kill(owner.pid,0);return false;}catch(e){return errno(e)==="ESRCH";}
}
// Stale clearing is serialized by `<lock>.break`: only its holder may delete the lock, and only if the lock still
// holds the exact stale content judged, so a fresh lock taken meanwhile is never removed.
async function breakStale(lock:string,seen:string,read:(p:string)=>Promise<string>):Promise<void> {
 const breaker=lock+".break";let handle;
 try{handle=await open(breaker,"wx",0o600);}catch(e){throw errno(e)==="EEXIST"?lockedError():new MaatError(1,"ledger_lock_io");}
 try{
  await handle.writeFile(String(process.pid));await handle.close();handle=undefined;
  if(await read(lock).catch(()=>null)===seen)
   await unlink(lock).catch(e=>{if(errno(e)!=="ENOENT")throw new MaatError(1,"ledger_lock_io");});
 }finally{await handle?.close();await unlink(breaker).catch(()=>{});}
}
export async function takeLock(lock:string,read=(p:string)=>readFile(p,"utf8")):Promise<string> {
 const token=JSON.stringify({pid:process.pid,host:hostname(),nonce:randomUUID()});
 if(await attempt(lock,token))return token;
 let seen:string|null;
 try{seen=await read(lock);}catch(e){if(errno(e)!=="ENOENT")throw lockedError();seen=null;}
 if(seen!==null) {
  if(!stale(seen))throw lockedError();
  await breakStale(lock,seen,read);
 }
 if(await attempt(lock,token))return token;
 throw lockedError();
}
export async function releaseLock(lock:string,token:string):Promise<void> {
 try{if(await readFile(lock,"utf8")===token)await unlink(lock);}catch{}
}
async function locked<T>(dir:string,id:string,root:string,operation:()=>Promise<T>):Promise<T> {
 dir=await outsidePath(dir,root);await mkdir(dir,{recursive:true});
 const lock=join(dir,id+".lock"),token=await takeLock(lock);
 try{return await operation();}finally{await releaseLock(lock,token);}
}
export async function createLedger(dir:string,f:Flow):Promise<void> {
 await locked(dir,f.flow_id,f.repository.path,async()=>{
  try{await readFile(path(dir,f.flow_id));throw new MaatError(4,"flow_exists");}
  catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  const first:LedgerRow={ledger_schema:"1.0.0",seq:0,at:new Date().toISOString(),before:null,after:"open",
   event:{type:"open",id:f.flow_id,plan:f.plan,fingerprints:f.base},accepted:true,reason:null};
  await writeOutside(path(dir,f.flow_id),canonical(first)+"\n",f.repository.path);
 });
}
export async function appendEvent(dir:string,id:string,event:FlowEvent):Promise<Transition> {
 validateFlowEvent(event);
 const initial=await readFlow(dir,id);
 return locked(dir,id,initial.repository.path,async()=>{
  const text=await textFile(dir,id),{flow}=decode(text),transition=reduceFlow(flow,event);
  const row:LedgerRow={ledger_schema:"1.0.0",seq:transition.flow.seq,at:event.at,before:flow.status,
   after:transition.flow.status,event,accepted:transition.accepted,reason:transition.reason};
  await writeOutside(path(dir,id),text+canonical(row)+"\n",flow.repository.path);
  return transition;
 });
}
export async function listFlows(dir:string,repositoryId:string):Promise<{flows:Flow[];diagnostics:string[]}> {
 let names:string[];
 try{names=(await readdir(dir)).filter(n=>n.endsWith(".jsonl")).sort();}
 catch(e){if(errno(e)==="ENOENT")return {flows:[],diagnostics:[]};throw new MaatError(3,"ledger_read");}
 const flows:Flow[]=[],diagnostics:string[]=[];
 for(const n of names) {
  try{flows.push(await readFlow(dir,n.slice(0,-6)));}
  catch(e){if(!(e instanceof MaatError)||e.code!==3)throw e;diagnostics.push("ledger_skipped: "+join(dir,n)+": "+e.message);}
 }
 return {flows:flows.filter(f=>f.repository.repo_id===repositoryId),diagnostics};
}
