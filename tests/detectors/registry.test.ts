import { test, expect } from "bun:test";
import { runDetectors } from "../../src/detectors";
import { loadCatalog } from "../../src/catalog/load";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
test("every registry entry is represented and same inputs are stable",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const a=runDetectors(s,p,c),b=runDetectors(s,p,c);
 expect(a).toEqual(b);
 expect([...new Set(a.map(o=>o.detector))].sort()).toEqual(c.detectors.map(d=>d.id).sort());
 expect(a.flatMap(o=>o.facts).every(f=>f.status!=="holds")).toBe(true);
});
