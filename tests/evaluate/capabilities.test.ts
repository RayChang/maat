import { test, expect } from "bun:test";
import { evaluateCapabilities } from "../../src/evaluate/capabilities";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("scope A cannot establish scope B and a check result grants nothing",async()=>{
 const p=emptyPolicy(),s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[{detector:"policy.verify-entrypoint@1",version:1,scope:{workflow:"A"},evidence:[],limits:[],diagnostics:[],
 facts:["name","invocation","purpose"].map(claim=>({subject:"verify.entrypoint-declared@1",claim,status:"holds" as const,
 scope:{workflow:"A"},basis:"policy declaration",complete:true}))}];
 const r=evaluateCapabilities(await loadCatalog("catalog"),[{workflow:"A"},{workflow:"B"}],s,p,"2026-11-04");
 expect(r.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.workflow==="A")!.status).toBe("holds");
 expect(r.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.workflow==="B")!.status).toBe("unknown");
 expect(r.find(x=>x.id==="evaluation.run-recorded@1")!.status).toBe("unknown");
});
