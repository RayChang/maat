import type { Layer,ItemResult,CapabilityResult,LayerResult,Snapshot,Policy } from "../models";
import type { Catalog } from "../catalog/types";
import { sameScope } from "../canonical";
import { decisionValid,attestationIssues } from "../evidence/validate";
import { evaluationScopes } from "./items";
export function evaluateLayers(c:Catalog,s:Snapshot,p:Policy,items:ItemResult[],caps:CapabilityResult[],now:string,authoritative:boolean):LayerResult[] {
 const out:LayerResult[]=[];
 const layers:Layer[]=["foundation","prompt","context","harness","loop","graph"];
 for(const scope of evaluationScopes(s,p)) for(const layer of layers) {
  const fallback=p.applicability[layer];
  const usage=p.attestations.some(a=>a.check.startsWith(layer+".")&&a.claims?.includes("in_use")&&a.scope&&sameScope(a.scope,scope)&&!attestationIssues(a,s.materials,s.versions,scope,now).length);
  let app=fallback?.status??"unknown";
  if(scope.cli&&!s.target_clis.includes(scope.cli))app="unknown";
  const valid=fallback;
  if(app==="not_applicable" && (!valid||!decisionValid(valid,now)||usage)) app="unknown";
  const required:string[]=[],unknown:string[]=[],missing:string[]=[];
  const holds=(id:string)=>caps.some(c=>c.id===id&&sameScope(c.scope,scope)&&c.status==="holds");
  if(layer==="harness"&&!(holds("verify.entrypoint-declared@1")&&holds("verify.entrypoint-documented@1")))
   unknown.push("worker_evaluation_requirement");
  if((layer==="loop"||layer==="graph")&&!holds("evaluation.config-declared@1"))unknown.push("conditional_evaluation_requirement");
  for(const id of required) {
   const status=caps.find(x=>x.id===id&&sameScope(x.scope,scope))?.status??"unknown";
   if(status==="fails")missing.push(id);else if(status==="unknown")unknown.push(id);
  }
  const selected=items.filter(i=>i.layer===layer&&sameScope(i.scope,scope));
  if(!selected.length&&(Object.keys(scope).length||fallback?.loops?.length))continue;
  const gaps=selected.filter(i=>i.baseline.tier==="baseline" &&
   (i.applicability.status==="unknown"||i.baseline.when_status==="unknown"||
    (i.applicability.status==="applicable"&&i.baseline.when_status==="holds"&&i.result!=="verified"))).map(i=>i.id);
  const evaluated=selected.some(i=>i.result==="verified"||i.result==="partial"||i.result==="missing");
  const status:LayerResult["status"]=app==="unknown"?"pending":app==="not_applicable"?"not_applicable":
   missing.length||unknown.length?(usage?"in_use_unsupported":"blocked"):
   gaps.length||!selected.length||!evaluated?"ready":"adopted";
  out.push({layer,scope,status,authoritative,missing_required:missing,unknown_required:unknown,
   baseline_gaps:gaps,usage_signals:usage?["attested scoped use"]:[]});
 }
 return out;
}
