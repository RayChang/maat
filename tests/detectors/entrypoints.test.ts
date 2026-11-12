import { test,expect } from "bun:test";
import { entrypointObservations,detectedEntrypoints } from "../../src/detectors/entrypoints";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("documented command binds to a real script without proving execution",()=>{
 const p=emptyPolicy(),materials=[
 {path:"AGENTS.md",text:"Verification command: bun run verify\nVerification purpose: regression\n"},
 {path:"package.json",text:'{"scripts":{"verify":"missing-executable"}}'}
 ].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 expect(detectedEntrypoints(s)[0]!.command).toBe("bun run verify");
 expect(entrypointObservations(s,p).flatMap(o=>o.facts).find(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="invocation")!.status).toBe("holds");
 s.materials[1]!.text='{"scripts":{}}';s.materials[1]!.sha256=sha256(s.materials[1]!.text);
 expect(entrypointObservations(s,p).flatMap(o=>o.facts).find(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="invocation")!.status).toBe("fails");
});
test("a Task | Command table in AGENTS.md declares the verification rows",()=>{
 const p=emptyPolicy(),table=["## Build & Run","","| Task | Command |","| ---- | ------- |","| Dev server | `bun run dev` |",
  "| Build | `bun run build` (see pitfall #27) |","| Format | `bun run format` |","| Test (unit) | `bun run test:unit` |","| Type check | `bun vitest typecheck` |",""].join("\n");
 const materials=[{path:"AGENTS.md",text:table},{path:"package.json",text:'{"scripts":{"dev":"next dev","build":"next build","format":"prettier -w ."}}'}]
  .map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 expect(detectedEntrypoints(s).map(e=>[e.name,e.purpose,e.command])).toEqual([["build","Build","bun run build"],
  ["test:unit","Test (unit)","bun run test:unit"],["bun vitest typecheck","Type check","bun vitest typecheck"]]);
 expect(entrypointObservations(s,p).flatMap(o=>o.facts).filter(f=>f.subject==="verify.entrypoint-declared@1"&&f.claim==="invocation").map(f=>f.status))
  .toEqual(["holds","fails","holds"]);
});
test("a Task | Command table reads plural purposes and skips tables inside code fences",()=>{
 const p=emptyPolicy(),text=["| Task | Command |","| --- | --- |","| Unit tests | `bun run test:unit` |","| Builds | `bun run build` |","",
  "```md","| Task | Command |","| --- | --- |","| Example tests | `bun run example` |","```",""].join("\n");
 const materials=[{path:"CLAUDE.md",text}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 expect(detectedEntrypoints(s).map(e=>[e.purpose,e.command])).toEqual([["Unit tests","bun run test:unit"],["Builds","bun run build"]]);
});
