import { test, expect } from "bun:test";
import { mkdtemp,writeFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAuditCommand } from "../../src/cli/audit";
import { parseArgs } from "../../src/cli/args";
test("evaluate survives removal of the source repository",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-audit-")),input=await mkdtemp(join(tmpdir(),"maat-input-"));
 try{
  await writeFile(join(root,"AGENTS.md"),"# Guide\n");
  const scan=await runAuditCommand(parseArgs(["scan",root]),"2026-11-04T00:00:00Z");
  const file=join(input,"snapshot.json");await writeFile(file,JSON.stringify(scan.snapshot));
  await rm(root,{recursive:true,force:true});
  const evaluated=await runAuditCommand(parseArgs(["evaluate","--snapshot",file]),"2026-11-04T00:00:00Z");
  expect((evaluated.value as {items:unknown[]}).items).toEqual((scan.value as {items:unknown[]}).items);
 }finally{await rm(root,{recursive:true,force:true});await rm(input,{recursive:true,force:true});}
});
