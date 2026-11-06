import { test, expect } from "bun:test";
import { attestationIssues, decisionValid } from "../../src/evidence/validate";
import { sha256,lineHashes } from "../../src/canonical";
import { versions } from "../../src/versions";
import type { Attestation } from "../../src/models";
test("valid, expired, changed, scoped, and empty user answers",()=>{
 const text="Fix login feedback.\nOnly edit the login view.\n";
 const m={path:"task.md",text,sha256:sha256(text)};
 const a:Attestation={check:"prompt.task-spec",claims:["goal"],answer:"The task explicitly requires fixing login feedback.",
 materials:[{path:m.path,sha256:m.sha256,lines:"1-1",quote:"Fix login feedback."}],
 scope:{cli:"codex"},attested_by:"ray",attested_at:"2026-11-04T00:00:00Z",
 expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{codex:"1.0.0"}};
 expect(attestationIssues(a,[m],versions,a.scope,"2026-11-04T01:00:00Z")).toEqual([]);
 expect(attestationIssues(a,[m],versions,a.scope,"2027-01-01T00:00:00Z")).toContain("expired");
 expect(attestationIssues(a,[{...m,sha256:sha256("changed")}],versions,a.scope,"2026-11-05")).toContain("fingerprint_mismatch");
 expect(attestationIssues({...a,answer:"yes"},[m],versions,a.scope,"2026-11-05")).toContain("answer_not_substantive");
 expect(attestationIssues(a,[m],versions,{workflow:"other"},"2026-11-05")).toContain("scope_mismatch");
 expect(decisionValid({reason:"Read only",owner:"ray",expires_at:"2027-01-01",},"2026-11-05")).toBe(true);
});
test("a quote must be whole lines found inside the cited range",()=>{
 const text="Goal: fix login feedback.\n  Scope: only the login view.\nDone when the error shows.\n";
 const m={path:"task.md",sha256:sha256(text),line_hashes:lineHashes(text)};
 const base:Attestation={check:"prompt.task-spec",claims:["goal"],answer:"The task names the goal and the scope.",
 materials:[{path:m.path,sha256:m.sha256,lines:"1-2",quote:"Goal: fix login feedback.\nScope: only the login view."}],
 scope:{},attested_by:"ray",attested_at:"2026-11-04T00:00:00Z",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}};
 const quote=(lines:string,q:string)=>attestationIssues({...base,materials:[{...base.materials[0]!,lines,quote:q}]},[m],versions,{},"2026-11-05");
 expect(attestationIssues(base,[m],versions,{},"2026-11-05")).toEqual([]);
 expect(quote("1-2","THIS TEXT DOES NOT EXIST")).toContain("citation_mismatch");
 expect(quote("1-1","Done when the error shows.")).toContain("citation_mismatch");
 expect(quote("1-1","fix login")).toContain("citation_mismatch");
 expect(quote("3-9","Done when the error shows.")).toContain("citation_mismatch");
 expect(attestationIssues(base,[{path:m.path,sha256:m.sha256}],versions,{},"2026-11-05")).toContain("citation_mismatch");
});
