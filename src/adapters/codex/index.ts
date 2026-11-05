import type { Material,AdapterResult } from "../../models";
import { adapterBase,observe,parseConfig,signal } from "../common";
import { canonical } from "../../canonical";
export function codex(materials:Material[]):AdapterResult {
 const r=adapterBase("codex",["https://learn.chatgpt.com/docs/agent-configuration/agents-md","https://learn.chatgpt.com/docs/config-file/config-basic"]);
 const scope={cli:"codex"}, candidates=materials.filter(m=>/(^|\/)AGENTS(?:\.override)?\.md$/.test(m.path));
 const dirs=[...new Set(candidates.map(m=>m.path.slice(0,m.path.lastIndexOf("/")+1)))].sort();
 for(const dir of dirs) {
  const winner=["AGENTS.override.md","AGENTS.md"].map(n=>candidates.find(m=>m.path===dir+n && m.text.trim())).find(Boolean);
  if(winner) r.observations.push(observe("instructions.precedence-model@1",[winner],scope,
   [signal("context.instruction-authority","authority",dir+" local winner: "+winner.path,scope)],
   ["Candidate directory precedence; effective cwd, fallback names, global guidance and trust unobserved"]));
 }
 const settings=materials.filter(m=>/(^|\/)\.codex\/config\.toml$/.test(m.path));
 for(const m of settings) {
  const {data,diagnostics}=parseConfig(m,"toml");
  for(const k of Object.keys(data)) if(!["approval_policy","sandbox_mode","sandbox_workspace_write"].includes(k))
   diagnostics.push("config_key_unsupported: "+k);
  const facts=["approval_policy","sandbox_mode","sandbox_workspace_write"].filter(k=>k in data)
   .map(k=>signal("adapter:codex",k,canonical(data[k]),scope));
  r.observations.push(observe("permissions.declarations@1",[m],scope,facts,
   ["Project configuration requires trust; CLI flags, user and organization overrides unknown"],diagnostics));
 }
 r.surfaces=[
 {surface:"instructions",support:"supported",reason:"Per-directory candidate order only",paths:candidates.map(m=>m.path)},
 {surface:"skills",support:"supported",reason:"Structure only",paths:materials.filter(m=>/(^|\/)\.agents\/skills\/[^/]+\/SKILL\.md$/.test(m.path)).map(m=>m.path)},
 {surface:"permissions",support:"supported",reason:"Named TOML declarations only",paths:settings.map(m=>m.path)},
 {surface:"hooks",support:"unsupported",reason:"No verified bounded hook parser in adapter 1.0.0",paths:[]},
 {surface:"runtime",support:"unknown",reason:"Trust, loading and enforcement are unobserved",paths:[]}];
 return r;
}
