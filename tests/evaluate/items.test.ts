import { test, expect } from "bun:test";
import { evaluateItems } from "../../src/evaluate/items";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("unknown applicability, partial, and complete negative stay distinct",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 expect(evaluateItems(c,s,p,[],"2026-11-04").find(i=>i.id==="prompt.task-spec")!.result).toBe("unknown");
 p.applicability["prompt.task-spec"]={status:"applicable"};p.targets["prompt.task-spec"]={baseline:true};
 s.observations=[{detector:"fixture",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[
 {subject:"prompt.task-spec",claim:"goal",status:"holds",scope:{},basis:"test declaration",complete:true}]}];
 expect(evaluateItems(c,s,p,[],"2026-11-04").find(i=>i.id==="prompt.task-spec")!.result).toBe("partial");
 s.observations[0]!.facts=["goal","scope","constraints","acceptance"].map(claim=>({subject:"prompt.task-spec",claim,status:"fails",scope:{},basis:"Complete negative evidence",complete:true}));
 expect(evaluateItems(c,s,p,[],"2026-11-04").find(i=>i.id==="prompt.task-spec")!.result).toBe("missing");
});
test("a complete scoped negative with no positive subclaim is missing",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();p.applicability["prompt.task-spec"]={status:"applicable"};
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[{detector:"fixture",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[
 {subject:"prompt.task-spec",claim:"goal",status:"fails",scope:{},basis:"Complete scoped negative",complete:true}]}];
 expect(evaluateItems(c,s,p,[],"2026-11-04").find(i=>i.id==="prompt.task-spec")!.result).toBe("missing");
});
test("an item lists only observations from its own detectors or about itself",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[
  {detector:"ci-config-found@1",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[]},
  {detector:"unrelated@1",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[]},
  {detector:"fixture",version:1,scope:{},evidence:[],limits:[],diagnostics:[],facts:[
   {subject:"foundation.ci-verification",claim:"invocation",status:"holds",scope:{},basis:"test declaration",complete:true}]}];
 const items=evaluateItems(c,s,p,[],"2026-11-04");
 expect(items.find(i=>i.id==="foundation.ci-verification")!.observations.map(o=>o.detector)).toEqual(["ci-config-found@1","fixture"]);
 expect(items.find(i=>i.id==="prompt.task-spec")!.observations).toEqual([]);
});
