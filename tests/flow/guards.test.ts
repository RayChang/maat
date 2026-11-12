import { fingerprintSet } from "../../src/flow/model";
import { test, expect } from "bun:test";
import { executionGuard,eventGuard,approvalGuard,actionGuard } from "../../src/flow/guards";
import type { Flow,ExecutionSpec,FlowEvent } from "../../src/flow/types";
import { canonical,sha256 } from "../../src/canonical";
import { versions } from "../../src/versions";
test("authorization pins current inputs and plan content is recomputed",()=>{
 const input={path:"task.md",sha256:sha256("old")};
 const execution:ExecutionSpec={action:"a",command:"bun test",script:null,inputs:[input],cwd:"/r",permissions:["read"],effects:[]};
 const unsigned={report_schema:"1.0.0",versions,catalog_version:"0.1.0",repository:{path:"/r",repo_id:"0".repeat(16)},
 source_report_fingerprint:sha256("report"),actions:[],fingerprints:[input],authoritative:true,diagnostics:[]};
 const fingerprint=sha256(canonical(unsigned));
 const f={seq:3,seen:["old"],current:[input],authorizations:[],plan_fingerprint:fingerprint,
 plan:{...unsigned,plan_fingerprint:fingerprint}} as unknown as Flow;
 expect(executionGuard(f,execution,"2026-11-04")).toBe("execution_not_authorized");
 const event:FlowEvent={id:"old",expected_seq:3,at:"2026-11-04",expires_at:"2027-01-01",type:"accept",by:"ray",payload:{}};
 expect(eventGuard(f,event)).toBe("duplicate_event");
 expect(eventGuard(f,{...event,id:"new",expires_at:"2026-01-01"})).toBe("expired_event");
 f.authorizations=[{execution,expires_at:"2027-01-01",by:"ray",source:"user"}];
 expect(executionGuard(f,execution,"2026-11-04")).toBeNull();
 expect(executionGuard(f,{...execution,effects:["network"]},"2026-11-04")).toBe("execution_not_authorized");
 f.current=[{...input,sha256:sha256("new")}];
 expect(executionGuard(f,execution,"2026-11-04")).toBe("execution_inputs_changed");
 expect(eventGuard(f,{...event,id:"new"})).toBeNull();
 f.plan.authoritative=false;
 expect(eventGuard(f,{...event,id:"new"})).toBe("plan_changed");
});
import type { Approval } from "../../src/flow/types";
import type { PlanAction } from "../../src/plan/types";
function guardFixture():{flow:Flow;action:PlanAction;approval:Approval} {
 const current=[{path:"task.md",sha256:sha256("current")}];
 const action:PlanAction={id:"a",check:"prompt.task-spec",scope:{},item_version:1,rule_cards:[],template:null,
 current:"unknown",target:"verified",kind:"modify",actions:["Update task"],target_path:"task.md",command:null,
 depends_on:[],necessity:"required",risk:"low",needs_approval:true,role_approval_required:true,
 verification:{detectors:[],expected:"Confirmed task contract",manual:"Review task"},
 fix_conditions:{max_fixes:0},stop_conditions:["scope_change"]};
 const unsigned={report_schema:"1.0.0",versions,catalog_version:"0.1.0",repository:{path:"/r",repo_id:"0".repeat(16)},
 source_report_fingerprint:sha256("report"),actions:[action],fingerprints:current,authoritative:true,diagnostics:[]};
 const plan={...unsigned,plan_fingerprint:sha256(canonical(unsigned))};
 const flow:Flow={ledger_schema:"1.0.0",flow_id:"fixture",repository:plan.repository,plan,plan_fingerprint:plan.plan_fingerprint,
 status:"open",seq:0,seen:[],current,base:current,approval:null,authorizations:[],fixes:{},attempts:{},pending:null,
 changes:[],evaluations:[],meaningful_inputs:[],unknown_effects:[],last_rejection:null,resume_permit:false};
 const approval:Approval={plan_fingerprint:plan.plan_fingerprint,base_fingerprint:fingerprintSet(current),actions:["a"],
 paths:["task.md"],mode:"plan",candidate_fingerprint:null,max_fixes:{a:0},role_approvals:[],expires_at:"2027-01-01",by:"ray",source:"user"};
 return {flow,action,approval};
}
test("approval guard requires the bound base and required role approval",()=>{
 const {flow,approval}=guardFixture();
 expect(approvalGuard(flow,approval,"2026-11-04")).toBe("role_approval_missing");
 approval.role_approvals=[{check:"prompt.task-spec",by:null as unknown as string}];
 expect(approvalGuard(flow,approval,"2026-11-04")).toBe("role_approval_missing");
 approval.role_approvals=[{check:"prompt.task-spec",by:"reviewer"}];
 expect(approvalGuard(flow,approval,"2026-11-04")).toBeNull();
 expect(approvalGuard(flow,{...approval,base_fingerprint:sha256("stale")},"2026-11-04")).toBe("approval_binding_mismatch");
});
test("action guard refuses uncovered actions and accepts a covered current action",()=>{
 const {flow,action,approval}=guardFixture();
 expect(actionGuard(flow,action,"2026-11-04")).toBe("approval_expired_or_missing");
 flow.approval={...approval,role_approvals:[{check:action.check,by:"reviewer"}]};
 expect(actionGuard(flow,action,"2026-11-04")).toBeNull();
 flow.approval.actions=[];
 expect(actionGuard(flow,action,"2026-11-04")).toBe("action_not_approved");
});
