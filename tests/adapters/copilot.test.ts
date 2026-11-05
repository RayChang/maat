import { test, expect } from "bun:test";
import { copilot } from "../../src/adapters/copilot";
import { sha256 } from "../../src/canonical";
test("Copilot schema version and event casing remain product-specific",()=>{
 const text='{"version":1,"hooks":{"agentStop":[{"type":"command","bash":"bun test"}]}}';
 const r=copilot([{path:".github/hooks/verify.json",text,sha256:sha256(text)}]);
 expect(r.observations[0]!.facts[0]!.claim).toBe("hook:agentStop");
 const bad=text.replace('"version":1','"version":2');
 expect(copilot([{path:".github/hooks/verify.json",text:bad,sha256:sha256(bad)}])
 .observations.flatMap(x=>x.diagnostics)).toContain("hook_version_unsupported");
 expect(r.surfaces.find(x=>x.surface==="permissions")!.support).toBe("unknown");
});
