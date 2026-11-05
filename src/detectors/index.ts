import type { ScanData,Policy,Observation,Fact } from "../models";
import type { Catalog } from "../catalog/types";
import { observe,signal } from "../adapters/common";
import { entrypointObservations,detectedEntrypoints } from "./entrypoints";
import { ciObservations } from "./ci";
import { documentObservations } from "./documents";
import { configurationObservations } from "./configuration";
import { canonical } from "../canonical";
const supported=new Set(["analysis.config@1","ci-config-found@1","ci.failure-consequence@1","ci.step-invokes-entrypoint@1",
 "context-size-reported@1","documents.local-links@1","environment.declarations@1","evaluation.model-gate@1",
 "hooks.invokes-entrypoint@1","instruction-file-found@1","instructions.import-topology@1","instructions.precedence-model@1",
 "instructions.verify-entrypoint@1","loop.stop-gate.command@1","loop.stop-gate.model@1","loop.stop-hook-active-checked@1",
 "manifest.verify-entrypoint@1","permissions.declarations@1","policy.verify-entrypoint@1","security.config-signals@1"]);
export function runDetectors(s:ScanData,p:Policy,c:Catalog):Observation[] {
 const out=[...s.adapters.flatMap(a=>a.observations),...entrypointObservations(s,p),
 ...ciObservations(s,p),...documentObservations(s),...configurationObservations(s)];
 for(const a of s.adapters) for(const o of a.observations) for(const f of o.facts) {
  if(!f.claim.startsWith("hook:")) continue;
  let body:{type?:string;value?:string};try{body=JSON.parse(f.basis);}catch{continue;}
  const claudeStop=a.name==="claude-code"&&f.claim==="hook:Stop";
  const recognizedStop=claudeStop||a.name==="copilot"&&f.claim==="hook:agentStop";
  if(body.type!=="command") {
   if(claudeStop) out.push({...o,detector:"loop.stop-gate.model@1",facts:[signal("loop","stop_model_gate",f.basis,o.scope)],
    limits:[...o.limits,"Model independence and gate effectiveness unobserved"]});
   continue;
  }
  if(recognizedStop) for(const e of detectedEntrypoints(s).filter(e=>e.command===body.value)) {
   const fact:Fact={subject:"harness.verification-wiring",claim:"trigger",status:"holds",
    scope:o.scope,basis:"Literal hook event "+f.claim.slice(5),complete:true};
   const refs=observe(o.detector,s.materials.filter(m=>m.path===e.document||m.path===e.manifest)).evidence;
   out.push({...o,evidence:[...o.evidence,...refs],facts:[fact],limits:[...o.limits,"Input, evaluator and result delivery require separate evidence"]});
  }
  if(["hook:Stop","hook:agentStop"].includes(f.claim))
   out.push({...o,detector:"loop.stop-gate.command@1",facts:[signal("loop","stop_event",f.basis,o.scope)]});
  if(claudeStop&&body.value?.includes("stop_hook_active"))
   out.push({...o,detector:"loop.stop-hook-active-checked@1",facts:[signal("loop","stop_hook_active","literal occurrence in hook command",o.scope)],
    limits:[...o.limits,"Literal occurrence only; referenced scripts are not read; a read does not decide blocking or budget"]});
 }
 const ids=new Set(out.map(o=>o.detector));
 for(const d of c.detectors) if(!ids.has(d.id))
  out.push(supported.has(d.id)
   ?observe(d.id,[],{},[],["No supported observation produced; input absent, outside the supported grammar, for an unselected CLI, or unreadable"])
   :observe(d.id,[],{},[],["No supported input for this detector"],["detector_unsupported: "+d.id]));
 return out.sort((a,b)=>canonical(a).localeCompare(canonical(b)));
}
