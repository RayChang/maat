import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("an action may change its answered extra paths and use answered fix rounds",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-extra-paths-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
 const json=async(args:string[])=>{const r=await main([...args,"--json"],time);if(r.code)throw Error(args.join(" ")+": "+r.stderr);return JSON.parse(r.stdout);};
 const file=async(name:string,value:unknown)=>{await writeFile(join(dir,name),JSON.stringify(value));return join(dir,name);};
 try {
  await mkdir(join(repo,".git"),{recursive:true});await writeFile(join(repo,"README.md"),"# demo\n");
  const policy=await file("policy.json",{policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{"prompt.task-spec":{baseline:true}},exemptions:[],attestations:[]});
  const report=await file("report.json",await json(["scan",repo,"--policy",policy,"--snapshot",join(dir,"snapshot.json")]));
  const ask=(await json(["plan","--report",report,"--target","prompt.task-spec"])).actions[0];
  const bad=await main(["plan","--report",report,"--target","prompt.task-spec","--answers",await file("bad.json",{[ask.id]:{path:"docs/task.md",extra_paths:["../x"]}})],time);
  expect([bad.code,bad.stderr]).toEqual([3,expect.stringContaining("answer_extra_paths")]);
  const answers=await file("answers.json",{[ask.id]:{path:"docs/task.md",extra_paths:["scripts/check.sh"],max_fixes:1,values:{goal:"G",scope:"S",constraints:"C",acceptance:"A"}}});
  const plan=await json(["plan","--report",report,"--target","prompt.task-spec","--answers",answers]),action=plan.actions[0];
  expect([action.extra_paths,action.fix_conditions.max_fixes]).toEqual([["scripts/check.sh"],1]);
  const md=await main(["plan","--report",report,"--target","prompt.task-spec","--answers",answers],time);
  expect(md.stdout).toContain("Also changes: scripts/check.sh");
  const id=(await json(["flow","open","--plan",await file("plan.json",plan),"--snapshot",join(dir,"snapshot.json"),"--ledger",ledger])).flow_id;
  const flow=(args:string[])=>json(["flow",...args,"--flow",id,"--ledger",ledger]);
  const approve=await flow(["template","--step","approve"]);
  expect([approve.payload.paths,approve.payload.max_fixes]).toEqual([["docs/task.md","scripts/check.sh"],{[action.id]:1}]);
  Object.assign(approve.payload,{expires_at:"2026-12-01T00:00:00Z",by:"ray",source:"user statement"});
  expect((await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"])).status).toBe("approved");
  const before={...await flow(["template","--step","before","--action",action.id]),by:"host"};
  expect((await flow(["checkpoint","--action",action.id,"--phase","before","--fingerprints",await file("e2.json",before)])).status).toBe("executing");
  await mkdir(join(repo,"docs"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  await mkdir(join(repo,"scripts"));await writeFile(join(repo,"scripts/check.sh"),"exit 0\n");
  const after={...await flow(["template","--step","after","--action",action.id]),by:"host"};
  expect((await flow(["checkpoint","--action",action.id,"--phase","after","--fingerprints",await file("e3.json",after)])).status).toBe("executing");
  const change=await flow(["template","--step","change"]);
  expect(change.payload.paths).toEqual(["docs/task.md","scripts/check.sh"]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
