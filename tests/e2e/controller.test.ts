import { test, expect } from "bun:test";
import { mkdtemp,readFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z",fixture="tests/fixtures/flow/";
test("approved edits accept only their matching evidence and survive restart",async()=>{
 const ledger=await mkdtemp(join(tmpdir(),"maat-flow-e2e-"));
 const call=(args:string[])=>main(["flow",...args,"--ledger",ledger,"--json"],time);
 try {
  const opened=await call(["open","--plan",fixture+"base.plan.json","--snapshot",fixture+"base.snapshot.json"]);
  if(opened.code!==0)throw Error("controller_fixture_missing");
  expect(opened.code).toBe(0);const id=JSON.parse(opened.stdout).flow_id as string;
  for(const args of [
   ["approve","--scope",fixture+"approval.json","--by","ray"],
   ["checkpoint","--action","a","--phase","before","--fingerprints",fixture+"before.json"],
   ["checkpoint","--action","a","--phase","after","--fingerprints",fixture+"after.json"],
   ["record","--kind","change","--file",fixture+"change.json"],
   ["record","--kind","evaluation","--file",fixture+"evaluation.json"]
  ]) expect((await call([...args,"--flow",id])).code).toBe(0);
  const accepted=await call(["decide","--event","accept","--by","ray","--flow",id]);
  expect(accepted.code).toBe(0);expect(JSON.parse(accepted.stdout).status).toBe("accepted");
  const repeated=await call(["decide","--event","accept","--by","ray","--flow",id]);
  expect(repeated.code).toBe(4);
  const status=await call(["status","--flow",id]);expect(JSON.parse(status.stdout).attempts.a).toBe(1);
  const rows=(await readFile(join(ledger,id+".jsonl"),"utf8")).trim().split("\n").map(x=>JSON.parse(x));
  expect(rows.at(-1).accepted).toBe(false);
 }finally{await rm(ledger,{recursive:true,force:true});}
});
test("timeout, command without authorization, and stale approval do not pass",async()=>{
 for(const variant of ["timeout","unauthorized-command","stale-approval"]) {
  const ledger=await mkdtemp(join(tmpdir(),"maat-flow-reject-"));
  const call=(args:string[])=>main(["flow",...args,"--ledger",ledger,"--json"],time);
  try{
   const opened=await call(["open","--plan",fixture+"base.plan.json","--snapshot",fixture+"base.snapshot.json"]);
   const id=JSON.parse(opened.stdout).flow_id;
   if(variant==="stale-approval") {
    expect((await call(["approve","--flow",id,"--scope",fixture+"stale-approval.json","--by","ray"])).code).toBe(4);
    continue;
   }
   for(const args of [
    ["approve","--scope",fixture+"approval.json","--by","ray"],
    ["checkpoint","--action","a","--phase","before","--fingerprints",fixture+"before.json"],
    ["checkpoint","--action","a","--phase","after","--fingerprints",fixture+"after.json"],
    ["record","--kind","change","--file",fixture+"change.json"]
   ])expect((await call([...args,"--flow",id])).code).toBe(0);
   const result=await call(["record","--kind","evaluation","--flow",id,"--file",fixture+variant+".json"]);
   expect(result.code).toBe(variant==="timeout"?0:4);
   expect((await call(["decide","--event","accept","--flow",id])).code).toBe(4);
  }finally{await rm(ledger,{recursive:true,force:true});}
 }
});
test("fresh content evidence can conform despite an unrelated prior flow violation",async()=>{
 const report=JSON.parse(await readFile(fixture+"candidate.report.json","utf8"));
 expect(report.items.find((i:{id:string})=>i.id==="prompt.task-spec").result).toBe("verified");
 expect(report.diagnostics).not.toContain("historical_flow_violation");
});
test("drift, out-of-scope edits, and expired events cannot enter a legal flow",async()=>{
 for(const variant of ["drift-before","out-of-scope-after","expired-approval"]) {
  const ledger=await mkdtemp(join(tmpdir(),"maat-flow-boundary-"));
  const call=(args:string[])=>main(["flow",...args,"--ledger",ledger,"--json"],time);
  try {
   const opened=await call(["open","--plan",fixture+"base.plan.json","--snapshot",fixture+"base.snapshot.json"]);
   const id=JSON.parse(opened.stdout).flow_id;
   if(variant==="expired-approval"){
    expect((await call(["approve","--flow",id,"--scope",fixture+variant+".json","--by","ray"])).code).toBe(4);continue;
   }
   expect((await call(["approve","--flow",id,"--scope",fixture+"approval.json","--by","ray"])).code).toBe(0);
   if(variant==="out-of-scope-after")
    expect((await call(["checkpoint","--flow",id,"--action","a","--phase","before","--fingerprints",fixture+"before.json"])).code).toBe(0);
   expect((await call(["checkpoint","--flow",id,"--action","a","--phase",variant==="drift-before"?"before":"after","--fingerprints",fixture+variant+".json"])).code).toBe(4);
   expect(JSON.parse((await call(["status","--flow",id])).stdout).status).toBe("drifted");
  }finally{await rm(ledger,{recursive:true,force:true});}
 }
});
