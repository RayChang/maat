import { test,expect } from "bun:test";
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot,makeScan } from "../../src/snapshot";
import { sha256 } from "../../src/canonical";
import { entrypointObservations } from "../../src/detectors/entrypoints";
test("a capability shown for the whole project also counts for each CLI",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.target_clis=["claude-code"];
 const materials=[{path:"AGENTS.md",text:"Verification command: bun run test\nVerification purpose: regression\n"},
  {path:"package.json",text:"{\"scripts\":{\"test\":\"bun test\"}}\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const inv={root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials};
 const cli={detector:"permissions.declarations@1",version:1,scope:{cli:"claude-code"},evidence:[],limits:[],diagnostics:[],facts:[]};
 const s=makeSnapshot(inv,p,[],[...entrypointObservations(makeScan(inv,p),p),cli]);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const declared=r.capabilities.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.cli==="claude-code")!;
 expect(declared.status).toBe("holds");
 expect(declared.basis).toContain("inherited_from_project_scope");
 expect(r.layers.find(l=>l.layer==="harness"&&l.scope.cli==="claude-code")!.unknown_required).toEqual([]);
});
