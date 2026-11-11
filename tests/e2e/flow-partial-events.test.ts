import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("an event file without an id holds only the answered fields; maat fills the rest from the template",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-partial-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
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
  await flow(["approve","--scope",await file("e1.json",{payload:{expires_at:"2026-12-01T00:00:00Z",by:"ray",source:"user statement"}}),"--by","ray"]);
  const change={payload:{executed_by:"host",source:"host session",unknown_effects:[]}};
  const early=await main(["flow","record","--kind","change","--file",await file("e0.json",change),"--flow",id,"--ledger",ledger],time);
  expect([early.code,early.stderr]).toEqual([4,expect.stringContaining("flow_rejected: ")]);
  expect((await flow(["status"])).last_rejection).toBeTruthy();
  await flow(["checkpoint","--action",action.id,"--phase","before","--by","host"]);
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  await flow(["checkpoint","--action",action.id,"--phase","after","--by","host"]);
  await flow(["record","--kind","change","--file",await file("e2.json",change)]);
  const after=await file("after.json",await json(["scan",repo,"--policy",policy]));
  const e3=await file("e3.json",{payload:{action:action.id,method:{kind:"manual",id:"review",version:"1"},result:"unknown",by:"ray",source:"user review",unknown_effects:[]}});
  const recorded=await flow(["record","--kind","evaluation","--file",e3,"--report",after]);
  expect([recorded.status,recorded.evaluations.length]).toEqual(["evaluated",1]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
