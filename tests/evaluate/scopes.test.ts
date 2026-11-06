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

test("attestation and loop scopes hold only their own items",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.applicability={loop:{status:"applicable",loops:[{id:"stop",kind:"execution-feedback",scope:".claude/hooks/stop.sh"}]}};
 p.attestations=[{check:"prompt.task-spec",claims:["goal"],answer:"draft",scope:{cli:"codex"}} as never];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 expect(r.items.filter(i=>i.scope.cli==="codex").map(i=>i.id)).toEqual(["prompt.task-spec"]);
 expect(r.items.filter(i=>i.scope.workflow===".claude/hooks/stop.sh").map(i=>i.id)).toEqual(c.items.filter(i=>i.layer.primary==="loop").map(i=>i.id));
});
test("an exemption scope holds its item, and an unobserved target CLI gets no scope",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.target_clis=["claude-code"];
 p.attestations=[{check:"foundation.verify-entrypoints",claims:["declared"],answer:"draft",scope:{cli:"codex"}} as never];
 p.exemptions=[{check:"prompt.task-spec",reason:"owner decision",owner:"ray",expires_at:"2027-01-01T00:00:00Z",fingerprints:[{path:"AGENTS.md",sha256:"0".repeat(64)}],scope:{cli:"codex"}}];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 expect(r.items.filter(i=>i.scope.cli==="codex").map(i=>i.id)).toEqual(["foundation.verify-entrypoints","prompt.task-spec"]);
 expect(r.items.find(i=>i.id==="prompt.task-spec"&&i.scope.cli==="codex")!.diagnostics).toContain("exemption_recorded_separately");
 expect(r.items.some(i=>i.scope.cli==="claude-code")).toBe(false);
});
