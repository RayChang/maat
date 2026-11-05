import type { Report,Snapshot,Policy,ProtectionObservation,Assessment,Fingerprint } from "../models";
import type { Catalog } from "../catalog/types";
import { versions } from "../versions";
import { evaluationScopes,evaluateItems } from "../evaluate/items";
import { evaluateCapabilities } from "../evaluate/capabilities";
import { evaluateLayers } from "../evaluate/layers";
import { canonical } from "../canonical";
import { checkShape } from "../schema";
import { MaatError } from "../errors";
export function buildReport(s:Snapshot,p:Policy,c:Catalog,now:string,policyPath:string|null=null,overridden=false,policyDiagnostics:string[]=[],assessments:Assessment[]=[]):Report {
 const capabilities=evaluateCapabilities(c,evaluationScopes(s,p),s,p,now);
 const items=evaluateItems(c,s,p,capabilities,now,assessments);
 const authoritative=c.approved&&!overridden&&s.versions.catalog_version===c.catalog_version;
 const layers=evaluateLayers(c,s,p,items,capabilities,now,authoritative);
 const diagnostics=[...s.scope.diagnostics,...policyDiagnostics,...s.observations.flatMap(o=>o.diagnostics)];
 if(overridden)diagnostics.push("catalog_overridden");
 if(!c.approved)diagnostics.push("policy_unapproved");
 if(s.versions.catalog_version!==c.catalog_version)diagnostics.push("catalog_version_mismatch");
 const invalid=items.flatMap(i=>i.attestations.filter(a=>!a.valid).map(a=>a.invalid_reason!));
 const protection_observations:ProtectionObservation[]=s.observations.filter(o=>o.detector==="permissions.declarations@1")
 .flatMap(o=>o.facts.filter(f=>f.claim==="deny").map(f=>({measure:"Declared deny rules",protects:f.basis,
 threat:"Unconfirmed threat model",boundary:"Repository configuration",evidence:o.evidence,
 unknown:["Runtime enforcement","Other write paths",...o.limits]})));
 const expiries=[...p.attestations.map(a=>a.expires_at),...Object.values(p.applicability).map(d=>d.expires_at),
 
 ...p.exemptions.map(d=>d.expires_at)].filter((x):x is string=>!!x&&Number.isFinite(Date.parse(x)));
 const valid_until=expiries.length?new Date(Math.min(...expiries.map(Date.parse))).toISOString():null;
 return {valid_until,report_schema:versions.report_schema,tool_version:versions.tool_version,catalog_version:c.catalog_version,
 adapters:s.adapters.map(({name,adapter_version,verified_cli_range,checked_at,surfaces})=>({name,adapter_version,verified_cli_range,checked_at,
 surfaces:surfaces.map(({surface,support,reason})=>({surface,support,reason}))})),generated_at:now,repository:s.repository,scope:s.scope,target_clis:s.target_clis,
 policy:{path:policyPath,policy_schema:p.policy_schema,valid:!invalid.length&&!policyDiagnostics.length,
 diagnostics:[...policyDiagnostics,...invalid]},items,capabilities:capabilities.map(({id,status,scope,basis})=>({id,status,scope,basis})),layers,protection_observations,
 diagnostics:[...new Set(diagnostics)].sort()};
}
const cell=(v:unknown)=>canonical(v).replaceAll("|","\\|").replaceAll("\n"," ");
export function renderReport(r:Report):string {
 const lines=["# maat audit report","","## Summary","",
 "| Layer / scope | State | Required gaps | Unknown requirements |","|---|---|---|---|"];
 for(const l of r.layers) lines.push("| "+[l.layer+" "+cell(l.scope),l.status,cell(l.missing_required),cell(l.unknown_required)].join(" | ")+" |");
 lines.push("","Pending items: "+r.items.filter(i=>i.result==="unknown").length,
 "Authoritative: "+r.layers.every(l=>l.authoritative),"","## Layer findings","");
 for(const l of r.layers) {
  lines.push("### "+l.layer+" "+cell(l.scope),"","Baseline gaps: "+cell(l.baseline_gaps));
  for(const i of r.items.filter(i=>i.layer===l.layer&&canonical(i.scope)===canonical(l.scope)&&
   (i.baseline.tier==="advanced"||i.baseline.when_status==="fails"))) lines.push("- "+i.id+": "+i.result);
 }
 lines.push("","## Item details","","| Item / scope / result | Machine observations | Agent assessments | User attestations |","|---|---|---|---|");
 for(const i of r.items) lines.push("| "+[i.id+" "+cell(i.scope)+" "+i.result,cell(i.observations),cell(i.assessments),cell(i.attestations)].join(" | ")+" |",
 "\nClaims: "+cell(i.claims)+"; applicability: "+cell(i.applicability)+"; prerequisites: "+cell(i.prerequisites)+"; diagnostics: "+cell(i.diagnostics)+"\n");
 lines.push("","## Protection observations","");
 for(const p of r.protection_observations) lines.push("- "+cell(p));
 lines.push("","## Scope and limits","",cell(r.repository),cell(r.scope),cell(r.diagnostics),
 "Static declarations do not establish runtime enforcement. Role identities are source-provided.",
 "","## Versions","",cell({tool_version:r.tool_version,report_schema:r.report_schema,catalog_version:r.catalog_version,policy_schema:r.policy.policy_schema,adapters:r.adapters}));
 return lines.join("\n")+"\n";
}
export function parseReport(text:string):Report {
 let value:unknown;try{value=JSON.parse(text);}catch{throw new MaatError(3,"report_parse");}
 checkShape(value,{"type":"object","required":["report_schema","tool_version","catalog_version","adapters","generated_at","repository","scope","target_clis","policy","items","capabilities","layers","protection_observations","diagnostics","valid_until"],"properties":{"report_schema":{"type":"string","pattern":"^1\\."},"tool_version":{"type":"string"},"catalog_version":{"type":"string"},"adapters":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["name","adapter_version","verified_cli_range","checked_at","surfaces"],"properties":{"name":{"type":"string"},"adapter_version":{"type":"string"},"verified_cli_range":{"type":"string"},"checked_at":{"type":"string"},"surfaces":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["surface","support","reason"],"properties":{"surface":{"type":"string"},"support":{"enum":["supported","unsupported","unknown"]},"reason":{"type":"string"}}}}}}},"generated_at":{"type":"string"},"repository":{"type":"object","required":["path","repo_id"],"properties":{"path":{"type":"string"},"repo_id":{"type":"string","pattern":"^[a-f0-9]{16}$"}}},"scope":{"type":"object"},"target_clis":{"type":"array"},"policy":{"type":"object","required":["path","policy_schema","valid","diagnostics"],"properties":{"policy_schema":{"type":"string"},"valid":{"type":"boolean"},"diagnostics":{"type":"array","items":{"type":"string"}}}},"items":{"type":"array","items":{"type":"object","required":["id","item_version","layer","scope","applicability","result","claims","observations","assessments","attestations","prerequisites","baseline","diagnostics"],"properties":{"id":{"type":"string"},"item_version":{"type":"number"},"layer":{"enum":["foundation","prompt","context","harness","loop","graph"]},"scope":{"type":"object"},"applicability":{"type":"object","required":["status","reason","questions"],"properties":{"status":{"enum":["applicable","not_applicable","unknown"]},"reason":{"type":"string"},"questions":{"type":"array"}}},"result":{"enum":["verified","partial","missing","not_applicable","unknown"]},"claims":{"type":"array","items":{"type":"object","required":["name","status","basis"],"properties":{"name":{"type":"string"},"status":{"enum":["holds","fails","unknown"]},"basis":{"type":"array"}}}},"observations":{"type":"array","items":{"type":"object","required":["detector","version","scope","evidence","limits","facts","diagnostics"],"properties":{"detector":{"type":"string"},"version":{"type":"number"},"scope":{"type":"object"},"evidence":{"type":"array","items":{"type":"object","required":["path","sha256","lines"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"lines":{"type":"string","pattern":"^[1-9][0-9]*-[1-9][0-9]*$"},"quote":{"type":"string"}}}},"limits":{"type":"array"},"facts":{"type":"array","items":{"type":"object","required":["subject","claim","status","scope","basis","complete"],"properties":{"subject":{"type":"string"},"claim":{"type":"string"},"status":{"enum":["holds","fails","unknown"]},"scope":{"type":"object"},"basis":{"type":"string"},"complete":{"type":"boolean"}}}},"diagnostics":{"type":"array"}}}},"assessments":{"type":"array"},"attestations":{"type":"array","items":{"type":"object","required":["ref","valid","invalid_reason"],"properties":{"ref":{"type":"string"},"valid":{"type":"boolean"}}}},"prerequisites":{"type":"object","required":["required","recommended"],"properties":{"required":{"type":"array","items":{"type":"object","required":["capability","status"],"properties":{"capability":{"type":"string"},"status":{"enum":["holds","fails","unknown"]}}}},"recommended":{"type":"array","items":{"type":"object","required":["capability","status"],"properties":{"capability":{"type":"string"},"status":{"enum":["holds","fails","unknown"]}}}}}},"baseline":{"type":"object","required":["tier","when_status"],"properties":{"tier":{"enum":["baseline","advanced"]},"when_status":{"enum":["holds","fails","unknown"]}}},"diagnostics":{"type":"array"}}}},"capabilities":{"type":"array","items":{"type":"object","additionalProperties":false,"required":["id","status","scope","basis"],"properties":{"id":{"type":"string"},"status":{"enum":["holds","fails","unknown"]},"scope":{"type":"object"},"basis":{"type":"array"}}}},"layers":{"type":"array","items":{"type":"object","required":["layer","scope","status","authoritative","missing_required","unknown_required","baseline_gaps","usage_signals"],"properties":{"status":{"enum":["adopted","ready","blocked","not_applicable","in_use_unsupported","pending"]},"authoritative":{"type":"boolean"}}}},"protection_observations":{"type":"array"},"diagnostics":{"type":"array"}}});
 return value as Report;
}
export function reportFingerprints(r:Report):Fingerprint[] {
 const refs=[...r.items.flatMap(i=>[...i.observations.flatMap(o=>o.evidence),...i.assessments.flatMap(a=>a.citations)]),
 ...r.protection_observations.flatMap(o=>o.evidence)];
 const byPath=new Map<string,Fingerprint>();
 for(const e of refs) {
  const prior=byPath.get(e.path);if(prior&&prior.sha256!==e.sha256)throw new MaatError(3,"report_fingerprint_conflict");
  byPath.set(e.path,{path:e.path,sha256:e.sha256});
 }
 return [...byPath.values()].sort((a,b)=>a.path.localeCompare(b.path));
}
export function reportVersionBinding(r:Report):import("../versions").Versions {
 return {...versions,tool_version:r.tool_version,report_schema:r.report_schema,policy_schema:r.policy.policy_schema,
 catalog_version:r.catalog_version,adapters:r.adapters.map(({name,adapter_version,verified_cli_range,checked_at})=>({name,adapter_version,verified_cli_range,checked_at}))};
}
