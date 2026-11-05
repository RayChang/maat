import { readFile } from "node:fs/promises";
import type { Attestation, Assessment, Material, Scope, Fingerprint } from "../models";
import type { Versions } from "../versions";
import { sameScope } from "../canonical";
import { checkShape } from "../schema";
import { MaatError } from "../errors";
export interface EvidenceBundle { attestations:Attestation[];assessments:Assessment[]; }
export function decisionValid(v:{reason?:string;owner?:string;expires_at?:string},now:string):boolean {
 return !!(v.reason?.trim()&&v.owner?.trim()&&Number.isFinite(Date.parse(v.expires_at??""))&&Date.parse(v.expires_at!)>Date.parse(now));
}
export function attestationIssues(a:Attestation,m:Fingerprint[],v:Versions,scope:Scope,now:string):string[] {
 const out:string[]=[];
 if(!a || typeof a!=="object") return ["attestation_shape"];
 for(const k of ["check","answer","attested_by","attested_at","expires_at","catalog_version"] as const)
  if(typeof a[k]!=="string" || !a[k].trim()) out.push("missing_"+k);
 if(!Array.isArray(a.claims)||!a.claims.length||!a.claims.every(x=>typeof x==="string")) out.push("missing_claims");
 if(!a.scope || !a.adapter_version || !Array.isArray(a.materials)||!a.materials.length) return [...out,"missing_materials_or_scope"];
 if(/^(yes|no|true|false|有|沒有|是|否)$/i.test((a.answer??"").trim())) out.push("answer_not_substantive");
 const at=Date.parse(a.attested_at), end=Date.parse(a.expires_at), time=Date.parse(now);
 if(!Number.isFinite(at)||!Number.isFinite(end)||at>time||end<=at) out.push("invalid_time");
 if(end<=time) out.push("expired");
 if(a.catalog_version?.split(".")[0]!==v.catalog_version.split(".")[0]) out.push("catalog_incompatible");
 if(!sameScope(a.scope,scope)) out.push("scope_mismatch");
 if(scope.cli && a.adapter_version[scope.cli]!==v.adapters.find(x=>x.name===scope.cli)?.adapter_version)
  out.push("adapter_incompatible");
 for(const e of a.materials) {
  const found=m.find(x=>x.path===e.path);
  if(!found || found.sha256!==e.sha256) {out.push("fingerprint_mismatch");continue;}
  const range=/^([1-9][0-9]*)-([1-9][0-9]*)$/.exec(e.lines??"");
  if(!range){out.push("invalid_lines");continue;}
  const start=Number(range[1]),stop=Number(range[2]);
  if(stop<start || typeof e.quote!=="string" || !e.quote.trim())
   out.push("citation_mismatch");
 }
 return [...new Set(out)];
}
export async function loadEvidence(paths:string[]):Promise<EvidenceBundle> {
 const result:EvidenceBundle={attestations:[],assessments:[]};
 for(const path of paths) {
  let data:unknown;try{data=Bun.YAML.parse(await readFile(path,"utf8"));}catch{throw new MaatError(3,"evidence_parse: "+path);}
  checkShape(data,{type:"object",required:["source","provided_by"],properties:{
   source:{type:"string",minLength:1},provided_by:{type:"string",minLength:1}}});
  const record=data as Record<string,unknown>;
  if(typeof record.claim==="string") {
   checkShape(record,{type:"object",required:["check","claim","stance","citations","uncertainty","by","scope","catalog_version","item_version"],
    properties:{stance:{enum:["supports","refutes","insufficient"]},citations:{type:"array"},scope:{type:"object"}}});
   result.assessments.push(record as unknown as Assessment);
  } else {
   result.attestations.push(record as unknown as Attestation);
  }
 }
 return result;
}
