import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
test("stderr groups a diagnostic code with more than five entries; the output keeps the full list",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-diag-"));
 try {
  await mkdir(join(root,".git"));
  await writeFile(join(root,"AGENTS.md"),"# Agents\n\n"+[1,2,3,4,5,6].map(n=>"- [page "+n+"](https://example.com/page-"+n+")").join("\n")+"\n");
  const r=await main(["scan",root,"--json"],"2026-11-04T12:00:00Z");
  expect(r.code).toBe(0);
  expect(r.stderr).toContain("external_link: 6 entries (full list in the output's diagnostics)");
  expect(r.stderr).not.toContain("external_link: https://example.com/page-1");
  expect(JSON.parse(r.stdout).diagnostics.filter((d:string)=>d.startsWith("external_link: ")).length).toBe(6);
 } finally {await rm(root,{recursive:true,force:true});}
});
