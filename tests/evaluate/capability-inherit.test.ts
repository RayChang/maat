import { test,expect } from "bun:test";
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot,makeScan } from "../../src/snapshot";
import { sha256 } from "../../src/canonical";
import { entrypointObservations } from "../../src/detectors/entrypoints";
import { evaluateCapabilities } from "../../src/evaluate/capabilities";
test("a capability shown for the whole project also counts for each CLI",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.target_clis=["claude-code"];
 p.attestations=[{check:"prompt.task-spec",claims:["goal"],answer:"draft",scope:{cli:"codex"}} as never];
 const materials=[{path:"AGENTS.md",text:"Verification command: bun run test\nVerification purpose: regression\n"},
  {path:"package.json",text:"{\"scripts\":{\"test\":\"bun test\"}}\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const inv={root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials};
 const cli={detector:"permissions.declarations@1",version:1,scope:{cli:"claude-code"},evidence:[],limits:[],diagnostics:[],facts:[]};
 const s=makeSnapshot(inv,p,[],[...entrypointObservations(makeScan(inv,p),p),cli]);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const declared=r.capabilities.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.cli==="claude-code")!;
 expect(declared.status).toBe("holds");
 expect(declared.basis).toContain("inherited_from_project_scope");
 expect(r.capabilities.find(x=>x.id==="verify.entrypoint-documented@1"&&x.scope.cli==="claude-code")!.basis).toContain("inherited_from_project_scope");
 expect(r.layers.find(l=>l.layer==="harness"&&l.scope.cli==="claude-code")!.unknown_required).toEqual([]);
 expect(r.capabilities.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.cli==="codex")!.status).toBe("unknown");
});
test("only the verification entrypoint capabilities are inherited, and own evidence wins",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.target_clis=["claude-code"];
 p.attestations=[{check:"foundation.verify-entrypoints",claims:["declared"],answer:"draft",scope:{cli:"claude-code"}} as never];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const fact=(subject:string,claim:string)=>({subject,claim,status:"holds" as const,scope:{},basis:"fixture",complete:true});
 s.observations=[{detector:"fixture",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[
  ...["name","invocation","purpose"].map(k=>fact("verify.entrypoint-declared@1",k)),
  ...["input","method","criteria","result"].map(k=>fact("evaluation.config-declared@1",k))]}];
 const caps=evaluateCapabilities(c,[{},{cli:"claude-code"},{workflow:"run.sh"}],s,p,"2026-11-04T00:00:00Z");
 const at=(id:string,scope:object)=>caps.find(x=>x.id===id&&JSON.stringify(x.scope)===JSON.stringify(scope))!;
 expect(at("verify.entrypoint-declared@1",{workflow:"run.sh"}).status).toBe("holds");
 expect(at("evaluation.config-declared@1",{workflow:"run.sh"}).status).toBe("unknown");
 const own=at("verify.entrypoint-declared@1",{cli:"claude-code"});
 expect(own.status).toBe("unknown");
 expect(own.basis).not.toContain("inherited_from_project_scope");
});
