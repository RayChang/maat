import type { Catalog } from "../catalog/types";
import type { CapabilityResult,Scope,Snapshot,Policy } from "../models";
import { allTruth,resolveClaim } from "./truth";
import { MaatError } from "../errors";
export const capabilityRules:Record<string,{check:string;claim:string;fields:string[]}>={
  "verify.entrypoint-declared@1": {
    "check": "foundation.verify-entrypoints",
    "claim": "declared",
    "fields": [
      "name",
      "invocation",
      "purpose"
    ]
  },
  "verify.entrypoint-documented@1": {
    "check": "foundation.verify-entrypoints",
    "claim": "documented",
    "fields": [
      "invocation",
      "purpose",
      "correspondence"
    ]
  },
  "evaluation.config-declared@1": {
    "check": "harness.verification-wiring",
    "claim": "evaluation_config",
    "fields": [
      "input",
      "method",
      "criteria",
      "result"
    ]
  },
  "evaluation.run-recorded@1": {
    "check": "harness.verification-wiring",
    "claim": "run_record",
    "fields": [
      "artifact",
      "method",
      "time",
      "result",
      "record"
    ]
  },
  "recovery.local-source-plan-declared@1": {
    "check": "harness.recovery",
    "claim": "local",
    "fields": [
      "baseline",
      "steps",
      "owner",
      "coverage",
      "exclusions"
    ]
  },
  "recovery.effect-plan-declared@1": {
    "check": "harness.recovery",
    "claim": "other_effects",
    "fields": [
      "effect",
      "steps",
      "authorizer",
      "limits",
      "unknown_result"
    ]
  },
  "loop.acceptance-policy-declared@1": {
    "check": "loop.acceptance-policy",
    "claim": "acceptance",
    "fields": [
      "candidate",
      "authority",
      "criteria",
      "evidence",
      "accept",
      "reject",
      "exception"
    ]
  },
  "loop.stopping-policy-declared@1": {
    "check": "loop.stopping-policy",
    "claim": "stopping",
    "fields": [
      "normal",
      "cancel",
      "blocked",
      "resume",
      "exhausted",
      "responsibility"
    ]
  },
  "loop.feedback-routing-declared@1": {
    "check": "loop.feedback-routing",
    "claim": "routing",
    "fields": [
      "outcomes",
      "authority",
      "unevaluable"
    ]
  }
};
export function evaluateCapabilities(c:Catalog,scopes:Scope[],s:Snapshot,p:Policy,now:string):CapabilityResult[] {
 const out:CapabilityResult[]=[];
 for(const entry of c.capabilities) {
  const rule=capabilityRules[entry.id];
  if(!rule) throw new MaatError(3,"capability_unsupported: "+entry.id);
  for(const scope of scopes) {
   const claims=rule.fields.map(field=>resolveClaim(entry.id,field,scope,s,p,now,rule.check,field+'|'+rule.claim));
   out.push({id:entry.id,scope,status:allTruth(claims.map(x=>x.status)),claims,basis:claims.flatMap(x=>x.basis)});
  }
 }
 const project=(id:string)=>out.find(x=>x.id===id&&!Object.keys(x.scope).length);
 return out.map(x=>{const base=project(x.id);
  return Object.keys(x.scope).length&&x.status==="unknown"&&!x.basis.length&&base&&base.status!=="unknown"?{...x,status:base.status,claims:base.claims,basis:[...base.basis,"inherited_from_project_scope"]}:x;});
}
