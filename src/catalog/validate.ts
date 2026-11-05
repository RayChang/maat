import { MaatError } from "../errors";
import type { Catalog, RegistryEntry } from "./types";
const fail=(m:string):never=>{throw new MaatError(3,m);};
export function assertAcyclic(graph:Record<string,string[]>):void {
  const visiting=new Set<string>(), done=new Set<string>();
  function visit(id:string):void {
    if(visiting.has(id)) fail("dependency_cycle: "+id);
    if(done.has(id)) return;
    if(!(id in graph)) fail("unknown_reference: "+id);
    visiting.add(id);
    for(const next of graph[id]!) visit(next);
    visiting.delete(id);done.add(id);
  }
  Object.keys(graph).forEach(visit);
}
export function validateCatalog(c:Catalog):void {
  if(!c || c.catalog_version !== "0.1.0") fail("catalog_version");
  const required=["id","question","baseline","layer","applicability","inspection","evidence_requirements",
    "prerequisites","remediation","verification","sources","item_version","catalog_version"];
  const registries=[c.items,c.capabilities,c.detectors,c.rule_cards,c.templates];
  for(const entries of registries) {
    if(!Array.isArray(entries)) fail("catalog_array");
    const ids=new Set<string>();
    for(const e of entries) {
      if(!e || typeof e.id!=="string" || !/^[a-z][a-z0-9.@-]*$/.test(e.id)) fail("catalog_id");
      if(ids.has(e.id)) fail("duplicate_id: "+e.id);
      ids.add(e.id);
    }
  }
  const caps=new Set(c.capabilities.map(x=>x.id)), detectors=new Set(c.detectors.map(x=>x.id));
  const cards=new Set(c.rule_cards.map(x=>x.id+"@"+x.version));
  const templates=new Set(c.templates.map(x=>x.id+"@"+x.version));
  const check=(id:string,set:Set<string>)=>{if(!set.has(id)) fail("unknown_reference: "+id);};
  for(const i of c.items) {
    for(const key of required) if((i as unknown as Record<string,unknown>)[key] == null)
      fail("missing_contract: "+i.id+"."+key);
    if(i.item_version!==1 || i.catalog_version!==c.catalog_version) fail("item_version: "+i.id);
    if(!["foundation","prompt","context","harness","loop","graph"].includes(i.layer.primary)) fail("layer");
    if(!["baseline","advanced"].includes(i.baseline.proposed_tier)) fail("tier");
    if(!Array.isArray(i.sources) || !i.sources.length) fail("missing_contract: sources");
    if(!Array.isArray(i.inspection.detectors)||!Array.isArray(i.verification.rerun)||
      !Array.isArray(i.prerequisites.required)||!Array.isArray(i.prerequisites.recommended)||
      !Array.isArray(i.remediation.rule_cards)||!Array.isArray(i.remediation.actions)||
      !i.verification.attestation||typeof i.verification.attestation!=="object")
      fail("catalog_shape: "+i.id);
    if(i.prerequisites.conditional!==undefined&&!Array.isArray(i.prerequisites.conditional))fail("catalog_shape: conditional");
    for(const x of i.prerequisites.conditional??[])if(!Array.isArray(x.required)||!Array.isArray(x.recommended))fail("catalog_shape: conditional");
    for(const d of [...i.inspection.detectors,...i.verification.rerun]) check(d,detectors);
    for(const r of i.remediation.rule_cards) check(r.id+"@"+r.version,cards);
    for(const r of i.prerequisites.required) check(typeof r==="string"?r:r.capability,caps);
    for(const r of i.prerequisites.recommended) check(r,caps);
    for(const x of i.prerequisites.conditional??[])
      for(const r of [...x.required,...x.recommended]) check(r,caps);
    if(typeof i.verification.attestation.question!=="string" ||
      !Array.isArray(i.verification.attestation.requires)) fail("attestation_contract");
  }
  const graph:Record<string,string[]>={};
  for(const e of [...c.capabilities,...c.detectors,...c.rule_cards,...c.templates] as RegistryEntry[]) {
    if(e.version!==1) fail("registry_version");
    graph[e.id]=Array.isArray(e.depends_on)?e.depends_on as string[]:[];
    if(Array.isArray(e.templates)) for(const t of e.templates as string[]) check(t,templates);
  }
  assertAcyclic(graph);
  const providers:Record<string,string>={"verify.entrypoint-declared@1":"foundation.verify-entrypoints","verify.entrypoint-documented@1":"foundation.verify-entrypoints","evaluation.config-declared@1":"harness.verification-wiring","evaluation.run-recorded@1":"harness.verification-wiring","recovery.local-source-plan-declared@1":"harness.recovery","recovery.effect-plan-declared@1":"harness.recovery","loop.acceptance-policy-declared@1":"loop.acceptance-policy","loop.stopping-policy-declared@1":"loop.stopping-policy","loop.feedback-routing-declared@1":"loop.feedback-routing"};
  const prerequisites:Record<string,string[]>={};
  for(const capability of c.capabilities)prerequisites["cap:"+capability.id]=providers[capability.id]?["item:"+providers[capability.id]]:[];
  for(const i of c.items)prerequisites["item:"+i.id]=[
   ...i.prerequisites.required.map(r=>typeof r==="string"?r:r.capability),
   ...i.prerequisites.recommended,
   ...(i.prerequisites.conditional??[]).flatMap(x=>[...x.required,...x.recommended])
  ].map(id=>"cap:"+id);
  assertAcyclic(prerequisites);
}
