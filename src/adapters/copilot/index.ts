import type { Material,AdapterResult } from "../../models";
import { adapterBase,observe,parseConfig,signal } from "../common";
import { canonical } from "../../canonical";
export function copilot(materials:Material[]):AdapterResult {
 const r=adapterBase("copilot",["https://github.com/github/copilot-cli/blob/main/_auto%64ocs/configuration.md","https://docs.github.com/en/copilot/reference/hooks-reference"]);
 const scope={cli:"copilot"};
 const instructions=materials.filter(m=>/(^|\/)AGENTS\.md$/.test(m.path)||m.path===".github/copilot-instructions.md"||/^\.github\/instructions\/.+\.instructions\.md$/.test(m.path));
 const hooks=materials.filter(m=>/^\.github\/hooks\/[^/]+\.json$/.test(m.path));
 for(const m of instructions) r.observations.push(observe("instruction-file-found@1",[m],scope,
 [signal("context.instruction-authority","authority",m.path,scope)],["Custom agent opt-in, precedence and runtime loading unknown"]));
 for(const m of hooks) {
  const {data,diagnostics}=parseConfig(m,"json");
  if(data.version!==1) diagnostics.push("hook_version_unsupported");
  else if(data.hooks && typeof data.hooks==="object" && !Array.isArray(data.hooks)) {
   for(const [event,entries] of Object.entries(data.hooks)) {
    if(!Array.isArray(entries)){diagnostics.push("hook_shape: "+event);continue;}
    for(const h of entries) {
     if(!h || h.type!=="command" || Object.keys(h).some(k=>!["type","bash","command","timeoutSec"].includes(k)) ||
       typeof (h.bash??h.command)!=="string"){diagnostics.push("hook_unsupported: "+event);continue;}
     r.observations.push(observe("hooks.invokes-entrypoint@1",[m],scope,
      [signal("adapter:copilot","hook:"+event,canonical({type:"command",value:h.bash??h.command}),scope)],
      ["Shell text is data; loading, trust, invocation and outcome unobserved"]));
    }
   }
  } else diagnostics.push("hook_shape");
  if(diagnostics.length) r.observations.push(observe("hooks.invokes-entrypoint@1",[m],scope,[],[],diagnostics));
 }
 r.surfaces=[
 {surface:"instructions",support:"supported",reason:"Candidate files only",paths:instructions.map(m=>m.path)},
 {surface:"skills",support:"supported",reason:"Structure only",paths:materials.filter(m=>/^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(m.path)).map(m=>m.path)},
 {surface:"hooks",support:"supported",reason:"Version 1 literal command handlers only",paths:hooks.map(m=>m.path)},
 {surface:"permissions",support:"unknown",reason:"Effective permissions are not inferred from repository files",paths:[]},
 {surface:"runtime",support:"unknown",reason:"No CLI session or external policy observation",paths:[]}];
 return r;
}
