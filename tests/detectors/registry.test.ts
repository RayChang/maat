import { test, expect } from "bun:test";
import { runDetectors } from "../../src/detectors";
import { loadCatalog } from "../../src/catalog/load";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
import { codex } from "../../src/adapters/codex";
const empty={root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[]};
const quiet="No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable";
test("every registry entry is represented and same inputs are stable",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeScan({...empty,materials:[]},p);
 const a=runDetectors(s,p,c),b=runDetectors(s,p,c);
 expect(a).toEqual(b);
 expect([...new Set(a.map(o=>o.detector))].sort()).toEqual(c.detectors.map(d=>d.id).sort());
 expect(a.flatMap(o=>o.facts).every(f=>f.status!=="holds")).toBe(true);
});
test("only detectors without a producer are reported unsupported",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const o=runDetectors(makeScan({...empty,materials:[]},p),p,c);
 const flagged=[...new Set(o.flatMap(x=>x.diagnostics).filter(d=>d.startsWith("detector_unsupported: ")).map(d=>d.slice(22)))].sort();
 expect(flagged).toEqual([
  "instructions.scoping@1",
  "loop.bounds@1",
  "loop.routing-declared@1",
  "loop.self-declared@1",
  "loop.stop-gate.model@1",
  "loop.stop-hook-active-checked@1",
  "loop.trigger@1",
  "policy.human-evaluation@1",
  "recovery.local-plan@1",
  "tests.structure@1"]);
 expect(o.filter(x=>x.detector==="analysis.config@1")).toEqual([{detector:"analysis.config@1",version:1,scope:{},
  evidence:[],facts:[],limits:[quiet],diagnostics:[]}]);
});
test("a Codex-only AGENTS.md leaves instruction-file-found unobserved, not absent",async()=>{
 const p=emptyPolicy(),c=await loadCatalog("catalog"),text="Use bun.\n";
 const materials=[{path:"AGENTS.md",text,sha256:sha256(text)}];
 const o=runDetectors(makeScan({...empty,materials},p,[codex(materials)]),p,c);
 expect(o.filter(x=>x.detector==="instruction-file-found@1").map(x=>[x.limits,x.diagnostics])).toEqual([[[quiet],[]]]);
 expect(o.filter(x=>x.detector==="instructions.precedence-model@1").map(x=>x.facts.length)).toEqual([1]);
});
