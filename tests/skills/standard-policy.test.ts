import { test, expect } from "bun:test";
import { parsePolicy } from "../../src/policy/load";
import { loadCatalog } from "../../src/catalog/load";
test("the standard policy requires exactly the foundation baseline items",async()=>{
 const c=await loadCatalog("catalog");
 const p=parsePolicy(await Bun.file("skills/maat-diagnose/standard-policy.yaml").text(),c.catalog_version);
 expect(p.catalog_version).toBe(c.catalog_version);
 expect(p.applicability).toEqual({foundation:{status:"applicable"}});
 const baseline=c.items.filter(i=>i.layer.primary==="foundation"&&i.baseline.proposed_tier==="baseline").map(i=>i.id).sort();
 expect(Object.keys(p.targets).sort()).toEqual(baseline);
 for(const id of baseline)expect(p.targets[id]).toEqual({baseline:true});
 expect(p.target_clis).toEqual([]);
 expect(p.scope.include).toEqual(["."]);
 for(const glob of p.scope.exclude)expect(glob).toMatch(/^\*\*\/\*\.[a-z0-9]+$/);
 expect(p.exemptions).toEqual([]);
 expect(p.attestations).toEqual([]);
});
