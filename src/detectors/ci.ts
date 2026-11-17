import type { ScanData,Policy,Observation,Fact,Material } from "../models";
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
  const script:unknown[]=typeof job.script==="string"?[job.script]:Array.isArray(job.script)?job.script:[];
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
// A step like `bash scripts/ci.sh` or `./scripts/ci.sh` runs a repository script; read that script one level deep.
function wrapper(s:ScanData,command:string):Material|undefined {
 const path=/^(?:(?:bash|sh)\s+(?:\.\/)?|\.\/)([A-Za-z0-9_.\/-]+\.sh)$/.exec(command)?.[1];
 return path?s.materials.find(m=>m.path===path):undefined;
}
// The declared command must start a script line, after optional shell keywords (if, then, do, exec, !).
// A heredoc or a function definition can hold lines that never run, so such a script does not count.
function invokes(text:string,command:string):boolean {
 if(text.includes("<<")||/^\s*(?:function\s+[A-Za-z_][\w-]*|[A-Za-z_][\w-]*\s*\(\s*\))/m.test(text))return false;
 const escaped=command.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const line=new RegExp("^(?:(?:if|then|else|elif|do|while|until|exec|!)\\s+)*"+escaped+"(?=$|[\\s;|&)])");
 return text.split("\n").some(l=>line.test(l.trim()));
}
export function ciObservations(s:ScanData,_p:Policy):Observation[] {
 const out:Observation[]=[],entries=detectedEntrypoints(s),ci:Material[]=[],matched=new Set<string>();
 for(const m of s.materials) {
  const provider=providers.find(([pattern])=>pattern.test(m.path));
  if(!provider)continue;
  ci.push(m);
  const parsed=parseConfig(m,"yaml");
  out.push(observe("ci-config-found@1",[m],{},[signal("ci","configuration",m.path)],
   ["Configuration does not establish an agent loop"],parsed.diagnostics));
  for(const step of provider[1](parsed.data)) {
   // evaluator "command" marks a CI step scope; countsFor() in src/canonical.ts counts it for the project scope {}.
   const scope={workflow:m.path,boundary:step.boundary,evaluator:"command"};
   const entry=entries.find(e=>e.command===step.command);
   const literal=!!step.command&&!/[\n\r;&|$<>`]/.test(step.command)&&!step.remote;
   const script=literal&&!entry?wrapper(s,step.command!):undefined;
   const invoked=entry?[entry]:script?entries.filter(e=>invokes(script.text,e.command)):[];
   const status:Fact["status"]=literal&&invoked.length?"holds":"unknown";
   if(status==="holds")for(const e of invoked)matched.add(e.command);
   out.push(observe("ci.step-invokes-entrypoint@1",[m,...(script?[script]:[]),...s.materials.filter(x=>invoked.some(e=>e.document===x.path))],scope,
    [{subject:"foundation.ci-verification",claim:"invocation",status,scope,
     basis:script&&invoked.length?step.command+" runs "+[...new Set(invoked.map(e=>e.command))].join(", "):step.command??"Unrecognized step",complete:status==="holds",signal:true}],
    ["Exact declared invocation only; execution and remote gating unobserved",
     ...(script?["Wrapper script read one level deep; a declared command counts only at the start of a script line"]:[])]));
   out.push(observe("ci.failure-consequence@1",[m],scope,[signal("foundation.ci-verification","consequence",step.consequence,scope)],
    ["Configured failure consequence only"]));
  }
 }
 if(ci.length) {
  const missing=entries.filter(e=>!matched.has(e.command)).map(e=>e.command);
  const status:Fact["status"]=entries.length&&!missing.length?"holds":"unknown";
  const basis=entries.length?"matched: "+([...matched].join(", ")||"none")+"; unmatched: "+(missing.join(", ")||"none"):"No declared verification entrypoint";
  out.push(observe("ci.step-invokes-entrypoint@1",[...ci,...s.materials.filter(x=>entries.some(e=>e.document===x.path))],{},
   [{subject:"foundation.ci-verification",claim:"invocation",status,scope:{},basis,complete:status==="holds"}],
   ["Every declared verification entrypoint needs a literal CI step; a partial match stays unknown"]));
 }
 return out;
}
