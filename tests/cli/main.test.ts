import { test, expect } from "bun:test";
import { main } from "../../src/cli/main";
test("CLI distinguishes normal gaps, usage errors, and malformed inputs",async()=>{
 const v=await main(["version","--json"]);expect(v.code).toBe(0);
 expect(JSON.parse(v.stdout).tool_version).toBe("0.2.0");
 expect((await main(["scan","--fail-on","missing"])).code).toBe(2);
 expect((await main(["evaluate","--snapshot","/maat-no-such-input"])).code).toBe(3);
 expect((await main(["version","--quiet"])).stdout).toBe("");
 const scan=await main(["scan","tests/cli","--json"]);
 expect(scan.code).toBe(0);
 expect(JSON.parse(scan.stdout).items.some((i:{result:string})=>i.result==="unknown")).toBe(true);
});
import { mkdtemp,writeFile,readFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { flowFixture } from "../helpers/flow";
import { createLedger,flowDirectory } from "../../src/flow/ledger";
test("flow dispatch distinguishes a guard rejection from malformed event data",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-dispatch-"));
 try {
  const f=flowFixture();await createLedger(dir,f);
  const argv=["--flow",f.flow_id,"--ledger",dir,"--json"];
  const status=await main(["flow","status",...argv],"2026-11-04","/tmp");
  expect(status.code).toBe(0);expect(JSON.parse(status.stdout).flow_id).toBe(f.flow_id);
  expect((await main(["flow","decide",...argv,"--event","accept"],"2026-11-04","/tmp")).code).toBe(4);
  const before=await readFile(join(dir,f.flow_id+".jsonl"),"utf8");
  const file=join(dir,"malformed.json");
  await writeFile(file,JSON.stringify({id:"bad",expected_seq:1,expires_at:"2027-01-01",by:"ray",
   payload:{action:"a",fingerprints:[{path:"task.md",sha256:"invalid"}]}}));
  expect((await main(["flow","checkpoint",...argv,"--action","a","--phase","before","--fingerprints",file],
   "2026-11-04","/tmp")).code).toBe(3);
  expect(await readFile(join(dir,f.flow_id+".jsonl"),"utf8")).toBe(before);
  expect(await flowDirectory("0123456789abcdef-session",undefined,{XDG_STATE_HOME:"/state"},"linux","/home/u"))
   .toBe("/state/maat/0123456789abcdef");
 }finally{await rm(dir,{recursive:true,force:true});}
});
test("flow ID finds its ledger from another cwd without a ledger override",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"maat-state-")),oldXdg=process.env.XDG_STATE_HOME,oldMaat=process.env.MAAT_STATE_DIR;
 try {
  process.env.XDG_STATE_HOME=dir;delete process.env.MAAT_STATE_DIR;
  const f=flowFixture();f.flow_id=f.repository.repo_id+"-outside-cwd";
  const location=await flowDirectory(f.flow_id);await createLedger(location,f);
  const result=await main(["flow","status","--flow",f.flow_id,"--json"],"2026-11-04","/tmp");
  expect(result.code).toBe(0);expect(JSON.parse(result.stdout).flow_id).toBe(f.flow_id);
 }finally{
  if(oldXdg===undefined)delete process.env.XDG_STATE_HOME;else process.env.XDG_STATE_HOME=oldXdg;
  if(oldMaat===undefined)delete process.env.MAAT_STATE_DIR;else process.env.MAAT_STATE_DIR=oldMaat;
  await rm(dir,{recursive:true,force:true});
 }
});
test("help lists every command and usage errors point to it",async()=>{
 const r=await main(["help"]);
 expect(r.code).toBe(0);
 expect(r.stdout).toContain("maat scan [<arg>] [--cli <claude-code|codex|copilot> ...]");
 expect(r.stdout).toContain("maat evaluate --snapshot <value>");
 expect(r.stdout).toContain("maat attest template --check <value>");
 expect(r.stdout).toContain("Global flags: [--json]");
 expect((await main(["nope"])).stderr).toBe("usage_error: unknown command (run maat help)\n");
});
