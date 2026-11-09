import type { Args } from "./args";
import { one } from "./args";
import type { CommandResult } from "./audit";
import { versions } from "../versions";
import { loadCatalog } from "../catalog/load";
import { validateCatalog } from "../catalog/validate";
import { loadPolicy,policySkeleton } from "../policy/load";
import { discover } from "../discovery/inventory";
import { attestationIssues,decisionValid } from "../evidence/validate";
import { itemClaims } from "../evaluate/items";
import { capabilityRules } from "../evaluate/capabilities";
import { MaatError } from "../errors";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parseSnapshot } from "../snapshot";
export async function runInspectCommand(a:Args,now:string,cwd=process.cwd()):Promise<CommandResult> {
 const c=await loadCatalog(one(a,"catalog"));validateCatalog(c);
 let value:unknown,markdown:string|undefined;
 if(a.command==="version") value=versions;
 else if(a.command==="catalog validate")value={valid:true,catalog_version:c.catalog_version};
 else if(a.command==="catalog list")value=c.items.filter(i=>(!one(a,"layer")||i.layer.primary===one(a,"layer"))&&
 (!one(a,"tier")||i.baseline.proposed_tier===one(a,"tier")));
 else if(a.command==="explain") {
  const id=a.positionals[0]!;
  const matches=[...c.items.map(i=>({id:i.id,version:i.item_version,data:i})),
   ...c.capabilities.map(x=>({id:x.id,version:x.version,data:x})),
   ...c.rule_cards.map(x=>({id:x.id,version:x.version,data:x})),
   ...c.templates.map(x=>({id:x.id,version:x.version,data:x}))]
   .filter(x=>id===x.id||id===x.id+"@"+x.version);
  if(matches.length!==1)throw new MaatError(3,matches.length?"ambiguous_id":"unknown_id");
  value=matches[0]!.data;
 } else if(a.command==="policy init") {
  markdown=policySkeleton(c.catalog_version);
  value=(await import("../policy/load")).emptyPolicy(c.catalog_version);
 } else if(a.command==="policy validate") {
  const path=a.positionals[0]??resolve(cwd,".maat/policy.yaml");
  const {policy:p}=await loadPolicy(path,c.catalog_version);
  const file=one(a,"snapshot");
  let text="";if(file)try{text=await readFile(file,"utf8");}catch{throw new MaatError(3,"input_read: "+file);}
  const s=file?parseSnapshot(text):undefined;
  const materials=s?s.materials:(await discover(cwd,p.scope)).materials;
  const issues=p.attestations.flatMap((x,i)=>attestationIssues(x,materials,s?s.versions:versions,x.scope,now).map(r=>"attestations["+i+"] "+x.check+" "+r));
  p.exemptions.forEach((e,i)=>{if(!decisionValid(e,now)||!e.fingerprints.length||!e.fingerprints.every(f=>materials.some(m=>m.path===f.path&&m.sha256===f.sha256)))issues.push("exemptions["+i+"] invalid_exemption");});
  if(issues.length)throw new MaatError(3,"policy_invalid: "+[...new Set(issues)].join(","));
  value={valid:true,policy_schema:p.policy_schema};
 } else if(a.command==="attest template") {
  const item=c.items.find(i=>i.id===one(a,"check"));
  if(!item)throw new MaatError(3,"unknown_check");
  value={check:item.id,claims:itemClaims[item.id],answer:"",materials:[],scope:{},attested_by:"",
   attested_at:now,expires_at:"",catalog_version:c.catalog_version,adapter_version:{},
   question:item.verification.attestation.question,
   requires:item.verification.attestation.requires,
   optional_capability_claims:Object.values(capabilityRules).filter(r=>r.check===item.id).map(r=>({claim:r.claim,requires:r.fields}))};
 } else throw new MaatError(2,"usage_error: unknown inspector");
 return {value,markdown:markdown??"# maat "+a.command+"\n\n\u0060\u0060\u0060json\n"+JSON.stringify(value,null,2)+"\n\u0060\u0060\u0060\n",
 repository:resolve(cwd),kind:a.command.replaceAll(" ","-")};
}
