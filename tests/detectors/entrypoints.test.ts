import { test,expect } from "bun:test";
import { entrypointObservations,detectedEntrypoints } from "../../src/detectors/entrypoints";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("documented command binds to a real script without proving execution",()=>{
 const p=emptyPolicy(),materials=[
 {path:"AGENTS.md",text:"Verification command: bun run verify\nVerification purpose: regression\n"},
 {path:"package.json",text:'{"scripts":{"verify":"missing-executable"}}'}
 ].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 expect(detectedEntrypoints(s)[0]!.command).toBe("bun run verify");
 expect(entrypointObservations(s,p).flatMap(o=>o.facts).find(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="invocation")!.status).toBe("holds");
 s.materials[1]!.text='{"scripts":{}}';s.materials[1]!.sha256=sha256(s.materials[1]!.text);
 expect(entrypointObservations(s,p).flatMap(o=>o.facts).find(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="invocation")!.status).toBe("fails");
});
