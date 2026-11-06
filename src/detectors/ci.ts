import type { ScanData,Policy,Observation,Fact } from "../models";
import { observe,parseConfig,signal } from "../adapters/common";
import { detectedEntrypoints } from "./entrypoints";
type Consequence="blocking"|"advisory"|"unknown";
interface CiStep { boundary:string; command:string|null; remote:boolean; consequence:Consequence; }
const record=(v:unknown):Record<string,unknown>|null=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
function githubSteps(data:Record<string,unknown>):CiStep[] {
 const out:CiStep[]=[],jobs=record(data.jobs);
 if(!jobs)return out;
 for(const [name,raw] of Object.entries(jobs)) {
  const job=record(raw);if(!job||!Array.isArray(job.steps))continue;
  for(const [index,rawStep] of job.steps.entries()) {
   const step=record(rawStep);if(!step)continue;
   const a=step["continue-on-error"],b=job["continue-on-error"];
   out.push({boundary:name+"/"+index,command:typeof step.run==="string"?step.run.trim():null,remote:!!step.uses,
    consequence:a===true||b===true?"advisory":(a===undefined||a===false)&&(b===undefined||b===false)?"blocking":"unknown"});
  }
 }
 return out;
}
const gitlabGlobal=new Set(["default","include","stages","variables","workflow","spec","image","services","cache","before_script","after_script"]);
function gitlabSteps(data:Record<string,unknown>):CiStep[] {
 const out:CiStep[]=[];
 for(const [name,raw] of Object.entries(data)) {
  const job=record(raw);
  if(!job||name.startsWith(".")||gitlabGlobal.has(name))continue;
  const script:unknown[]=typeof job.script==="string"?[job.script]:Array.isArray(job.script)?job.script.flat():[];
  const allow=job.allow_failure;
  const consequence:Consequence=data.include!==undefined||job.rules!==undefined||job.extends!==undefined||(allow!==undefined&&typeof allow!=="boolean")?"unknown":
   allow===true||(allow===undefined&&job.when==="manual")?"advisory":"blocking";
  for(const [index,line] of script.entries())
   out.push({boundary:name+"/"+index,command:typeof line==="string"?line.trim():null,remote:false,consequence});
 }
 return out;
}
function bitbucketSteps(data:Record<string,unknown>):CiStep[] {
 const out:CiStep[]=[],pipelines=record(data.pipelines);
 if(!pipelines)return out;
 const strategy=(o:Record<string,unknown>|null)=>record(o?.["on-fail"])?.strategy;
 const walk=(items:unknown,path:string,inherited:unknown):void=>{
  if(!Array.isArray(items))return;
  for(const [index,raw] of items.entries()) {
   const item=record(raw);if(!item)continue;
   const here=path+"/"+index,step=record(item.step);
   if(step) {
    const s=strategy(step)??inherited;
    const consequence:Consequence=s===undefined||s==="fail"?"blocking":s==="ignore"?"advisory":"unknown";
    const script:unknown[]=Array.isArray(step.script)?step.script:[];
    for(const [n,line] of script.entries())
     out.push({boundary:here+"/"+n,command:typeof line==="string"?line.trim():null,remote:false,consequence});
    continue;
   }
   if(item.parallel!==undefined){const group=record(item.parallel);walk(Array.isArray(item.parallel)?item.parallel:group?.steps,here,strategy(group)??inherited);continue;}
   const stage=record(item.stage);
   if(stage)walk(stage.steps,here,strategy(stage)??inherited);
  }
 };
 for(const [kind,value] of Object.entries(pipelines)) {
  if(Array.isArray(value))walk(value,kind,undefined);
  else for(const [name,list] of Object.entries(record(value)??{}))walk(list,kind+"/"+name,undefined);
 }
 return out;
}
const providers:[RegExp,(data:Record<string,unknown>)=>CiStep[]][]=[
 [/^\.github\/workflows\/[^/]+\.ya?ml$/,githubSteps],[/^\.gitlab-ci\.yml$/,gitlabSteps],[/^bitbucket-pipelines\.yml$/,bitbucketSteps]];
export function ciObservations(s:ScanData,_p:Policy):Observation[] {
 const out:Observation[]=[],entries=detectedEntrypoints(s);
 for(const m of s.materials) {
  const provider=providers.find(([pattern])=>pattern.test(m.path));
  if(!provider)continue;
  const parsed=parseConfig(m,"yaml");
  out.push(observe("ci-config-found@1",[m],{},[signal("ci","configuration",m.path)],
   ["Configuration does not establish an agent loop"],parsed.diagnostics));
  for(const step of provider[1](parsed.data)) {
   const scope={workflow:m.path,boundary:step.boundary,evaluator:"command"};
   const entry=entries.find(e=>e.command===step.command);
   const literal=!!step.command&&!/[\n\r;&|$<>`]/.test(step.command)&&!step.remote;
   const status:Fact["status"]=literal&&entry?"holds":"unknown";
   out.push(observe("ci.step-invokes-entrypoint@1",[m,...s.materials.filter(x=>x.path===entry?.document)],scope,
    [{subject:"foundation.ci-verification",claim:"invocation",status,scope,basis:step.command??"Unrecognized step",complete:status==="holds"}],
    ["Exact declared invocation only; execution and remote gating unobserved"]));
   out.push(observe("ci.failure-consequence@1",[m],scope,[signal("foundation.ci-verification","consequence",step.consequence,scope)],
    ["Configured failure consequence only"]));
  }
 }
 return out;
}
