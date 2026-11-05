import type { Truth,Claim,Scope,Snapshot,Policy } from "../models";
import { sameScope } from "../canonical";
import { attestationIssues } from "../evidence/validate";
export function allTruth(v:Truth[]):Truth {
 return !v.length?"unknown":v.includes("fails")?"fails":v.includes("unknown")?"unknown":"holds";
}
export function anyTruth(v:Truth[]):Truth {
 return !v.length?"unknown":v.includes("holds")?"holds":v.includes("unknown")?"unknown":"fails";
}
export function resolveClaim(subject:string,claim:string,scope:Scope,s:Snapshot,p:Policy,now:string,userCheck=subject,userClaim=claim):Claim {
 if(scope.cli&&!s.target_clis.includes(scope.cli))return {name:claim,status:"unknown",basis:["cli_not_selected"]};
 const basis:string[]=[],values:Truth[]=[];
 for(const o of s.observations) for(const f of o.facts)
  if(f.subject===subject && f.claim===claim && sameScope(f.scope,scope) && !f.signal) {
   const status=f.status==="fails"&&(!f.complete||!s.scope.complete)?"unknown":f.status;
   values.push(status);basis.push("static: "+f.basis);
  }
 for(const [index,a] of p.attestations.entries()) {
  if(a.check!==userCheck || !Array.isArray(a.claims) || !userClaim.split('|').some(k=>a.claims.includes(k)) || !a.scope || !sameScope(a.scope,scope)) continue;
  const invalid=attestationIssues(a,s.materials,s.versions,scope,now);
  if(invalid.length){basis.push("attestation "+index+" invalid: "+invalid.join(","));values.push("unknown");}
  else {values.push("holds");basis.push("attested_by_user: "+a.attested_by+" #"+index);}
 }
 const positive=values.includes("holds"),negative=values.includes("fails");
 if(positive&&negative) return {name:claim,status:"unknown",basis:[...basis,"evidence_conflict"]};
 return {name:claim,status:positive?"holds":negative?"fails":"unknown",basis};
}
