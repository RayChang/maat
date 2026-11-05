import { test, expect } from "bun:test";
import { runDetectors } from "../../src/detectors";
import { loadCatalog } from "../../src/catalog/load";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
import { claudeCode } from "../../src/adapters/claude-code";
import { copilot } from "../../src/adapters/copilot";
const doc="Verification command: bun test\nVerification purpose: regression\n";
const quiet="No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable";
async function run(pairs:[string,string][]) {
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const materials=pairs.map(([path,text])=>({path,text,sha256:sha256(text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},
  p,[claudeCode(materials),copilot(materials)]);
 return {o:runDetectors(s,p,c),hash:(path:string)=>materials.find(m=>m.path===path)!.sha256};
}
test("a literal command on a recognized Stop event that equals a declared entrypoint is a trigger with traceable evidence",async()=>{
 const declared="Verification command: bun run test\nVerification purpose: regression\n";
 const manifest=JSON.stringify({scripts:{test:"bun test"}});
 const settings=JSON.stringify({hooks:{Stop:[{hooks:[{type:"command",command:"bun run test"}]}]}});
 const copilotHooks=JSON.stringify({version:1,hooks:{agentStop:[{type:"command",bash:"bun run test"}]}});
 const {o,hash}=await run([["AGENTS.md",declared],["package.json",manifest],[".claude/settings.json",settings],[".github/hooks/check.json",copilotHooks]]);
 const wired=o.filter(x=>x.facts.some(f=>f.claim==="trigger"));
 const refs=(hook:string)=>[hook,"AGENTS.md","package.json"].map(path=>[path,hash(path)]);
 expect(wired.map(x=>[x.detector,x.scope,x.evidence.map(e=>[e.path,e.sha256])])).toEqual([
  ["hooks.invokes-entrypoint@1",{cli:"claude-code"},refs(".claude/settings.json")],
  ["hooks.invokes-entrypoint@1",{cli:"copilot"},refs(".github/hooks/check.json")]]);
 expect(wired[0]!.facts).toEqual([{subject:"harness.verification-wiring",claim:"trigger",status:"holds",scope:{cli:"claude-code"},
  basis:"Literal hook event Stop",complete:true}]);
 for(const hooks of [{DefinitelyNotAnEvent:[{hooks:[{type:"command",command:"bun run test"}]}]},
  {Stop:[{hooks:[{type:"command",command:"bun run test --watch"}]}]}])
  expect((await run([["AGENTS.md",declared],["package.json",manifest],[".claude/settings.json",JSON.stringify({hooks})]]))
   .o.some(x=>x.facts.some(f=>f.claim==="trigger"))).toBe(false);
});
test("Claude Stop hooks give a model-gate signal and a positive-only stop_hook_active signal",async()=>{
 const settings=JSON.stringify({hooks:{Stop:[{hooks:[{type:"command",command:"jq -e .stop_hook_active"},{type:"prompt",prompt:"Check the work"}]}]}});
 const copilotHooks=JSON.stringify({version:1,hooks:{agentStop:[{type:"command",bash:"echo stop_hook_active"}]}});
 const {o}=await run([[".claude/settings.json",settings],[".github/hooks/stop.json",copilotHooks]]);
 expect(o.filter(x=>x.detector==="loop.stop-gate.model@1").map(x=>[x.scope,x.facts])).toEqual([[{cli:"claude-code"},
  [{subject:"loop",claim:"stop_model_gate",status:"unknown",scope:{cli:"claude-code"},
   basis:'{"type":"prompt","value":"Check the work"}',complete:false,signal:true}]]]);
 const active=o.filter(x=>x.detector==="loop.stop-hook-active-checked@1");
 expect(active.map(x=>[x.scope,x.facts.map(f=>f.basis),x.diagnostics])).toEqual([[{cli:"claude-code"},["literal occurrence in hook command"],[]]]);
 expect(active[0]!.limits).toContain("Literal occurrence only; referenced scripts are not read; a read does not decide blocking or budget");
 const quietStop=JSON.stringify({hooks:{Stop:[{hooks:[{type:"command",command:"bash .claude/hooks/stop.sh"}]}]}});
 expect((await run([[".claude/settings.json",quietStop]])).o.filter(x=>x.detector==="loop.stop-hook-active-checked@1")
  .map(x=>[x.facts,x.limits,x.diagnostics])).toEqual([[[],[quiet],[]]]);
});
