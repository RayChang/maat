import { versions } from "../../src/versions";
import type { Flow,FlowEvent } from "../../src/flow/types";
import type { Plan,PlanAction } from "../../src/plan/types";
import { openFlow } from "../../src/flow/model";
import { makeSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { canonical,sha256 } from "../../src/canonical";
export function flowFixture():Flow {
 const materials=[{path:"task.md",text:"old",sha256:sha256("old")},{path:"dirty.md",text:"user work",sha256:sha256("user work")}];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},emptyPolicy());
 const fingerprints=materials.map(({path,sha256})=>({path,sha256}));
 const action:PlanAction={id:"a",check:"prompt.task-spec",scope:{},item_version:1,rule_cards:[{id:"plan-before-act",version:1}],
 template:null,current:"missing",target:"verified",kind:"modify",actions:["Fill the task contract"],target_path:"task.md",command:null,
 depends_on:[],necessity:"required",risk:"low",needs_approval:true,role_approval_required:false,
 verification:{detectors:[],expected:"Four task claims established",manual:"Confirm task content"},
 fix_conditions:{max_fixes:1},stop_conditions:["scope_change","fingerprint_drift","unknown_effect","no_progress","cancelled"]};
 const unsigned={report_schema:"1.0.0",versions:{...versions,adapters:[]},catalog_version:"0.1.0",repository:s.repository,source_report_fingerprint:sha256("source report"),
 actions:[action],fingerprints,authoritative:true,diagnostics:[]};
 const p:Plan={...unsigned,plan_fingerprint:sha256(canonical(unsigned))};
 return openFlow("fixture",p,s);
}
export function flowEvent(f:Flow,type:FlowEvent["type"],payload:unknown,id=type+"-"+f.seq):FlowEvent {
 return {id,expected_seq:f.seq,at:"2026-11-04T01:00:00Z",expires_at:"2027-01-01",type,by:"ray",payload};
}
