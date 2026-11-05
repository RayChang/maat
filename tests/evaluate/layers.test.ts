import { test, expect } from "bun:test";
import { evaluateLayers } from "../../src/evaluate/layers";
import { loadCatalog } from "../../src/catalog/load";
import { makeSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
test("unknown requirements block, unknown applicability stays pending, empty cannot adopt",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 p.applicability.loop={status:"applicable",reason:"Feedback workflow"};
 const layers=evaluateLayers(c,s,p,[],[],"2026-11-04",true);
 expect(layers.find(l=>l.layer==="loop")!.status).toBe("blocked");
 expect(layers.find(l=>l.layer==="graph")!.status).toBe("pending");
 p.applicability={foundation:{status:"applicable",reason:"Code project"}};
 expect(evaluateLayers(c,s,p,[],[],"2026-11-04",true).find(l=>l.layer==="foundation")!.status).toBe("ready");
});
