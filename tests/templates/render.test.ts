import { test, expect } from "bun:test";
import { templateDefinitions,renderTemplate } from "../../src/plan/templates";
import { loadCatalog } from "../../src/catalog/load";
test("missing values and unresolved placeholders cannot produce a usable render",async()=>{
 const t=templateDefinitions.find(t=>t.id==="task-contract")!;
 expect(()=>renderTemplate(t,{goal:"Fix login"})).toThrow("template_input");
 const body=renderTemplate(t,{goal:"Fix login",scope:"Login view",constraints:"API unchanged",acceptance:"Show the specified error"});
 expect(body).toContain("Goal: Fix login");
 expect(body).not.toContain("{{");
 expect(()=>renderTemplate(t,{goal:"{{x}}",scope:"a",constraints:"b",acceptance:"c"})).toThrow("template_unresolved");
 const c=await loadCatalog("catalog");
 expect(c.templates).toHaveLength(6);
 for(const t of templateDefinitions) expect(await Bun.file(t.path).text()).toBe(t.body);
});
