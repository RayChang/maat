import { test,expect } from "bun:test";
import { detectedEntrypoints,entrypointObservations } from "../../src/detectors/entrypoints";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
const guide="## NX Commands\n\nWorkspace gates, all under `bun nx run workspace:<target>`:\n\n| Target | Checks |\n|---|---|\n| `check-decks` | mechanical deck checks |\n| `missing-one` | not declared in project.json |\n";
const scan=(files:{path:string;text:string}[])=>makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],
 materials:files.map(m=>({...m,sha256:sha256(m.text)}))},emptyPolicy());
const project={path:"tools/workspace/project.json",text:"{\"name\":\"workspace\",\"targets\":{\"check-decks\":{\"executor\":\"nx:run-commands\"}}}\n"};
test("an Nx target table in AGENTS.md declares verification entrypoints",()=>{
 const s=scan([{path:"AGENTS.md",text:guide},project]);
 expect(detectedEntrypoints(s).map(e=>[e.name,e.command,e.purpose,e.manifest??null])).toEqual([
  ["workspace:check-decks","bun nx run workspace:check-decks","mechanical deck checks","tools/workspace/project.json"],
  ["workspace:missing-one","bun nx run workspace:missing-one","not declared in project.json","tools/workspace/project.json"]]);
 expect(entrypointObservations(s,emptyPolicy()).filter(o=>o.detector==="policy.verify-entrypoint@1")
  .map(o=>o.facts.find(f=>f.claim==="invocation")!.status)).toEqual(["holds","unknown"]);
});
test("the table form is read only from AGENTS.md or CLAUDE.md with exactly one template",()=>{
 expect(detectedEntrypoints(scan([{path:"docs/notes.md",text:guide},project]))).toEqual([]);
 const two=guide.replace("Workspace gates","Use `nx run other:<target>` or");
 expect(detectedEntrypoints(scan([{path:"AGENTS.md",text:two},project]))).toEqual([]);
});
