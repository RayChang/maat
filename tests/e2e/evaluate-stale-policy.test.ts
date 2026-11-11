import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
import { sha256 } from "../../src/canonical";
test("a stale policy is named on stderr: which attestation, which file, missing or changed",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-stale-")),repo=join(root,"repo"),policy=join(root,"policy.json");
 try {
  await mkdir(join(repo,".git"),{recursive:true});await writeFile(join(repo,"README.md"),"Fix login feedback.\n");
  const attest=(path:string)=>({check:"prompt.task-spec",claims:["goal"],answer:"The task explicitly requires fixing login feedback.",
   materials:[{path,sha256:sha256("Old text.\n"),lines:"1-1",quote:"Old text."}],scope:{},attested_by:"ray",
   attested_at:"2026-11-01T00:00:00Z",expires_at:"2027-01-01T00:00:00Z",catalog_version:"0.1.0",adapter_version:{}});
  await writeFile(policy,JSON.stringify({policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{},exemptions:[],attestations:[attest("README.md"),attest("docs/gone.md")]}));
  const r=await main(["scan",repo,"--policy",policy,"--json"],"2026-11-04T12:00:00Z");
  const named=["attestations[0] prompt.task-spec fingerprint_mismatch README.md changed","attestations[1] prompt.task-spec fingerprint_mismatch docs/gone.md missing"];
  expect(r.code).toBe(0);
  expect(r.stderr.split("\n").slice(0,3)).toEqual(["policy_invalid: 2 policy issues; affected claims are unknown",...named]);
  expect(JSON.parse(r.stdout).policy).toMatchObject({valid:false,diagnostics:named});
  expect((await main(["scan",repo,"--json"],"2026-11-04T12:00:00Z")).stderr).not.toContain("policy_invalid");
 } finally {await rm(root,{recursive:true,force:true});}
});
