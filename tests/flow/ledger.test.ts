import { test, expect } from "bun:test";
import { mkdtemp,writeFile,readFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fingerprintSet } from "../../src/flow/model";
import { createLedger,appendEvent,readFlow } from "../../src/flow/ledger";
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
