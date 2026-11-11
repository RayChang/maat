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
 const projects=new Map<string,string>(),shared=new Set<string>();
 for(const m of s.materials.filter(x=>/(^|\/)project\.json$/.test(x.path))) {
  const name=parseConfig(m,"json").data.name;
  if(typeof name==="string"){if(projects.has(name))shared.add(name);projects.set(name,m.path);}
 }
 for(const m of s.materials.filter(x=>/(^|\/)(AGENTS|CLAUDE)\.md$/.test(x.path))) {
  const lines=m.text.split("\n");
  let open=false;const fenced=lines.map(l=>{const edge=/^\s*(```|~~~)/.test(l),inside=open||edge;if(edge)open=!open;return inside;});
  for(let i=0;i<lines.length;i++) {
   if(!/^\|\s*Target\s*\|[^|]+\|\s*$/.test(lines[i]!)||!/^\|[-\s|:]+\|\s*$/.test(lines[i+1]??""))continue;
   let j=i-1;while(j>=0&&!(lines[j]!.startsWith("#")&&!fenced[j]))j--;
   const templates=[...lines.slice(j+1,i).join("\n").matchAll(/`((?:bun |npx |pnpm |yarn )?nx run ([A-Za-z0-9_.@\/-]+):<target>)`/g)];
   if(templates.length!==1)continue;
   const [,template,project]=templates[0]!,manifest=shared.has(project!)?undefined:projects.get(project!);
   for(let k=i+2;k<lines.length&&lines[k]!.startsWith("|");k++) {
    const row=/^\|\s*`([A-Za-z0-9:_.-]+)`\s*\|([^|]+)\|\s*$/.exec(lines[k]!);
    if(!row||!row[2]!.trim())continue;
    out.push({name:project+":"+row[1],command:template!.replace("<target>",row[1]!),purpose:row[2]!.trim(),scope:{},document:m.path,
     target:row[1]!,...(manifest?{manifest}:{})});
   }
  }
  for(let i=0;i<lines.length;i++) {
   if(!/^\|\s*Task\s*\|\s*Command\s*\|\s*$/i.test(lines[i]!)||!/^\|[-\s|:]+\|\s*$/.test(lines[i+1]??""))continue;
   for(let k=i+2;k<lines.length&&lines[k]!.startsWith("|");k++) {
    const row=/^\|([^|]+)\|([^|]+)\|\s*$/.exec(lines[k]!),purpose=row?.[1]!.trim(),command=/`([^`]+)`/.exec(row?.[2]??"")?.[1]?.trim();
    if(!purpose||!command||!/\b(test|lint|typecheck|type check|build|verify|check)\b/i.test(purpose))continue;
    const script=/^(?:bun|npm|pnpm|yarn) run ([a-zA-Z0-9:_-]+)$/.exec(command)?.[1];
    out.push({name:script??command,command,purpose,scope:{},document:m.path,...(script?{manifest:"package.json",script}:{})});
   }
  }
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
  else if(e.target) {
   const targets=manifest?parseConfig(manifest,"json").data.targets as Record<string,unknown>|undefined:undefined;
   invocation=targets&&typeof targets==="object"&&Object.hasOwn(targets,e.target)?"holds":"unknown";
  }
  const refs=manifest?[doc,manifest]:[doc];
  const facts:Fact[]=[{subject:"verify.entrypoint-declared@1",claim:"name",status:"holds",scope:e.scope,basis:e.name,complete:true},
   {subject:"verify.entrypoint-declared@1",claim:"invocation",status:invocation,scope:e.scope,basis:e.command,complete:invocation!=="unknown"},
   {subject:"verify.entrypoint-declared@1",claim:"purpose",status:"holds",scope:e.scope,basis:e.purpose,complete:true}];
  out.push(observe("policy.verify-entrypoint@1",refs,e.scope,facts,["Explicit document declaration; never executed",
   ...(e.target&&!manifest?["No unique project.json declares this Nx project; target not checked"]:[])]));
  out.push(observe("instructions.verify-entrypoint@1",refs,e.scope,["invocation","purpose","correspondence"].map(claim=>({
   subject:"verify.entrypoint-documented@1",claim,status:claim==="correspondence"?invocation:"holds",
   scope:e.scope,basis:claim==="purpose"?e.purpose:e.command,complete:invocation!=="unknown"})),
   ["Declared correspondence only; runtime reading unobserved"]));
 }
 return out;
}
