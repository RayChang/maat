import { test, expect } from "bun:test";
import { parsePolicy, emptyPolicy, loadPolicy, policySkeleton } from "../../src/policy/load";
test("absence is allowed only for the default path; choices stay unknown",async()=>{
 const p=parsePolicy("policy_schema: 1.0.0\ncatalog_version: 0.1.0\ntarget_clis: [codex]\n","0.1.0");
 expect(p.target_clis).toEqual(["codex"]); expect(p.applicability).toEqual({});
 expect(parsePolicy(policySkeleton(),"0.1.0")).toEqual(emptyPolicy());
 expect((await loadPolicy("/maat-test-path-does-not-exist","0.1.0",true)).diagnostics).toEqual(["policy_missing"]);
 await expect(loadPolicy("/maat-test-path-does-not-exist","0.1.0")).rejects.toThrow("policy_read");
 for(const text of ["[]","policy_schema: 2.0.0\ncatalog_version: 0.1.0",
   "policy_schema: 1.0.0\ncatalog_version: 1.0.0",
   "policy_schema: 1.0.0\ncatalog_version: 0.1.0\ntarget_clis: [ide]",
   "policy_schema: 1.0.0\ncatalog_version: 0.1.0\nsurprise: true"])
   expect(()=>parsePolicy(text,"0.1.0")).toThrow();
});
