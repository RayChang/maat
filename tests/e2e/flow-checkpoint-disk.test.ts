import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("a checkpoint without --fingerprints reads the files itself and needs --by",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-checkpoint-disk-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
 const json=async(args:string[])=>{const r=await main([...args,"--json"],time);if(r.code)throw Error(args.join(" ")+": "+r.stderr);return JSON.parse(r.stdout);};
 const file=async(name:string,value:unknown)=>{await writeFile(join(dir,name),JSON.stringify(value));return join(dir,name);};
 try {
  await mkdir(join(repo,".git"),{recursive:true});await writeFile(join(repo,"README.md"),"# demo\n");
  const policy=await file("policy.json",{policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{"prompt.task-spec":{baseline:true}},exemptions:[],attestations:[]});
  const report=await file("report.json",await json(["scan",repo,"--policy",policy,"--snapshot",join(dir,"snapshot.json")]));
  const ask=(await json(["plan","--report",report,"--target","prompt.task-spec"])).actions[0];
  const answers=await file("answers.json",{[ask.id]:{path:"docs/task.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}});
  const plan=await json(["plan","--report",report,"--target","prompt.task-spec","--answers",answers]),action=plan.actions[0];
  const id=(await json(["flow","open","--plan",await file("plan.json",plan),"--snapshot",join(dir,"snapshot.json"),"--ledger",ledger])).flow_id;
  const flow=(args:string[])=>json(["flow",...args,"--flow",id,"--ledger",ledger]);
  const approve=await flow(["template","--step","approve"]);
  Object.assign(approve.payload,{expires_at:"2026-12-01T00:00:00Z",by:"ray",source:"user statement"});
  await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"]);
  const anonymous=await main(["flow","checkpoint","--action",action.id,"--phase","before","--flow",id,"--ledger",ledger],time);
  expect([anonymous.code,anonymous.stderr]).toEqual([3,"event_actor\n"]);
  expect((await flow(["checkpoint","--action",action.id,"--phase","before","--by","host"])).status).toBe("executing");
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  expect((await flow(["checkpoint","--action",action.id,"--phase","after","--by","host"])).status).toBe("executing");
  const early=await main(["flow","checkpoint","--action",action.id,"--phase","before","--by","host","--flow",id,"--ledger",ledger],time);
  expect([early.code,early.stderr]).toEqual([4,expect.stringContaining("flow_rejected: illegal_before")]);
  const state=await flow(["status"]);
  expect([state.seq,state.last_rejection]).toEqual([4,"illegal_before"]);
  expect((await flow(["template","--step","change"])).payload.paths).toEqual(["docs/task.md"]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
