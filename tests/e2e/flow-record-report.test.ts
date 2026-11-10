import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("an evaluation can take its report from --report instead of inlining it",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-record-report-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
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
  await flow(["checkpoint","--action",action.id,"--phase","before","--fingerprints",await file("e2.json",{...await flow(["template","--step","before","--action",action.id]),by:"host"})]);
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  await flow(["checkpoint","--action",action.id,"--phase","after","--fingerprints",await file("e3.json",{...await flow(["template","--step","after","--action",action.id]),by:"host"})]);
  const change=await flow(["template","--step","change"]);
  Object.assign(change.payload,{executed_by:"host",source:"host session",unknown_effects:[]});
  await flow(["record","--kind","change","--file",await file("e4.json",change)]);
  const after=await file("after.json",await json(["scan",repo,"--policy",policy]));
  const evaluation=await flow(["template","--step","evaluation","--action",action.id]);
  Object.assign(evaluation.payload,{method:{kind:"manual",id:"review",version:"1"},result:"unknown",by:"ray",source:"user review",unknown_effects:[]});
  const e5=await file("e5.json",evaluation);
  const wrong=await main(["flow","record","--kind","change","--file",e5,"--report",after,"--flow",id,"--ledger",ledger],time);
  expect([wrong.code,wrong.stderr]).toEqual([2,"usage_error: --report needs --kind evaluation\n"]);
  const recorded=await flow(["record","--kind","evaluation","--file",e5,"--report",after]);
  expect([recorded.status,recorded.evaluations.length]).toEqual(["evaluated",1]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
