import { test, expect } from "bun:test";
import { buildPlan,parsePlan } from "../../src/plan";
import { buildReport } from "../../src/report";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
import { loadCatalog } from "../../src/catalog/load";
test("new project plan asks before guessing and binds its exact content",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const report=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const plan=buildPlan(report,[],c);
 expect(plan.actions).toHaveLength(3);
 expect(plan.actions.every(a=>a.kind==="ask"&&a.target_path===null)).toBe(true);
 expect(plan.actions.every(a=>a.needs_approval&&a.fix_conditions.max_fixes===0)).toBe(true);
 expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
 const changed=structuredClone(plan);changed.actions[0]!.actions.push("Changed");
 expect(()=>parsePlan(JSON.stringify(changed))).toThrow("plan_fingerprint");
 expect(()=>buildPlan(report,["absent"],c)).toThrow("unknown_target");
});
