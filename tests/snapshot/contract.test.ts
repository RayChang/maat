import { test, expect } from "bun:test";
import { makeSnapshot, parseSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("snapshot excludes file text and rejects malformed digests",()=>{
 const s=makeSnapshot({root:"/repo",repo_id:"0123456789abcdef",materials:[{path:"a.md",text:"a",sha256:sha256("a")}],
 complete:false,diagnostics:["read_error: b.md"],limits:[],include:["."],exclude:[]},emptyPolicy());
 expect(parseSnapshot(JSON.stringify(s))).toEqual(s);
 expect("text" in s.materials[0]!).toBe(false);
 const changed=structuredClone(s);changed.materials[0]!.sha256="invalid";
 expect(()=>parseSnapshot(JSON.stringify(changed))).toThrow("schema_error");
 expect(()=>parseSnapshot('{"report_schema":"2.0.0"}')).toThrow();
});
