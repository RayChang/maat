import { test, expect } from "bun:test";
import { runInspectCommand } from "../../src/cli/inspect";
import { parseArgs } from "../../src/cli/args";
import { runAuditCommand } from "../../src/cli/audit";
import { sha256 } from "../../src/canonical";
import { mkdtemp,writeFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("focused explain and skeleton preserve manual requirements",async()=>{
 const time="2026-11-04T00:00:00Z";
 const e=await runInspectCommand(parseArgs(["explain","prompt.task-spec"]),time);
 expect((e.value as {id:string}).id).toBe("prompt.task-spec");
 const a=await runInspectCommand(parseArgs(["attest","template","--check","prompt.task-spec"]),time);
 expect((a.value as {claims:string[]}).claims).toEqual(["goal","scope","constraints","acceptance"]);
 const list=await runInspectCommand(parseArgs(["catalog","list","--layer","prompt","--tier","baseline"]),time);
 expect((list.value as unknown[]).length).toBe(2);
 await expect(runInspectCommand(parseArgs(["explain","unknown"]),time)).rejects.toThrow("unknown_id");
});
test("policy validate checks attestations against a saved snapshot, not the working directory",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-validate-")),input=await mkdtemp(join(tmpdir(),"maat-validate-in-"));
 try{
  const text="Goal: fix login feedback.\nScope: only the login view.\n";
  await writeFile(join(root,"task.md"),text);
  const scan=await runAuditCommand(parseArgs(["scan",root]),"2026-11-04T00:00:00Z");
  const snapshot=join(input,"snapshot.json");await writeFile(snapshot,JSON.stringify(scan.snapshot));
  const policy=join(input,"policy.yaml");
  await writeFile(policy,JSON.stringify({policy_schema:"1.0.0",catalog_version:"0.1.0",attestations:[{check:"prompt.task-spec",claims:["goal"],
   answer:"The task names the goal and the scope.",materials:[{path:"task.md",sha256:sha256(text),lines:"1-2",quote:text.trimEnd()}],
   scope:{},attested_by:"ray",attested_at:"2026-11-04T00:00:00Z",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}}]}));
  const time="2026-11-05T00:00:00Z";
  await expect(runInspectCommand(parseArgs(["policy","validate",policy]),time,input)).rejects.toThrow("policy_invalid: attestations[0] prompt.task-spec fingerprint_mismatch");
  const checked=await runInspectCommand(parseArgs(["policy","validate",policy,"--snapshot",snapshot]),time,input);
  expect(checked.value).toEqual({valid:true,policy_schema:"1.0.0"});
 }finally{await rm(root,{recursive:true,force:true});await rm(input,{recursive:true,force:true});}
});
