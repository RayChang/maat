import { test,expect } from "bun:test";
import { ciObservations } from "../../src/detectors/ci";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("literal configured invocation is distinct from runtime enforcement",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:".github/workflows/ci.yml",text:"jobs:\n  test:\n    steps:\n      - run: bun test\n        continue-on-error: true\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const facts=ciObservations(s,p).flatMap(o=>o.facts);
 expect(facts.find(f=>f.claim==="invocation")!.status).toBe("holds");
 expect(facts.find(f=>f.claim==="consequence")!.basis).toBe("advisory");
 s.materials[1]!.text=s.materials[1]!.text.replace("bun test","bun test && echo ok");
 expect(ciObservations(s,p).flatMap(o=>o.facts).find(f=>f.claim==="invocation")!.status).toBe("unknown");
});
