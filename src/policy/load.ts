import { readFile } from "node:fs/promises";
import { MaatError } from "../errors";
import { checkShape, type Shape } from "../schema";
import type { Policy } from "../models";
const str:Shape={type:"string"}, strings:Shape={type:"array",items:str};
const object:Shape={type:"object"};
const scope:Shape={type:"object",additionalProperties:false,properties:Object.fromEntries(
 ["cli","workflow","boundary","artifact","evaluator","effect"].map(k=>[k,str]))};
const fp:Shape={type:"object",required:["path","sha256"],properties:{path:{type:"string",minLength:1},sha256:{type:"string",pattern:"^[0-9a-f]{64}$"}}};
const decision:Shape={type:"object",required:["status"],properties:{
 status:{enum:["applicable","not_applicable","unknown"]},reason:str,owner:str,expires_at:str,
 loops:{type:"array",items:{type:"object",required:["id","kind","scope"],properties:{
 id:str,kind:{enum:["execution-feedback","event-driven","cross-run-improvement"]},scope:str}}}
}};
export const policyShape:Shape={type:"object",additionalProperties:false,
 required:["policy_schema","catalog_version"],properties:{
 policy_schema:{type:"string",pattern:"^1\\.[0-9]+\\.[0-9]+$"},
 catalog_version:{type:"string",pattern:"^[0-9]+\\.[0-9]+\\.[0-9]+$"},
 target_clis:{type:"array",items:{enum:["claude-code","codex","copilot"]}},
 scope:{type:"object",additionalProperties:false,properties:{include:strings,exclude:strings}},
 applicability:{type:"object",additionalProperties:decision},
 targets:{type:"object",additionalProperties:{type:"object",additionalProperties:false,
  properties:{baseline:{type:"boolean"}}}},
 exemptions:{type:"array",items:{type:"object",required:["check","reason","owner","expires_at","fingerprints"],
  properties:{check:str,reason:{type:"string",minLength:1},owner:str,expires_at:str,fingerprints:{type:"array",minItems:1,items:fp},scope}}},
 attestations:{type:"array",items:object},

}};
export function emptyPolicy(catalogVersion="0.1.0"):Policy {
 return {policy_schema:"1.0.0",catalog_version:catalogVersion,target_clis:[],
 scope:{include:["."],exclude:[]},applicability:{},targets:{},exemptions:[],
 attestations:[]};
}
export function parsePolicy(text:string,catalogVersion:string):Policy {
 let input:unknown;
 try{input=Bun.YAML.parse(text);}catch{throw new MaatError(3,"policy_parse");}
 checkShape(input,policyShape);
 const p=input as Partial<Policy>;
 if(p.catalog_version!.split(".")[0]!==catalogVersion.split(".")[0]) throw new MaatError(3,"catalog_incompatible");
 const base=emptyPolicy(catalogVersion);
 return {...base,...p,scope:{...base.scope,...p.scope}};
}
export async function loadPolicy(path:string,catalogVersion:string,optional=false):Promise<{policy:Policy;diagnostics:string[]}> {
 let text:string;
 try{text=await readFile(path,"utf8");}
 catch(e){if(optional && (e as NodeJS.ErrnoException).code==="ENOENT")
   return {policy:emptyPolicy(catalogVersion),diagnostics:["policy_missing"]};
  throw new MaatError(3,"policy_read: "+path);}
 return {policy:parsePolicy(text,catalogVersion),diagnostics:[]};
}
export function policySkeleton(catalogVersion="0.1.0"):string {
 return "# Fill project choices; absent answers remain unknown.\n"+JSON.stringify(emptyPolicy(catalogVersion),null,2)+"\n";
}
