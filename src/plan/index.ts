import { posix } from "node:path";
import { reportFingerprints,reportVersionBinding } from "../report";
import { checkShape } from "../schema";
import type { Report,Scope } from "../models";
import type { Catalog } from "../catalog/types";
import type { Plan,PlanAction } from "./types";
import { MaatError } from "../errors";
import { canonical,sha256 } from "../canonical";
import { assertAcyclic } from "../catalog/validate";
import { capabilityRules } from "../evaluate/capabilities";
import { templateDefinitions,renderTemplate } from "./templates";
import { policySkeleton } from "../policy/load";
export type PlanAnswers=Record<string,{path?:string;values?:Record<string,string>;extra_paths?:string[];max_fixes?:number}>;
const normal=(p:unknown):p is string=>typeof p==="string"&&!!p.trim()&&p.trim()===p&&!p.startsWith("/")&&!p.startsWith("policy:")&&!p.split("/").includes("..")&&p!=="."&&!p.endsWith("/")&&posix.normalize(p)===p;
export function buildPlan(r:Report,targets:string[],c:Catalog,answers:unknown={}):Plan {
 if(!answers||typeof answers!=="object"||Array.isArray(answers))throw new MaatError(3,"answers_shape");
 const given=answers as PlanAnswers,used=new Set<string>();
 const required=r.items.filter(i=>i.baseline.tier==="baseline"&&i.baseline.when_status==="holds"&&i.applicability.status==="applicable"&&i.result!=="verified");
 const requested=targets.length?targets:required.length?[...new Set(required.map(i=>i.id))]:["foundation.verify-entrypoints","prompt.task-spec","context.instruction-authority"];
 const layers=["foundation","prompt","context","harness","loop","graph"];
 for(const t of requested) if(!layers.includes(t)&&!c.items.some(i=>i.id===t))throw new MaatError(3,"unknown_target: "+t);
 const selected=!targets.length&&required.length?required:r.items.filter(i=>requested.includes(i.id)||requested.includes(i.layer));
 const queue=[...selected],actions:PlanAction[]=[],seen=new Set<string>();
 const id=(check:string,scope:Scope)=>check+"-"+sha256(canonical(scope)).slice(0,8);
 while(queue.length) {
  const item=queue.shift()!;
  if(item.result==="verified"||item.result==="not_applicable"||seen.has(id(item.id,item.scope)))continue;
  seen.add(id(item.id,item.scope));
  const contract=c.items.find(i=>i.id===item.id)!;
  const depends_on:string[]=[];
  for(const req of item.prerequisites.required.filter(x=>x.status!=="holds")) {
   const provider=capabilityRules[req.capability]?.check;
   const candidate=r.items.find(x=>x.id===provider&&canonical(x.scope)===canonical(item.scope));
   if(candidate && candidate.result!=="verified"){queue.push(candidate);depends_on.push(id(candidate.id,candidate.scope));}
  }
  const resource=templateDefinitions.find(t=>t.checks.includes(item.id));
  const refs=item.observations.filter(o=>contract.inspection.detectors.includes(o.detector)).flatMap(o=>o.evidence);
  const paths=[...new Set(refs.map(e=>e.path).filter(path=>path.endsWith(".md")))];
  const answer=given[id(item.id,item.scope)];
  if(answer!==undefined) {
   used.add(id(item.id,item.scope));
   if(!answer||typeof answer!=="object"||Object.keys(answer).some(k=>!["path","values","extra_paths","max_fixes"].includes(k)))throw new MaatError(3,"answers_shape: "+id(item.id,item.scope));
   if(answer.path!==undefined&&!normal(answer.path))throw new MaatError(3,"answer_path: "+id(item.id,item.scope));
   if(answer.extra_paths!==undefined&&(!Array.isArray(answer.extra_paths)||!answer.extra_paths.every(normal)||new Set(answer.extra_paths).size!==answer.extra_paths.length))
    throw new MaatError(3,"answer_extra_paths: "+id(item.id,item.scope));
   if(answer.max_fixes!==undefined&&(!Number.isInteger(answer.max_fixes)||answer.max_fixes<0))throw new MaatError(3,"answer_max_fixes: "+id(item.id,item.scope));
   for(const [k,v] of Object.entries(answer.values??{}))
    if(!resource?.parameters.includes(k)||typeof v!=="string"||!v.trim())throw new MaatError(3,"answer_value: "+id(item.id,item.scope)+" "+k);
  }
  const target_path=answer?.path??(paths.length===1?paths[0]!:null);
  const extra_paths=(answer?.extra_paths??[]).filter(p=>p!==target_path).sort();
  const touched=[target_path,...extra_paths].filter((p):p is string=>!!p);
  const invalidates=[...new Set(r.items.flatMap(i=>i.attestations.filter(a=>a.valid&&(a.paths??[]).some(p=>touched.includes(p))).map(a=>"attestations["+a.ref+"] "+i.id)))].sort();
  const facts=item.observations.flatMap(o=>o.facts).filter(f=>f.status==="holds");
  const inputs:Record<string,string>={};
  const invocation=facts.find(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="invocation");
  const purpose=facts.find(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="purpose");
  if(invocation)inputs.command=invocation.basis;if(purpose)inputs.purpose=purpose.basis;
  Object.assign(inputs,answer?.values??{});
  let template:PlanAction["template"]=null;
  const questions:string[]=[];
  if(resource) {
   try{template={id:resource.id,version:resource.version,body:renderTemplate(resource,Object.fromEntries(resource.parameters.filter(k=>inputs[k]).map(k=>[k,inputs[k]!])))};}
   catch{questions.push("Ask for the missing template values: "+resource.parameters.filter(k=>!inputs[k]).join(", "));}
  }
  if(!target_path)questions.push("Ask for the target location.");
  if(!r.target_clis.length)questions.push("Ask which CLI is in scope.");
  if(contract.remediation.rule_cards.some(card=>card.id==="verify-before-done"))
   questions.push("If choosing the skill form, confirm the GitHub repository and CLI before preparing its separately authorized installation command.");
  if(!r.policy.path&&item.id==="context.instruction-authority")questions.push("Review this policy skeleton before an approved host saves it:\n"+policySkeleton());
  const command:string|null=null;
  actions.push({id:id(item.id,item.scope),check:item.id,scope:item.scope,item_version:item.item_version,
   rule_cards:contract.remediation.rule_cards,template,current:item.result,target:"verified",
   kind:questions.length?"ask":command?"command":"modify",
   actions:[...questions,...contract.remediation.actions],target_path,extra_paths,invalidates,command,depends_on,
   necessity:item.baseline.when_status==="holds"?"required":"recommended",
   risk:contract.remediation.risk,needs_approval:true,role_approval_required:contract.remediation.needs_approval,
   verification:{detectors:contract.verification.rerun,expected:contract.verification.expected,
    manual:contract.verification.attestation.question},fix_conditions:{max_fixes:answer?.max_fixes??0},
   stop_conditions:["scope_change","fingerprint_drift","unknown_effect","no_progress","cancelled"]});
 }
 for(const key of Object.keys(given))if(!used.has(key))throw new MaatError(3,"unknown_answer: "+key);
 const graph=Object.fromEntries(actions.map(a=>[a.id,a.depends_on]));
 assertAcyclic(graph);
 const ordered:PlanAction[]=[],done=new Set<string>();
 const visit=(a:PlanAction)=>{if(done.has(a.id))return;for(const id of a.depends_on)visit(actions.find(x=>x.id===id)!);done.add(a.id);ordered.push(a);};
 actions.sort((a,b)=>a.id.localeCompare(b.id)).forEach(visit);
 const unsigned={report_schema:"1.0.0",versions:reportVersionBinding(r),catalog_version:c.catalog_version,repository:r.repository,
 source_report_fingerprint:sha256(canonical(r)),actions:ordered,fingerprints:reportFingerprints(r),
 authoritative:r.layers.every(l=>l.authoritative),diagnostics:r.diagnostics};
 return {...unsigned,plan_fingerprint:sha256(canonical(unsigned))};
}
export function renderPlan(p:Plan):string {
 return "# maat improvement plan\n\n"+p.actions.map(a=>"## "+a.id+"\n\n"+
 "Current: "+a.current+"; target: "+a.target+"; kind: "+a.kind+"\n\n"+
 a.actions.map(x=>"- "+x).join("\n")+"\n\nTarget: "+(a.target_path??"location requires confirmation")+
 (a.extra_paths?.length?"\n\nAlso changes: "+a.extra_paths.join(", "):"")+"\n\nFix rounds: "+a.fix_conditions.max_fixes+
 (a.invalidates?.length?"\n\nInvalidates attestations (they must be confirmed again after the change): "+a.invalidates.join(", "):"")+
 "\n\nDependencies: "+a.depends_on.join(", ")+
 "\n\nApproval required: true; command authorization is separate.\n\n"+
 "Acceptance: "+canonical(a.verification)+"\n\n"+(a.template?.body??"")).join("\n")+"\n";
}
export function parsePlan(text:string):Plan {
 let p:Plan;try{p=JSON.parse(text);}catch{throw new MaatError(3,"plan_parse");}
 checkShape(p,{"type":"object","required":["report_schema","catalog_version","repository","source_report_fingerprint","plan_fingerprint","actions","fingerprints","authoritative","diagnostics","versions"],"properties":{"report_schema":{"type":"string","pattern":"^1\\."},"catalog_version":{"type":"string"},"repository":{"type":"object","required":["path","repo_id"],"properties":{"path":{"type":"string"},"repo_id":{"type":"string","pattern":"^[a-f0-9]{16}$"}}},"source_report_fingerprint":{"type":"string","pattern":"^[a-f0-9]{64}$"},"plan_fingerprint":{"type":"string","pattern":"^[a-f0-9]{64}$"},"actions":{"type":"array","items":{"type":"object","required":["id","check","scope","item_version","rule_cards","template","current","target","kind","actions","target_path","command","depends_on","necessity","risk","needs_approval","role_approval_required","verification","fix_conditions","stop_conditions"],"properties":{"kind":{"enum":["ask","modify","command"]},"depends_on":{"type":"array","items":{"type":"string"}},"needs_approval":{"type":"boolean"},"fix_conditions":{"type":"object","required":["max_fixes"],"properties":{"max_fixes":{"type":"number"}}},"id":{"type":"string"},"check":{"type":"string"},"current":{"type":"string"},"target":{"type":"string"},"risk":{"type":"string"},"scope":{"type":"object"},"item_version":{"type":"number"},"rule_cards":{"type":"array","items":{"type":"object","required":["id","version"],"properties":{"id":{"type":"string"},"version":{"type":"number"}}}},"actions":{"type":"array","items":{"type":"string"}},"necessity":{"enum":["required","recommended"]},"role_approval_required":{"type":"boolean"},"verification":{"type":"object","required":["detectors","expected","manual"],"properties":{"detectors":{"type":"array","items":{"type":"string"}},"manual":{"type":"string"}}},"stop_conditions":{"type":"array","items":{"type":"string"}}}}},"fingerprints":{"type":"array","items":{"type":"object","required":["path","sha256"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}}}},"authoritative":{"type":"boolean"},"diagnostics":{"type":"array"},"versions":{"type":"object","required":["tool_version","catalog_version","report_schema","policy_schema","ledger_schema","adapters"],"properties":{"tool_version":{"type":"string"},"catalog_version":{"type":"string"},"report_schema":{"type":"string"},"policy_schema":{"type":"string"},"ledger_schema":{"type":"string"},"adapters":{"type":"array","items":{"type":"object","required":["name","adapter_version","verified_cli_range","checked_at"],"properties":{"name":{"type":"string"},"adapter_version":{"type":"string"},"verified_cli_range":{"type":"string"},"checked_at":{"type":"string"}}}}}}}});
 for(const a of p.actions)if((a.target_path!==null&&typeof a.target_path!=="string")||(a.extra_paths!==undefined&&(!Array.isArray(a.extra_paths)||a.extra_paths.some(x=>typeof x!=="string")))||(a.command!==null&&typeof a.command!=="string")||!Number.isInteger(a.fix_conditions.max_fixes)||a.fix_conditions.max_fixes<0)throw new MaatError(3,"plan_shape");
 const {plan_fingerprint,...unsigned}=p;
 if(sha256(canonical(unsigned))!==plan_fingerprint)throw new MaatError(3,"plan_fingerprint");
 assertAcyclic(Object.fromEntries(p.actions.map(a=>[a.id,a.depends_on])));
 return p;
}
