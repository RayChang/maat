import { test, expect } from "bun:test";
import { buildReport, renderReport, parseReport } from "../../src/report";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
import { loadCatalog } from "../../src/catalog/load";
test("report order, separate evidence, and unapproved policy",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p,
 [{name:"codex",adapter_version:"1.0.0",verified_cli_range:">=0",checked_at:"2026-11-04",sources:["https://example.test/doc"],surfaces:[{surface:"runtime",support:"unknown",reason:"r",paths:["p"]}],observations:[]}]);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z",null,true);
 const md=renderReport(r);
 const labels=["## Summary","## Layer findings","## Item details","## Protection observations","## Scope and limits","## Versions"];
 expect(labels.map(x=>md.indexOf(x))).toEqual(labels.map(x=>md.indexOf(x)).sort((a,b)=>a-b));
 expect(md).toContain("Machine observations | Agent assessments | User attestations");
 expect(r.layers.every(x=>!x.authoritative)).toBe(true);
 expect(r.diagnostics).toContain("catalog_overridden");
 expect(parseReport(JSON.stringify(r))).toEqual(r);
 expect(Object.keys(r)).not.toContain("score");
 expect(Object.keys(r.adapters[0]!)).not.toContain("sources");expect(Object.keys(r.adapters[0]!)).not.toContain("observations");
});
