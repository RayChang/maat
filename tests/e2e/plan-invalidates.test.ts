import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
import { sha256 } from "../../src/canonical";
const time="2026-11-04T12:00:00Z";
test("the plan lists the valid attestations an action's change would invalidate",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-invalidates-")),repo=join(dir,"repo");
 const json=async(args:string[])=>{const r=await main([...args,"--json"],time);if(r.code)throw Error(args.join(" ")+": "+r.stderr);return JSON.parse(r.stdout);};
 const file=async(name:string,value:unknown)=>{await writeFile(join(dir,name),JSON.stringify(value));return join(dir,name);};
 try {
  const text="Goal: fix login feedback.\n";
  await mkdir(join(repo,".git"),{recursive:true});await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),text);
  const policy=await file("policy.json",{policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{"prompt.task-spec":{baseline:true}},exemptions:[],attestations:[{check:"prompt.task-spec",claims:["goal"],
   answer:"The task names the goal.",materials:[{path:"docs/task.md",sha256:sha256(text),lines:"1-1",quote:text.trimEnd()}],
   scope:{},attested_by:"ray",attested_at:"2026-11-04T00:00:00Z",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}}]});
  const report=await file("report.json",await json(["scan",repo,"--policy",policy]));
  const ask=(await json(["plan","--report",report,"--target","prompt.task-spec"])).actions[0];
  const answers=await file("answers.json",{[ask.id]:{path:"docs/task.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}});
  expect((await json(["plan","--report",report,"--target","prompt.task-spec","--answers",answers])).actions[0].invalidates).toEqual(["attestations[0] prompt.task-spec"]);
  const md=await main(["plan","--report",report,"--target","prompt.task-spec","--answers",answers],time);
  expect(md.stdout).toContain("Invalidates attestations (they must be confirmed again after the change): attestations[0] prompt.task-spec");
  const other=await file("other.json",{[ask.id]:{path:"docs/other.md",values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}});
  expect((await json(["plan","--report",report,"--target","prompt.task-spec","--answers",other])).actions[0].invalidates).toEqual([]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
