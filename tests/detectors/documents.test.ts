import { test, expect } from "bun:test";
import { documentObservations } from "../../src/detectors/documents";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("links resolve locally, remote links stay unread, cycles are diagnosed",()=>{
 const pairs=[["AGENTS.md","[Guide](docs/guide.md#setup)\n[Remote](https://example.invalid)\n@docs/guide.md\n"],["docs/guide.md","# Setup\n@../AGENTS.md\n"]];
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],
 materials:pairs.map(([path,text])=>({path:path!,text:text!,sha256:sha256(text!)}))},emptyPolicy());
 const out=documentObservations(s);
 expect(out.flatMap(o=>o.diagnostics)).toContain("import_cycle");
 expect(out.flatMap(o=>o.facts).some(f=>f.basis.includes("resolved: docs/guide.md#setup"))).toBe(true);
 expect(out.flatMap(o=>o.limits)).toContain("External URLs are not requested");
});
