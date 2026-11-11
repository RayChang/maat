import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("flow event errors name the file, the flag and the payload field",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-event-errors-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
 const json=async(args:string[])=>{const r=await main([...args,"--json"],time);if(r.code)throw Error(args.join(" ")+": "+r.stderr);return JSON.parse(r.stdout);};
 const file=async(name:string,value:string)=>{await writeFile(join(dir,name),value);return join(dir,name);};
 try {
  await mkdir(join(repo,".git"),{recursive:true});await writeFile(join(repo,"README.md"),"# demo\n");
  const policy=await file("policy.json",JSON.stringify({policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{"prompt.task-spec":{baseline:true}},exemptions:[],attestations:[]}));
  const report=await file("report.json",JSON.stringify(await json(["scan",repo,"--policy",policy,"--snapshot",join(dir,"snapshot.json")])));
  const ask=(await json(["plan","--report",report,"--target","prompt.task-spec"])).actions[0];
  const answers=await file("answers.json",JSON.stringify({[ask.id]:{path:"docs/task.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}}));
  const plan=await file("plan.json",JSON.stringify(await json(["plan","--report",report,"--target","prompt.task-spec","--answers",answers])));
  const id=(await json(["flow","open","--plan",plan,"--snapshot",join(dir,"snapshot.json"),"--ledger",ledger])).flow_id;
  const approve=(scope:string)=>main(["flow","approve","--scope",scope,"--by","ray","--flow",id,"--ledger",ledger],time);
  const hint=" (--scope takes the event JSON file saved from maat flow template --json and filled in)\n";
  expect((await approve("plan")).stderr).toBe("input_read: plan"+hint);
  const markdown=await file("approve.md",(await main(["flow","template","--step","approve","--flow",id,"--ledger",ledger],time)).stdout);
  expect((await approve(markdown)).stderr).toBe("event_parse: "+markdown+hint);
  const change=await file("change.json",JSON.stringify({id:"c1",expected_seq:0,expires_at:"2026-12-01T00:00:00Z",by:"ray",
   payload:{action:"a",candidate_fingerprint:"0".repeat(64),paths:["docs/task.md"],executed_by:null,source:"host",unknown_effects:[]}}));
  const unfilled=await main(["flow","record","--kind","change","--file",change,"--flow",id,"--ledger",ledger],time);
  expect([unfilled.code,unfilled.stderr]).toEqual([3,"schema_error: $.payload.executed_by expected string\n"]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
