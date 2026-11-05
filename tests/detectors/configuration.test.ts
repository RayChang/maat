import { test, expect } from "bun:test";
import { configurationObservations } from "../../src/detectors/configuration";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("formatter, lockfile, and empty tests cannot prove checks",()=>{
 const pairs=[["package.json",'{"devDependencies":{"prettier":"3"},"engines":{"bun":">=1.4.0"}}'],
 ["tests/empty.test.ts",'// test("placeholder")'],["eslint.config.js","throw Error('never run')"]];
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],
 materials:pairs.map(([path,text])=>({path:path!,text:text!,sha256:sha256(text!)}))},emptyPolicy());
 const o=configurationObservations(s);
 expect(o.flatMap(x=>x.facts).every(f=>f.signal)).toBe(true);
 expect(o.flatMap(x=>x.diagnostics)).toContain("detector_unsupported: tests.structure@1");
 expect(o.flatMap(x=>x.diagnostics)).toContain("dynamic_config: eslint.config.js");
});
