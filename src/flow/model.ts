import type { Fingerprint,Snapshot } from "../models";
import type { Plan } from "../plan/types";
import type { Flow } from "./types";
import { canonical,sha256 } from "../canonical";
import { MaatError } from "../errors";
export function fingerprintSet(fps:Fingerprint[]):string {
 if(!Array.isArray(fps))throw new MaatError(3,"checkpoint_shape");
 const paths=new Set<string>();
 for(const f of fps) {
  if(!f||typeof f.path!=="string"||!f.path||!/^[a-f0-9]{64}$/.test(f.sha256))throw new MaatError(3,"checkpoint_shape");
  if(paths.has(f.path))throw new MaatError(3,"checkpoint_duplicate");paths.add(f.path);
 }
 return sha256(canonical(fps.map(({path,sha256})=>({path,sha256})).sort((a,b)=>a.path.localeCompare(b.path))));
}
export function openFlow(id:string,plan:Plan,snapshot:Pick<Snapshot,'repository'|'materials'>):Flow {
 if(!/^[a-zA-Z0-9-]+$/.test(id))throw new MaatError(3,"flow_id");
 if(plan.repository.repo_id!==snapshot.repository.repo_id ||
 plan.repository.path!==snapshot.repository.path ||
 plan.fingerprints.some(p=>!snapshot.materials.some(m=>m.path===p.path&&m.sha256===p.sha256)))
  throw new MaatError(4,"open_binding_mismatch");
 return {ledger_schema:"1.0.0",flow_id:id,repository:plan.repository,plan,plan_fingerprint:plan.plan_fingerprint,
 status:"open",seq:0,seen:[],current:snapshot.materials.map(({path,sha256})=>({path,sha256})),base:snapshot.materials.map(({path,sha256})=>({path,sha256})),
 approval:null,authorizations:[],fixes:{},attempts:{},pending:null,changes:[],evaluations:[],
 meaningful_inputs:[],unknown_effects:[],last_rejection:null,resume_permit:false};
}
