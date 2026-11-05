import type { Material, Fact, Scope, Observation, AdapterResult } from "../models";
export function observe(detector:string,materials:Material[],scope:Scope={},facts:Fact[]=[],limits:string[]=[],diagnostics:string[]=[]):Observation {
 return {detector,version:1,scope,evidence:materials.map(m=>({path:m.path,sha256:m.sha256,
 lines:"1-"+m.text.split("\n").length})),facts,limits,diagnostics};
}
export function signal(subject:string,claim:string,basis:string,scope:Scope={}):Fact {
 return {subject,claim,status:"unknown",scope,basis,complete:false,signal:true};
}
export function parseConfig(m:Material,format:"json"|"toml"|"yaml"):{data:Record<string,unknown>;diagnostics:string[]} {
 try {
  const data:unknown=format==="json"?JSON.parse(m.text):format==="toml"?Bun.TOML.parse(m.text):Bun.YAML.parse(m.text);
  if(!data || typeof data!=="object" || Array.isArray(data)) throw Error();
  return {data:data as Record<string,unknown>,diagnostics:[]};
 }catch{return {data:{},diagnostics:["parse_error: "+m.path]};}
}
export function adapterBase(name:string,sources:string[]):AdapterResult {
 return {name,adapter_version:"1.0.0",verified_cli_range:"unverified",checked_at:"2026-11-04",sources,
 surfaces:[],observations:[]};
}
