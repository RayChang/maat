import { test,expect } from "bun:test";
import { graphClaims } from "../../src/evaluate/contracts/graph";
import { resolveClaim } from "../../src/evaluate/truth";
import { loadCatalog } from "../../src/catalog/load";
import { makeSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("graph contracts preserve every item and require bound human evidence",async()=>{
 const catalog=await loadCatalog("catalog");
 expect(Object.keys(graphClaims).sort()).toEqual(catalog.items.filter(i=>i.layer.primary==="graph").map(i=>i.id).sort());
 const material={path:"evidence.md",text:"Reviewed project evidence",sha256:sha256("Reviewed project evidence")};
 for(const [check,claims] of Object.entries(graphClaims)) {
  expect(claims.length).toBeGreaterThan(0);
  const p=emptyPolicy(),s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,materials:[material],
   include:["."],exclude:[],limits:[],diagnostics:[]},p);
  for(const claim of claims)expect(resolveClaim(check,claim,{},s,p,"2026-11-04").status).toBe("unknown");
  p.attestations=[{check,claims,answer:"The cited material was reviewed against every named catalog requirement.",
   materials:[{path:material.path,sha256:material.sha256,lines:"1-1",quote:material.text}],scope:{},attested_by:"ray",
   attested_at:"2026-11-01",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}}];
  for(const claim of claims) {
   expect(resolveClaim(check,claim,{},s,p,"2026-11-04").status).toBe("holds");
   expect(resolveClaim(check,claim,{},s,p,"2027-01-01").status).toBe("unknown");
  }
 }
});
