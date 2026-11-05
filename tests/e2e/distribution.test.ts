import { test,expect,spyOn } from "bun:test";
import { checkShape,type Shape } from "../../src/schema";
import { parseReport } from "../../src/report";
import { mkdtemp,cp,writeFile,readdir,readFile,lstat,symlink,chmod,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../src/cli/main";
import { sha256 } from "../../src/canonical";
import { type Report } from "../../src/models";
test("report schema and source bin preserve dependency-free installation",async()=>{
 const pkg=await Bun.file("package.json").json();
 if(pkg.bin?.maat!=="src/cli/index.ts")throw Error("source_bin_contract_missing");
 expect(pkg.name).toBe("maat");expect(pkg.private).toBe(true);
 expect(pkg.bin).toEqual({maat:"src/cli/index.ts"});
 expect(pkg.dependencies??{}).toEqual({});
 expect(Object.keys(pkg.devDependencies).sort()).toEqual(["@types/bun","typescript"]);
 const schema=await Bun.file("src/report/schema.json").json();
 expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
 const validReport=await Bun.file("tests/fixtures/flow/candidate.report.json").json();
 expect(()=>checkShape(validReport,schema as Shape)).not.toThrow();
 const report=await Bun.file("tests/fixtures/flow/candidate.report.json").json();
 report.items[0].result="green";
 expect(()=>parseReport(JSON.stringify(report))).toThrow("schema_error");
});
async function inventory(root:string):Promise<string[]> {
 const values:string[]=[];
 async function walk(rel:string):Promise<void>{
  for(const name of (await readdir(join(root,rel))).sort()){
   const p=rel?rel+"/"+name:name,st=await lstat(join(root,p));
   if(st.isSymbolicLink()){values.push(p+":symlink");continue;}
   if(st.isDirectory())await walk(p);else {
    try{values.push(p+":"+sha256(await readFile(join(root,p))));}catch{values.push(p+":unreadable");}
   }
  }
 }
 await walk("");return values;
}
test("scan/evaluate/plan never execute target content or mutate a target",async()=>{
 const base=await mkdtemp(join(tmpdir(),"maat-safety-")),root=join(base,"repo");
 const network=spyOn(globalThis,"fetch").mockImplementation(Object.assign(()=>{throw Error("network invoked");},{preconnect:()=>{throw Error("network invoked");}}));
 const spawn=spyOn(Bun,"spawn").mockImplementation(()=>{throw Error("subprocess invoked");});
 const sync=spyOn(Bun,"spawnSync").mockImplementation(()=>{throw Error("subprocess invoked");});
 try {
  await cp("tests/fixtures/malicious-config",root,{recursive:true});
  await writeFile(join(root,"dirty.md"),"Unrelated user content\n");
  await writeFile(join(root,"invalid.md"),new Uint8Array([0xff,0xfe]));
  await symlink("/etc/passwd",join(root,"escape.md"));
  const before=await inventory(root),snapshot=join(base,"snapshot.json"),out=join(base,"reports");
  const scan=await main(["scan",root,"--json","--snapshot",snapshot,"--out",out],"2026-11-04T12:00:00Z");
  expect(scan.code).toBe(0);const report=JSON.parse(scan.stdout) as Report;
  expect(report.scope.diagnostics).toContain("read_error: invalid.md");
  expect(report.scope.diagnostics).toContain("symlink_unread: escape.md");
  expect(report.scope.complete).toBe(false);
  expect(scan.stdout).not.toContain("private fixture sentinel");
  expect((await main(["evaluate","--snapshot",snapshot,"--json"])).code).toBe(0);
  expect((await main(["plan","--report",join(out,"report.json"),"--json"])).code).toBe(0);
  expect((await main(["scan",root,"--out",join(root,"reports")])).code).toBe(3);
  expect(await inventory(root)).toEqual(before);
  expect(await Bun.file(join(root,"MAAT_MUST_NOT_RUN")).exists()).toBe(false);
  expect(network).not.toHaveBeenCalled();expect(spawn).not.toHaveBeenCalled();expect(sync).not.toHaveBeenCalled();
 } finally {network.mockRestore();spawn.mockRestore();sync.mockRestore();await rm(base,{recursive:true,force:true});}
});
test("permission-denied material is unknown and never missing",async()=>{
 expect(process.getuid?.()).not.toBe(0);
 const root=await mkdtemp(join(tmpdir(),"maat-permission-")),file=join(root,"AGENTS.md");
 try{
  await writeFile(file,"inaccessible\n");await chmod(file,0);
  const run=await main(["scan",root,"--json"]);expect(run.code).toBe(0);
  expect((JSON.parse(run.stdout) as Report).scope.diagnostics).toContain("read_error: AGENTS.md");
 }finally{await chmod(file,0o600);await rm(root,{recursive:true,force:true});}
});
