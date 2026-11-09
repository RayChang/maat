import { test,expect } from "bun:test";
import { reduceCore } from "../../src/flow/core";
import { flowFixture,flowEvent } from "../helpers/flow";
import { fingerprintSet } from "../../src/flow/model";
import { type Flow,type EvaluationRecord } from "../../src/flow/types";
import { sha256,canonical } from "../../src/canonical";
import { reduceFlow,evaluationFingerprint } from "../../src/flow/reducer";
import { buildReport } from "../../src/report";
import { makeSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { loadCatalog } from "../../src/catalog/load";
test("expected edit advances current while unrelated dirty work is preserved",()=>{
 let f=flowFixture();
 f=reduceCore(f,flowEvent(f,"approve",{plan_fingerprint:f.plan_fingerprint,base_fingerprint:fingerprintSet(f.current),
 actions:["a"],paths:["task.md"],mode:"plan",candidate_fingerprint:null,max_fixes:{a:1},role_approvals:[],
 expires_at:"2027-01-01",by:"ray",source:"user"})) as Flow;
 f=reduceCore(f,flowEvent(f,"before",{action:"a",fingerprints:f.current})) as Flow;
 const after=f.current.map(x=>x.path==="task.md"?{...x,sha256:sha256("new")}:x);
 expect(reduceCore(f,flowEvent(f,"after",{action:"a",fingerprints:[...after,{path:"unrelated.md",sha256:sha256("changed")}]})))
 .toBe("checkpoint_scope_violation");
 f=reduceCore(f,flowEvent(f,"after",{action:"a",fingerprints:after})) as Flow;
 f=reduceCore(f,flowEvent(f,"change",{action:"a",candidate_fingerprint:fingerprintSet(after),paths:["task.md"],
 executed_by:"host",source:"user session",unknown_effects:[]})) as Flow;
 expect(f.current).toEqual(after);
 expect(f.current.find(x=>x.path==="dirty.md")!.sha256).toBe(sha256("user work"));
 expect(f.approval).not.toBeNull();
 expect(f.attempts.a).toBe(1);
});
test("reconciliation never adopts an edit made outside a checkpoint",()=>{
 const f=flowFixture();f.status="stopped";
 const edited=f.current.map(x=>x.path==="task.md"?{...x,sha256:sha256("bypass")}:x);
 expect(reduceCore(f,flowEvent(f,"after",{action:"a",fingerprints:edited,reconcile:true,unknown_effects:[]}))).toBe("checkpoint_drift");
 expect(f.current).not.toEqual(edited);
 const unchanged=reduceCore(f,flowEvent(f,"after",{action:"a",fingerprints:f.current,reconcile:true,unknown_effects:[]})) as Flow;
 expect(unchanged.current).toEqual(f.current);expect(unchanged.approval).toBeNull();
});
function approve(f:Flow):Flow {
 return reduceFlow(f,flowEvent(f,"approve",{plan_fingerprint:f.plan_fingerprint,
 base_fingerprint:fingerprintSet(f.current),actions:["a"],paths:f.plan.actions[0]!.kind==="ask"?[]:["task.md"],mode:"plan",
 candidate_fingerprint:null,max_fixes:{a:1},role_approvals:[],expires_at:"2027-01-01",by:"ray",source:"user"})).flow;
}
async function passRecord(f:Flow):Promise<EvaluationRecord> {
 const p=emptyPolicy(),materials=[{path:"task.md",text:"old",sha256:sha256("old")},{path:"dirty.md",text:"user work",sha256:sha256("user work")}];
 p.applicability["prompt.task-spec"]={status:"applicable"};p.targets["prompt.task-spec"]={baseline:true};
 p.attestations=[{check:"prompt.task-spec",claims:["goal","scope","constraints","acceptance"],
 answer:"The quoted representative task was reviewed for all four agreed task contract fields.",
 materials:[{path:"task.md",sha256:sha256("old"),lines:"1-1",quote:"old"}],scope:{},attested_by:"ray",
 attested_at:"2026-11-04T00:00:00Z",expires_at:"2026-12-01",catalog_version:"0.1.0",adapter_version:{}}];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const report=buildReport(s,p,await loadCatalog("catalog"),"2026-11-04T01:00:00Z","provided");
 return {action:"a",candidate_fingerprint:fingerprintSet(f.current),method:{kind:"manual",id:"review",version:"1"},
 result:"pass",report,execution:null,evidence:f.current,by:"ray",source:"user review",unknown_effects:[]};
}
test("each non-pass evaluation is recorded but cannot be accepted",async()=>{
 for(const result of ["fail","unknown","error","timeout","cancel"] as const) {
  let f=approve(flowFixture());const record={...await passRecord(f),result,report:null};
  const recorded=reduceFlow(f,flowEvent(f,"evaluation",record));
  expect(recorded.accepted).toBe(true);expect(recorded.flow.status).toBe("evaluated");f=recorded.flow;
  expect(reduceFlow(f,flowEvent(f,"accept",{}))).toMatchObject({reason:"target_not_verified",detail:"a: latest evaluation is not a pass with a report and no unknown effects"});
  expect(evaluationFingerprint(record)).toBe(evaluationFingerprint({...record,by:"rewritten agent"}));
 }
});
test("clarification resolves through evidence; expiry is checked at acceptance",async()=>{
 let f=flowFixture();f.plan.actions[0]!.kind="ask";
 const {plan_fingerprint,...unsigned}=f.plan;f.plan_fingerprint=f.plan.plan_fingerprint=sha256(canonical(unsigned));
 f=approve(f);
 expect(reduceFlow(f,flowEvent(f,"before",{action:"a",fingerprints:f.current})).reason).toBe("clarification_only");
 const record=await passRecord(f);
 const command={...record,method:{kind:"command" as const,id:"bun test",version:"1"},
 execution:{action:"a",command:"bun test",script:null,inputs:f.current,cwd:f.repository.path,permissions:["read"],effects:[]}};
 expect(reduceFlow(f,flowEvent(f,"evaluation",command)).reason).toBe("clarification_only");
 f=reduceFlow(f,flowEvent(f,"evaluation",record)).flow;
 expect(reduceFlow(f,flowEvent(f,"accept",{})).accepted).toBe(true);
 expect(reduceFlow(f,{...flowEvent(f,"accept",{}),at:"2026-12-02T00:00:00Z"}).reason).toBe("evidence_expired");
});
test("rejections persist, malformed payloads do not allocate sequence, and counts survive resume",()=>{
 let f=approve(flowFixture());f.attempts.a=1;f.fixes.a=1;
 expect(()=>reduceFlow(f,flowEvent(f,"before",{action:"a",fingerprints:[{path:"task.md",sha256:"bad"}]}))).toThrow("checkpoint_shape");
 expect(f.seq).toBe(1);
 f=reduceFlow(f,flowEvent(f,"stop",{},"stop-id")).flow;
 expect(reduceFlow(f,flowEvent(f,"stop",{},"stop-id")).reason).toBe("duplicate_event");
 const resumed=reduceFlow(f,flowEvent(f,"resume",{}));
 expect(resumed.accepted).toBe(true);expect(resumed.flow.fixes.a).toBe(1);expect(resumed.flow.attempts.a).toBe(1);
});
test("rewriting an evaluation does not count as new relevant input",async()=>{
 let f=approve(flowFixture());const record=await passRecord(f);
 f=reduceFlow(f,flowEvent(f,"evaluation",record)).flow;
 expect(reduceFlow(f,flowEvent(f,"evaluation",{...record,by:"another agent",source:"reworded"})).reason).toBe("no_new_input");
});
test("authorized command changes are limited to the exact approved file set",()=>{
 let f=flowFixture(),action=f.plan.actions[0]!;
 action.kind="command";action.command="npx skills add owner/repo --skill verify-before-done -a codex";action.target_path=null;
 const {plan_fingerprint,...unsigned}=f.plan;f.plan_fingerprint=f.plan.plan_fingerprint=sha256(canonical(unsigned));
 const installed=".agents/skills/verify-before-done/SKILL.md";
 f=reduceFlow(f,flowEvent(f,"approve",{plan_fingerprint:f.plan_fingerprint,base_fingerprint:fingerprintSet(f.current),
 actions:["a"],paths:[installed],mode:"plan",candidate_fingerprint:null,max_fixes:{a:0},role_approvals:[],
 expires_at:"2027-01-01",by:"ray",source:"user"})).flow;
 const execution={action:"a",command:action.command,script:null,inputs:f.current,cwd:"/r",
 permissions:["write approved skill file"],effects:["install one skill"]};
 f=reduceFlow(f,flowEvent(f,"authorize",{execution,expires_at:"2027-01-01",by:"ray",source:"user"})).flow;
 f=reduceFlow(f,flowEvent(f,"before",{action:"a",fingerprints:f.current,execution})).flow;
 const after=[...f.current,{path:installed,sha256:sha256("skill body")}];
 expect(reduceFlow(f,flowEvent(f,"after",{action:"a",fingerprints:after})).accepted).toBe(true);
 expect(reduceFlow(f,flowEvent(f,"after",{action:"a",fingerprints:[...after,{path:"unapproved",sha256:sha256("extra")}]})).reason).toBe("checkpoint_scope_violation");
});
test("a rejected accept names the action and the invalid policy of its latest report",async()=>{
 let f=approve(flowFixture());const record=await passRecord(f);
 const report={...record.report!,policy:{...record.report!.policy,valid:false,diagnostics:["fingerprint_mismatch"]}};
 f=reduceFlow(f,flowEvent(f,"evaluation",{...record,report})).flow;
 expect(reduceFlow(f,flowEvent(f,"accept",{}))).toMatchObject({reason:"non_authoritative_report",detail:"a: latest evaluation report has an invalid policy: fingerprint_mismatch"});
});
