import type { ScanData,Observation,Fact,Entrypoint,Policy } from "../models";
import { observe,parseConfig,signal } from "../adapters/common";
export function detectedEntrypoints(s:ScanData):Entrypoint[] {
 const out:Entrypoint[]=[];
 for(const m of s.materials.filter(m=>m.path.endsWith(".md"))) {
  const command=/^Verification command: (.+)$/m.exec(m.text)?.[1]?.trim();
  const purpose=/^Verification purpose: (.+)$/m.exec(m.text)?.[1]?.trim();
  if(!command||!purpose)continue;
  const script=/^(?:bun|npm) run ([a-zA-Z0-9:_-]+)$/.exec(command)?.[1];
  out.push({name:script??command,command,purpose,scope:{},document:m.path,
   ...(script?{manifest:"package.json",script}:{})});
 }
 return out;
}
export function entrypointObservations(s:ScanData,_p:Policy):Observation[] {
 const out:Observation[]=[];
 for(const m of s.materials.filter(x=>/(^|\/)package\.json$/.test(x.path))) {
  const parsed=parseConfig(m,"json"),scripts=parsed.data.scripts;
  const facts=scripts&&typeof scripts==="object"?Object.entries(scripts).filter(([,v])=>typeof v==="string")
   .map(([k,v])=>signal("manifest",k,String(v))):[];
  out.push(observe("manifest.verify-entrypoint@1",[m],{},facts,["Script names do not establish purpose"],parsed.diagnostics));
 }
 for(const e of detectedEntrypoints(s)) {
  const doc=s.materials.find(m=>m.path===e.document)!,manifest=s.materials.find(m=>m.path===e.manifest);
  let invocation:Fact["status"]="holds";
  if(e.script) {
   if(!manifest)invocation="unknown";
   else {
    const parsed=parseConfig(manifest,"json"),scripts=parsed.data.scripts as Record<string,unknown>|undefined;
    invocation=parsed.diagnostics.length?"unknown":typeof scripts?.[e.script]==="string"?"holds":s.scope.complete?"fails":"unknown";
   }
  }
  const refs=manifest?[doc,manifest]:[doc];
  const facts:Fact[]=[{subject:"verify.entrypoint-declared@1",claim:"name",status:"holds",scope:e.scope,basis:e.name,complete:true},
   {subject:"verify.entrypoint-declared@1",claim:"invocation",status:invocation,scope:e.scope,basis:e.command,complete:invocation!=="unknown"},
   {subject:"verify.entrypoint-declared@1",claim:"purpose",status:"holds",scope:e.scope,basis:e.purpose,complete:true}];
  out.push(observe("policy.verify-entrypoint@1",refs,e.scope,facts,["Explicit document declaration; never executed"]));
  out.push(observe("instructions.verify-entrypoint@1",refs,e.scope,["invocation","purpose","correspondence"].map(claim=>({
   subject:"verify.entrypoint-documented@1",claim,status:claim==="correspondence"?invocation:"holds",
   scope:e.scope,basis:claim==="purpose"?e.purpose:e.command,complete:invocation!=="unknown"})),
   ["Declared correspondence only; runtime reading unobserved"]));
 }
 return out;
}
