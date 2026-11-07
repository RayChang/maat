import type { Catalog,CatalogItem } from "../catalog/types";
import type { Snapshot,Policy,Scope,ItemResult,Claim,CapabilityResult,Layer,Truth,Assessment,Observation } from "../models";
import { MaatError } from "../errors";
import { canonical,sameScope,countsFor } from "../canonical";
import { resolveClaim } from "./truth";
import { decisionValid,attestationIssues } from "../evidence/validate";
import { capabilityRules } from "./capabilities";
import { foundationClaims } from "./contracts/foundation";
import { promptClaims } from "./contracts/prompt";
import { contextClaims } from "./contracts/context";
import { harnessClaims } from "./contracts/harness";
import { loopClaims } from "./contracts/loop";
import { graphClaims } from "./contracts/graph";
export const itemClaims:Record<string,string[]>={...foundationClaims,...promptClaims,...contextClaims,...harnessClaims,...loopClaims,...graphClaims};
export function evaluationScopes(s:Snapshot,p:Policy):Scope[] {
 const scopes:Scope[]=[{},...s.observations.map(o=>o.scope).filter(x=>x.evaluator!=="command"),...p.attestations.filter(x=>x.scope).map(x=>x.scope),...Object.values(p.applicability).flatMap(d=>(d.loops??[]).map(l=>({workflow:l.scope})))];
 return [...new Map(scopes.map(x=>[canonical(x),x])).values()].sort((a,b)=>canonical(a).localeCompare(canonical(b)));
}
export function itemScopes(i:CatalogItem,s:Snapshot,p:Policy):Set<string> {
 const own=(o:Observation)=>i.inspection.detectors.includes(o.detector)||i.verification.rerun.includes(o.detector)||o.facts.some(f=>f.subject===i.id);
 const loops=Object.entries(p.applicability).filter(([key])=>key===i.id||key===i.layer.primary).flatMap(([,d])=>(d.loops??[]).map(l=>({workflow:l.scope})));
 const scopes=new Set([{},...s.observations.filter(own).map(o=>o.scope),...p.attestations.flatMap(a=>a.check===i.id&&a.scope?[a.scope]:[]),...p.exemptions.flatMap(e=>e.check===i.id&&e.scope?[e.scope]:[]),...loops].map(x=>canonical(x)));
 if(loops.length)scopes.delete(canonical({}));
 return scopes;
}
export function evaluateItems(c:Catalog,s:Snapshot,p:Policy,caps:CapabilityResult[],now:string,assessments:Assessment[]=[]):ItemResult[] {
 const ids=new Set(c.items.map(i=>i.id));
 for(const a of p.attestations) {
  if(!ids.has(a.check)) throw new MaatError(3,"unknown_check: "+a.check);
  const aliases=Object.values(capabilityRules).filter(r=>r.check===a.check).flatMap(r=>[r.claim,...r.fields]);
  if(Array.isArray(a.claims) && a.claims.some(k=>![...(itemClaims[a.check]??[]),...aliases,"in_use"].includes(k)))
   throw new MaatError(3,"unknown_claim: "+a.check);
 }
 for(const key of [...Object.keys(p.targets),...p.exemptions.map(e=>e.check)])
  if(!ids.has(key)) throw new MaatError(3,"unknown_check: "+key);
 const out:ItemResult[]=[];
 const relevant=new Map(c.items.map(i=>[i.id,itemScopes(i,s,p)]));
 for(const scope of evaluationScopes(s,p)) for(const i of c.items) {
  if(!relevant.get(i.id)!.has(canonical(scope))) continue;
  const selected=p.applicability[i.id]??p.applicability[i.layer.primary];
  const decision=selected??{status:"unknown" as const};
  const usage=p.attestations.some(a=>a.check===i.id&&a.claims?.includes("in_use")&&a.scope&&sameScope(a.scope,scope)&&!attestationIssues(a,s.materials,s.versions,scope,now).length);
  const invalidNA=decision.status==="not_applicable"&&(!decisionValid(decision,now)||usage);
  const app=invalidNA||(scope.cli&&!s.target_clis.includes(scope.cli))?"unknown":decision.status;
  const names=i.id==="harness.recovery"&&scope.effect
   ?[scope.effect==="local-source"?"local":"other_effects"]:itemClaims[i.id];
  if(!names) throw new MaatError(3,"item_contract_unsupported: "+i.id);
  const findCap=(id:string)=>caps.find(x=>x.id===id&&sameScope(x.scope,scope));
  const claims:Claim[]=names.map(name=>{
   const cap=i.id==="foundation.verify-entrypoints"?(name==="declared"?"verify.entrypoint-declared@1":"verify.entrypoint-documented@1")
    :i.id==="harness.recovery"?(name==="local"?"recovery.local-source-plan-declared@1":"recovery.effect-plan-declared@1"):undefined;
   if(cap){const x=findCap(cap);return {name,status:x?.status??"unknown",basis:x?.basis??[]};}
   if(i.id==="loop.feedback-routing"){
    const x=findCap("loop.feedback-routing-declared@1")?.claims.find(x=>x.name===name);
    return x??{name,status:"unknown",basis:[]};
   }
   return resolveClaim(i.id,name,scope,s,p,now);
  });
  const known=claims.filter(x=>x.status==="holds").length;
  const result=app==="not_applicable"?"not_applicable":app!=="applicable"?"unknown":
   known===claims.length&&known>0?"verified":known>0?"partial":claims.length>0&&claims.some(x=>x.status==="fails")?"missing":"unknown";
  const prerequisites={required:i.prerequisites.required.map(r=>{
   const capability=typeof r==="string"?r:r.capability;return {capability,status:findCap(capability)?.status??"unknown" as Truth};
  }),recommended:i.prerequisites.recommended.map(capability=>({capability,status:findCap(capability)?.status??"unknown" as Truth}))};
  if(i.id==="harness.verification-wiring") {
   prerequisites.required.push({capability:"verify.entrypoint-declared@1",status:findCap("verify.entrypoint-declared@1")?.status==="holds"?"holds":"unknown"});
   prerequisites.recommended.push({capability:"verify.entrypoint-documented@1",status:findCap("verify.entrypoint-documented@1")?.status??"unknown"});
  }
  const condition=p.targets[i.id]?.baseline;
  const diagnostics:string[]=invalidNA?["invalid_or_conflicting_applicability"]:[];
  if(p.exemptions.some(e=>e.check===i.id&&(!e.scope||sameScope(e.scope,scope))))
   diagnostics.push("exemption_recorded_separately");
  const when_status:Truth=i.baseline.proposed_tier==="advanced"?"fails":condition===true?"holds":condition===false?"fails":"unknown";
  out.push({id:i.id,item_version:i.item_version,layer:i.layer.primary as Layer,scope,
   applicability:{status:app,reason:decision.reason??"",questions:i.applicability.questions},
   result,claims,observations:s.observations.filter(o=>countsFor(o.scope,scope)&&(i.inspection.detectors.includes(o.detector)||i.verification.rerun.includes(o.detector)||o.facts.some(f=>f.subject===i.id))),
   assessments:assessments.filter(a=>a.check===i.id&&sameScope(a.scope,scope)),
   attestations:p.attestations.flatMap((a,n)=>{
    if(a.check!==i.id||!a.scope||!sameScope(a.scope,scope)) return [];
    const issues=attestationIssues(a,s.materials,s.versions,scope,now);
    return [{ref:String(n),valid:!issues.length,invalid_reason:issues.length?issues.join(","):null}];
   }),prerequisites,baseline:{tier:i.baseline.proposed_tier,when_status},diagnostics});
 }
 return out;
}
