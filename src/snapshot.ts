import type { Snapshot, ScanData, Policy, AdapterResult, Observation } from "./models";
import type { Inventory } from "./discovery/inventory";
import { versions } from "./versions";
import { sha256,lineHashes } from "./canonical";
import { MaatError } from "./errors";
import { checkShape } from "./schema";
export function makeScan(i:Inventory,p:Policy,adapters:AdapterResult[]=[],observations:Observation[]=[]):ScanData {
 return {report_schema:versions.report_schema,versions:structuredClone(versions),
 repository:{path:i.root,repo_id:i.repo_id},
 scope:{include:i.include,exclude:i.exclude,limits:i.limits,diagnostics:i.diagnostics,complete:i.complete},
 target_clis:p.target_clis,materials:i.materials,adapters,observations};
}
export function makeSnapshot(i:Inventory,p:Policy,adapters:AdapterResult[]=[],observations:Observation[]=[]):Snapshot {
 const s=makeScan(i,p,adapters,observations);return {...s,materials:s.materials.map(({path,sha256,text})=>({path,sha256,line_hashes:lineHashes(text)}))};
}
export function parseSnapshot(text:string):Snapshot {
 let data:unknown;
 try{data=JSON.parse(text);}catch{throw new MaatError(3,"snapshot_parse");}
 checkShape(data,{"type":"object","required":["report_schema","versions","repository","scope","target_clis","materials","adapters","observations"],"properties":{"report_schema":{"type":"string","pattern":"^1\\."},"versions":{"type":"object","required":["tool_version","catalog_version","report_schema","policy_schema","ledger_schema","adapters"],"properties":{"tool_version":{"type":"string"},"catalog_version":{"type":"string"},"report_schema":{"type":"string"},"policy_schema":{"type":"string"},"ledger_schema":{"type":"string"},"adapters":{"type":"array","items":{"type":"object","required":["name","adapter_version","verified_cli_range","checked_at"],"properties":{"name":{"type":"string"},"adapter_version":{"type":"string"},"verified_cli_range":{"type":"string"},"checked_at":{"type":"string"}}}}}},"repository":{"type":"object","required":["path","repo_id"],"properties":{"path":{"type":"string"},"repo_id":{"type":"string","pattern":"^[a-f0-9]{16}$"}}},"scope":{"type":"object"},"target_clis":{"type":"array"},"materials":{"type":"array","items":{"type":"object","required":["path","sha256"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"line_hashes":{"type":"string","pattern":"^([a-f0-9]{8})*$"}}}},"adapters":{"type":"array"},"observations":{"type":"array","items":{"type":"object","required":["detector","version","scope","evidence","limits","facts","diagnostics"],"properties":{"detector":{"type":"string"},"version":{"type":"number"},"scope":{"type":"object"},"evidence":{"type":"array","items":{"type":"object","required":["path","sha256","lines"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"lines":{"type":"string","pattern":"^[1-9][0-9]*-[1-9][0-9]*$"},"quote":{"type":"string"}}}},"limits":{"type":"array"},"facts":{"type":"array","items":{"type":"object","required":["subject","claim","status","scope","basis","complete"],"properties":{"subject":{"type":"string"},"claim":{"type":"string"},"status":{"enum":["holds","fails","unknown"]},"scope":{"type":"object"},"basis":{"type":"string"},"complete":{"type":"boolean"}}}},"diagnostics":{"type":"array"}}}}}});
 const s=data as Snapshot, paths=new Set<string>();
 for(const m of s.materials) {
  if(paths.has(m.path)||!/^[a-f0-9]{64}$/.test(m.sha256)) throw new MaatError(3,"schema_error");
  paths.add(m.path);
 }
 for(const o of s.observations) {
  if(!o || !Array.isArray(o.evidence)||!Array.isArray(o.facts)||!Array.isArray(o.limits)) throw new MaatError(3,"observation_shape");
  for(const e of o.evidence) if(!s.materials.some(m=>m.path===e.path&&m.sha256===e.sha256))
   throw new MaatError(3,"observation_fingerprint");
 }
 return s;
}
