import { test, expect } from "bun:test";
import { allTruth, anyTruth, resolveClaim } from "../../src/evaluate/truth";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("all/any truth tables do not promote unknown",()=>{
 const values=["holds","fails","unknown"] as const;
 const all=[["holds","fails","unknown"],["fails","fails","fails"],["unknown","fails","unknown"]] as const;
 const any=[["holds","holds","holds"],["holds","fails","unknown"],["holds","unknown","unknown"]] as const;
 for(let i=0;i<3;i++)for(let j=0;j<3;j++) {
  expect(allTruth([values[i]!,values[j]!])).toBe(all[i]![j]!);
  expect(anyTruth([values[i]!,values[j]!])).toBe(any[i]![j]!);
 }
 expect(allTruth([])).toBe("unknown");expect(anyTruth([])).toBe("unknown");
 const p=emptyPolicy(),s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[{detector:"test",version:1,scope:{},evidence:[],limits:[],diagnostics:[],
 facts:[{subject:"x",claim:"a",status:"holds",scope:{},basis:"declaration",complete:true},
 {subject:"x",claim:"a",status:"fails",scope:{},basis:"contradiction",complete:true}]}];
 expect(resolveClaim("x","a",{},s,p,"2026-11-04").status).toBe("unknown");
 expect(resolveClaim("x","a",{workflow:"other"},s,p,"2026-11-04").status).toBe("unknown");
});
test("CLI-specific claims remain unknown until that CLI is selected",()=>{
 const p=emptyPolicy(),s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,
 include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p),scope={cli:"codex"};
 s.observations=[{detector:"fixture",version:1,scope,evidence:[],limits:[],diagnostics:[],facts:[
 {subject:"x",claim:"a",status:"holds",scope,basis:"Scoped declaration",complete:true}]}];
 expect(resolveClaim("x","a",scope,s,p,"2026-11-04").status).toBe("unknown");
 s.target_clis=["codex"];
 expect(resolveClaim("x","a",scope,s,p,"2026-11-04").status).toBe("holds");
});
