import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,readFile,rm,symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
const time="2026-11-04T12:00:00Z";
test("flow template prints each event with the computed values filled",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-flow-template-")),repo=join(dir,"repo"),ledger=join(dir,"ledger");
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
  expect([approve.expected_seq,approve.by,approve.payload.by,approve.payload.paths,approve.payload.actions]).toEqual([0,null,null,["docs/task.md"],[action.id]]);
  Object.assign(approve.payload,{expires_at:"2026-12-01T00:00:00Z",by:"ray",source:"user statement"});
  expect((await flow(["approve","--scope",await file("e1.json",approve),"--by","ray"])).status).toBe("approved");
  expect((await main(["flow","template","--step","after","--action",action.id,"--flow",id,"--ledger",ledger],time)).stderr).toContain("flow_rejected: illegal_after (status approved; record the before checkpoint of "+action.id+" first)");
  const before={...await flow(["template","--step","before","--action",action.id]),by:"host"};
  expect((await flow(["checkpoint","--action",action.id,"--phase","before","--fingerprints",await file("e2.json",before)])).status).toBe("executing");
  expect((await main(["flow","template","--step","evaluation","--action",action.id,"--flow",id,"--ledger",ledger],time)).stderr).toContain("flow_rejected: evaluation_state (status executing; action "+action.id+" is still open: record its after checkpoint and change first)");
  await mkdir(join(repo,"docs"));await symlink(join(repo,"README.md"),join(repo,"docs/task.md"));
  expect((await main(["flow","template","--step","after","--action",action.id,"--flow",id,"--ledger",ledger],time)).stderr).toContain("repository_read: docs/task.md");
  await rm(join(repo,"docs/task.md"));await writeFile(join(repo,"docs/task.md"),action.template.body);
  const after={...await flow(["template","--step","after","--action",action.id]),by:"host"};
  expect(after.payload.fingerprints.map((f:{path:string})=>f.path)).toContain("docs/task.md");
  expect((await flow(["checkpoint","--action",action.id,"--phase","after","--fingerprints",await file("e3.json",after)])).status).toBe("executing");
  const change=await flow(["template","--step","change"]);
  expect([change.payload.paths,change.payload.executed_by,change.payload.unknown_effects]).toEqual([["docs/task.md"],null,null]);
  Object.assign(change.payload,{executed_by:"host",source:"host session",unknown_effects:[]});
  expect((await flow(["record","--kind","change","--file",await file("e4.json",change)])).status).toBe("changed");
  const evaluation=await flow(["template","--step","evaluation","--action",action.id]);
  expect([evaluation.payload.method,evaluation.payload.result]).toEqual([{kind:"manual",id:null,version:null},null]);
  expect((await main(["flow","template","--step","before","--flow",id,"--ledger",ledger],time)).stderr).toContain("--step before requires --action");
  expect(JSON.parse(await readFile(join(dir,"e1.json"),"utf8")).payload.base_fingerprint).toMatch(/^[a-f0-9]{64}$/);
  const early=await main(["flow","template","--step","before","--action",action.id,"--flow",id,"--ledger",ledger],time);
  expect([early.code,early.stderr]).toEqual([4,expect.stringContaining("flow_rejected: illegal_before (status changed; record the evaluation of the changed action first)")]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
