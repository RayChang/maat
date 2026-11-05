import type { Material, AdapterResult } from "../../models";
import { observe,parseConfig,adapterBase,signal } from "../common";
import { canonical } from "../../canonical";
export function claudeCode(materials:Material[]):AdapterResult {
 const r=adapterBase("claude-code",["https://code.claude.com/docs/en/hooks","https://github.com/anthropics/claude-code/tree/main/examples/settings"]);
 const scope={cli:"claude-code"};
 const groups:Record<string,Material[]>={
 instructions:materials.filter(m=>/(^|\/)CLAUDE\.md$/.test(m.path)),
 skills:materials.filter(m=>/(^|\/)\.claude\/skills\/[^/]+\/SKILL\.md$/.test(m.path)),
 hooks:materials.filter(m=>/(^|\/)\.claude\/settings(?:\.local)?\.json$/.test(m.path)),
 permissions:materials.filter(m=>/(^|\/)\.claude\/settings(?:\.local)?\.json$/.test(m.path))};
 for(const [surface,files] of Object.entries(groups)) r.surfaces.push({
 surface,support:"supported",paths:files.map(m=>m.path),
 reason:"Repository grammar only; local settings may override project settings; user and managed settings unobserved."});
 for(const m of groups.instructions!) r.observations.push(observe("instruction-file-found@1",[m],scope,
 [signal("context.instruction-authority","authority",m.path,scope)],["Runtime loading and conflicts unknown"]));
 for(const m of groups.hooks!) {
  const {data,diagnostics}=parseConfig(m,"json");
  const hooks=data.hooks;
  if(hooks && typeof hooks==="object" && !Array.isArray(hooks)) {
   for(const [event,entries] of Object.entries(hooks)) {
    if(!Array.isArray(entries)){diagnostics.push("hook_shape: "+event);continue;}
    for(const group of entries) {
     if(!group || !Array.isArray(group.hooks)){diagnostics.push("hook_shape: "+event);continue;}
     for(const h of group.hooks) {
      if(!h || !["command","prompt","agent"].includes(h.type)) {diagnostics.push("hook_unsupported: "+event);continue;}
      const value=h.type==="command"?h.command:h.prompt;
      if(typeof value!=="string" || Object.keys(h).some(k=>!["type","command","prompt","timeout"].includes(k)))
       {diagnostics.push("hook_dynamic: "+event);continue;}
      r.observations.push(observe(h.type==="command"?"hooks.invokes-entrypoint@1":"evaluation.model-gate@1",
       [m],scope,[signal("adapter:claude-code","hook:"+event,canonical({type:h.type,value}),scope)],
       ["Trust, actual trigger, result delivery and effectiveness unobserved"]));
     }
    }
   }
  }
  const p=data.permissions;
  if(p && typeof p==="object" && !Array.isArray(p)) for(const key of ["allow","deny","ask"]) {
   const rules=(p as Record<string,unknown>)[key];
   if(Array.isArray(rules) && rules.every(x=>typeof x==="string"))
    r.observations.push(observe("permissions.declarations@1",[m],scope,
     [signal("adapter:claude-code",key,canonical(rules),scope)],["Declared rule strings; enforcement unknown"]));
   else if(rules!==undefined) diagnostics.push("permission_shape: "+key);
  }
  if(diagnostics.length) r.observations.push(observe("permissions.declarations@1",[m],scope,[],[],diagnostics));
 }
 r.surfaces.push({surface:"runtime",support:"unknown",paths:[],reason:"No CLI launch, trust probe, user settings, or organization policy read."});
 return r;
}
