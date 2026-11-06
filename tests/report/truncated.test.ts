import { test,expect } from "bun:test";
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("a scan cut short by the size budget is never authoritative",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const full=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 expect(buildReport(full,p,c,"2026-11-04T00:00:00Z").layers.every(l=>l.authoritative)).toBe(true);
 const cut=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:false,include:["."],exclude:[],limits:[],diagnostics:["scan_limit: package.json"],materials:[]},p);
 const r=buildReport(cut,p,c,"2026-11-04T00:00:00Z");
 expect(r.layers.some(l=>l.authoritative)).toBe(false);
 expect(r.diagnostics).toContain("scan_truncated");
});
