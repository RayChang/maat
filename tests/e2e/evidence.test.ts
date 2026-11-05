import { test, expect } from "bun:test";
import { main } from "../../src/cli/main";
import type { Report,ItemStatus } from "../../src/models";
const now="2026-11-04T12:00:00Z";
async function scan(name:string):Promise<Report> {
 const args=["scan","tests/fixtures/"+name,"--json"];
 if(name==="agent-only")args.push("--evidence","tests/fixtures/agent-only/agent.evidence.yaml");
 const result=await main(args,now);
 if(result.code!==0)throw Error("fixture_scan_failed: "+name+": "+result.stderr);
 expect(result.code).toBe(0);return JSON.parse(result.stdout);
}
test("positive negative unknown non-applicable partial and stale evidence",async()=>{
 const cases:Record<string,ItemStatus>={positive:"verified",negative:"missing",unknown:"unknown",
 "not-applicable":"not_applicable",partial:"partial","empty-template":"unknown","agent-only":"unknown",
 "expired-evidence":"unknown","dependency-change":"unknown","version-change":"unknown"};
 for(const [fixture,result] of Object.entries(cases))
  expect((await scan(fixture)).items.find(i=>i.id===(fixture==="negative"?"foundation.verify-entrypoints":"prompt.task-spec"))!.result).toBe(result);
});
test("user confirmation cannot override a conflicting manifest binding",async()=>{
 const r=await scan("user-machine-conflict");
 const cap=r.capabilities.find(c=>c.id==="verify.entrypoint-declared@1")!;
 expect(cap.status).toBe("unknown");expect(cap.basis).toContain("evidence_conflict");
});
test("configured invocation remains distinct from an actual evaluation run",async()=>{
 const r=await scan("configured-not-effective");
 expect(r.items.find(i=>i.id==="foundation.ci-verification")!.result).toBe("verified");
 expect(r.capabilities.find(c=>c.id==="evaluation.run-recorded@1")!.status).toBe("unknown");
});
test("all CLI adapters retain separate scopes and limits",async()=>{
 const r=await scan("three-clis");
 expect(r.adapters.map(a=>a.name)).toEqual(["claude-code","codex","copilot"]);
 expect(r.adapters.every(a=>a.surfaces.some(s=>s.surface==="runtime"&&s.support==="unknown"))).toBe(true);
});
test("overridden draft catalog never yields authoritative layers",async()=>{
 const r=await main(["scan","tests/fixtures/positive","--catalog","tests/fixtures/unapproved-catalog/catalog","--json"],now);
 expect(r.code).toBe(0);const report=JSON.parse(r.stdout) as Report;
 expect(report.layers.every(l=>!l.authoritative)).toBe(true);
 expect(report.diagnostics).toContain("policy_unapproved");
});
test("explicit user evidence arrives independently of the project policy",async()=>{
 const run=await main(["scan","tests/fixtures/agent-only","--evidence",
 "tests/fixtures/external-evidence/confirmation.evidence.yaml","--json"],now);
 expect(run.code).toBe(0);
 expect((JSON.parse(run.stdout) as Report).items.find(i=>i.id==="prompt.task-spec")!.result).toBe("verified");
});
