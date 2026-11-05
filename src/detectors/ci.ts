import type { ScanData,Policy,Observation,Fact } from "../models";
import { observe,parseConfig,signal } from "../adapters/common";
import { detectedEntrypoints } from "./entrypoints";
export function ciObservations(s:ScanData,_p:Policy):Observation[] {
 const out:Observation[]=[],entries=detectedEntrypoints(s);
 for(const m of s.materials.filter(m=>/^\.github\/workflows\/[^/]+\.ya?ml$/.test(m.path))) {
  const parsed=parseConfig(m,"yaml");
  out.push(observe("ci-config-found@1",[m],{},[signal("ci","configuration",m.path)],
   ["Configuration does not establish an agent loop"],parsed.diagnostics));
  const jobs=parsed.data.jobs;
  if(!jobs||typeof jobs!=="object")continue;
  for(const [name,raw] of Object.entries(jobs)) {
   if(!raw||typeof raw!=="object")continue;
   const job=raw as Record<string,unknown>;if(!Array.isArray(job.steps))continue;
   for(const [index,rawStep] of job.steps.entries()) {
    if(!rawStep||typeof rawStep!=="object")continue;
    const step=rawStep as Record<string,unknown>,scope={workflow:m.path,boundary:name+"/"+index,evaluator:"command"};
    const command=typeof step.run==="string"?step.run.trim():null;
    const entry=entries.find(e=>e.command===command);
    const literal=!!command&&!/[\n\r;&|$<>`]/.test(command)&&!step.uses;
    const status:Fact["status"]=literal&&entry?"holds":"unknown";
    const a=step["continue-on-error"],b=job["continue-on-error"];
    const consequence=a===true||b===true?"advisory":(a===undefined||a===false)&&(b===undefined||b===false)?"blocking":"unknown";
    out.push(observe("ci.step-invokes-entrypoint@1",[m,...s.materials.filter(x=>x.path===entry?.document)],scope,
     [{subject:"foundation.ci-verification",claim:"invocation",status,scope,basis:command??"Unrecognized step",complete:status==="holds"}],
     ["Exact declared invocation only; execution and remote gating unobserved"]));
    out.push(observe("ci.failure-consequence@1",[m],scope,[signal("foundation.ci-verification","consequence",consequence,scope)],
     ["Configured failure consequence only"]));
   }
  }
 }
 return out;
}
