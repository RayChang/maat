import { readFile,realpath } from "node:fs/promises";
import { resolve,join,relative } from "node:path";
import type { Args } from "./args";
import { one } from "./args";
import type { Snapshot,Policy } from "../models";
import { MaatError } from "../errors";
import { loadCatalog } from "../catalog/load";
import { validateCatalog } from "../catalog/validate";
import { loadPolicy,emptyPolicy } from "../policy/load";
import { discover } from "../discovery/inventory";
import { makeSnapshot,makeScan,parseSnapshot } from "../snapshot";
import { loadEvidence } from "../evidence/validate";
import { claudeCode } from "../adapters/claude-code";
import { codex } from "../adapters/codex";
import { copilot } from "../adapters/copilot";
import { runDetectors } from "../detectors";
import { buildReport,renderReport,parseReport } from "../report";
import { buildPlan,renderPlan } from "../plan";
import { sha256 } from "../canonical";
export interface CommandResult {value:unknown;markdown:string;repository:string;kind:string;snapshot?:Snapshot;}
const adapters={ "claude-code":claudeCode,codex,copilot };
async function input(path:string):Promise<string> {
 try{return await readFile(path,"utf8");}catch{throw new MaatError(3,"input_read: "+path);}
}
export async function runAuditCommand(a:Args,now:string):Promise<CommandResult> {
 const c=await loadCatalog(one(a,"catalog"));validateCatalog(c);
 if(a.command==="plan") {
  const report=parseReport(await input(one(a,"report")!)),plan=buildPlan(report,a.flags.target??[],c);
  return {value:plan,markdown:renderPlan(plan),repository:report.repository.path,kind:"plan"};
 }
 let s:Snapshot,p:Policy,policyPath:string|null=null,diagnostics:string[]=[];
 if(a.command==="scan") {
  let root:string;try{root=await realpath(resolve(a.positionals[0]??"."));}catch{throw new MaatError(3,"repository_path");}
  policyPath=one(a,"policy")??join(root,".maat/policy.yaml");
  if(!one(a,"policy")) {
   try {
    const actual=await realpath(policyPath),rel=relative(root,actual);
    if(rel===".."||rel.startsWith("../"))throw new MaatError(3,"policy_outside_repository");
   }catch(e){if(e instanceof MaatError)throw e;if((e as NodeJS.ErrnoException).code!=="ENOENT")throw new MaatError(3,"policy_read");}
  }
  const loaded=await loadPolicy(policyPath,c.catalog_version,!one(a,"policy"));p=loaded.policy;diagnostics=loaded.diagnostics;
  if(a.flags.cli)p={...p,target_clis:[...new Set(a.flags.cli)]};
  const inventory=await discover(root,p.scope);
  if(!diagnostics.includes("policy_missing")) {
   const text=await input(policyPath),path=one(a,"policy")?"policy:"+resolve(policyPath):".maat/policy.yaml";
   if(!inventory.materials.some(m=>m.path===path))inventory.materials.push({path,text,sha256:sha256(text)});
  } else policyPath=null;
  const interpreted=p.target_clis.map(name=>adapters[name as keyof typeof adapters](inventory.materials));
  const observations=runDetectors(makeScan(inventory,p,interpreted),p,c);
  s=makeSnapshot(inventory,p,interpreted,observations);
 } else if(a.command==="evaluate") {
  s=parseSnapshot(await input(one(a,"snapshot")!));
  p=one(a,"policy")?(await loadPolicy(one(a,"policy")!,c.catalog_version)).policy:emptyPolicy(c.catalog_version);
  policyPath=one(a,"policy")??null;
 } else throw new MaatError(2,"usage_error: expected scan, evaluate or plan");
 const evidence=await loadEvidence(a.flags.evidence??[]);
 p={...p,attestations:[...p.attestations,...evidence.attestations]};
 s={...s,target_clis:p.target_clis.length?p.target_clis:s.target_clis};
 if(process.platform==="win32")diagnostics.push("platform_unknown");
 const report=buildReport(s,p,c,now,policyPath,!!one(a,"catalog"),diagnostics,evidence.assessments);
 if(process.platform==="win32")report.layers.forEach(l=>{l.authoritative=false;});
 return {value:report,markdown:renderReport(report),repository:s.repository.path,kind:"report",snapshot:s};
}
