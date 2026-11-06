import { test,expect } from "bun:test";
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("a narrower scope only holds the items it is about",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const step={workflow:".gitlab-ci.yml",boundary:"test/0",evaluator:"command"};
 s.observations=[{detector:"ci.step-invokes-entrypoint@1",version:1,scope:step,evidence:[],limits:[],diagnostics:[],
  facts:[{subject:"foundation.ci-verification",claim:"invocation",status:"unknown",scope:step,basis:"bun test",complete:false}]}];
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 expect(r.items.filter(i=>Object.keys(i.scope).length===0)).toHaveLength(c.items.length);
 expect(r.items.filter(i=>Object.keys(i.scope).length).map(i=>i.id)).toEqual(["foundation.ci-verification"]);
 expect(r.layers.filter(l=>Object.keys(l.scope).length).map(l=>l.layer)).toEqual(["foundation"]);
});
