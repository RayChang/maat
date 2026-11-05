import { test, expect } from "bun:test";
import { mkdtemp,writeFile,readFile,readdir,realpath,rm } from "node:fs/promises";
import { tmpdir,hostname } from "node:os";
import { join } from "node:path";
import { fingerprintSet } from "../../src/flow/model";
import { createLedger,appendEvent,readFlow,listFlows } from "../../src/flow/ledger";
import { main } from "../../src/cli/main";
import { flowFixture,flowEvent } from "../helpers/flow";
test("restart preserves counters, bytes append, and locks reject races",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-ledger-"));
 try{
  const f=flowFixture();
  await createLedger(dir,f);
  let current=(await appendEvent(dir,f.flow_id,flowEvent(f,"approve",{plan_fingerprint:f.plan_fingerprint,
   base_fingerprint:fingerprintSet(f.current),actions:["a"],paths:["task.md"],mode:"plan",candidate_fingerprint:null,
   max_fixes:{a:1},role_approvals:[],expires_at:"2027-01-01",by:"ray",source:"user"}))).flow;
  current=(await appendEvent(dir,f.flow_id,flowEvent(current,"evaluation",{action:"a",candidate_fingerprint:fingerprintSet(current.current),
   method:{kind:"manual",id:"review",version:"1"},result:"fail",report:null,execution:null,evidence:[],
   by:"ray",source:"user",unknown_effects:[]}))).flow;
  current=(await appendEvent(dir,f.flow_id,flowEvent(current,"continue-fix",{}))).flow;
  expect((await readFlow(dir,f.flow_id)).fixes.a).toBe(1);
  const before=await readFile(join(dir,"fixture.jsonl"),"utf8");
  const t=await appendEvent(dir,f.flow_id,flowEvent(current,"stop",{}));
  expect(t.accepted).toBe(true);
  expect((await readFile(join(dir,"fixture.jsonl"),"utf8")).startsWith(before)).toBe(true);
  expect((await readFlow(dir,f.flow_id)).seq).toBe(4);
  expect(before).not.toContain('"state":');expect(before).not.toContain('"previous_hash":');
  await writeFile(join(dir,"fixture.lock"),"other writer");
  await expect(appendEvent(dir,f.flow_id,flowEvent(t.flow,"resume",{}))).rejects.toMatchObject({code:1,message:"ledger_locked"});
 }finally{await rm(dir,{recursive:true,force:true});}
});
function deadPid():number {
 for(let pid=2**22;pid>1;pid--) {
  try{process.kill(pid,0);}catch(e){if((e as NodeJS.ErrnoException).code==="ESRCH")return pid;}
 }
 throw new Error("no dead pid");
}
async function withLedger(run:(dir:string,f:ReturnType<typeof flowFixture>)=>Promise<void>):Promise<void> {
 const dir=await mkdtemp(join(tmpdir(),"maat-ledger-"));
 try{const f=flowFixture();await createLedger(dir,f);await run(dir,f);}finally{await rm(dir,{recursive:true,force:true});}
}
test("a lock left by a dead pid on this host is cleared once and the append succeeds",()=>withLedger(async(dir,f)=>{
 await writeFile(join(dir,"fixture.lock"),JSON.stringify({pid:deadPid(),host:hostname()}));
 expect((await appendEvent(dir,f.flow_id,flowEvent(f,"stop",{}))).accepted).toBe(true);
 expect((await readFlow(dir,f.flow_id)).seq).toBe(1);
 expect((await readdir(dir)).sort()).toEqual(["fixture.jsonl"]);
}));
for(const [name,content] of [
 ["a live pid",()=>JSON.stringify({pid:process.pid,host:hostname()})],
 ["another hostname",()=>JSON.stringify({pid:deadPid(),host:hostname()+"-elsewhere"})],
 ["unparseable content",()=>"{not json"],
] as const) test("a lock with "+name+" still yields ledger_locked",()=>withLedger(async(dir,f)=>{
 await writeFile(join(dir,"fixture.lock"),content());
 await expect(appendEvent(dir,f.flow_id,flowEvent(f,"stop",{}))).rejects.toMatchObject({code:1,message:"ledger_locked"});
 expect(await readFile(join(dir,"fixture.lock"),"utf8")).toBe(content());
}));
test("flow list skips a corrupt ledger, keeps the healthy flows, and reports the file on stderr",()=>withLedger(async(dir,f)=>{
 const broken=join(dir,"broken.jsonl");await writeFile(broken,'{"seq":0}');
 const listed=await listFlows(dir,f.repository.repo_id);
 expect(listed.flows.map(x=>x.flow_id)).toEqual(["fixture"]);
 expect(listed.diagnostics).toEqual(["ledger_skipped: "+broken+": ledger_truncated"]);
 const cli=await main(["flow","list","--ledger",dir,"--json"],"2026-11-04","/tmp");
 expect(cli.code).toBe(0);expect(JSON.parse(cli.stdout)).toEqual([]);
 expect(cli.stderr).toBe("ledger_skipped: "+await realpath(broken)+": ledger_truncated\n");
}));
