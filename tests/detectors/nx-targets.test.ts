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
test("a built-in property name or a missing project file is never a declared target",()=>{
 const rows=guide.replace("| `missing-one` |","| `constructor` | built-in name |\n| `missing-one` |");
 const invocations=(s:ReturnType<typeof scan>)=>entrypointObservations(s,emptyPolicy()).filter(o=>o.detector==="policy.verify-entrypoint@1")
  .map(o=>o.facts.find(f=>f.claim==="invocation")!.status);
 expect(invocations(scan([{path:"CLAUDE.md",text:rows},project]))).toEqual(["holds","unknown","unknown"]);
 const alone=scan([{path:"AGENTS.md",text:guide}]);
 expect(detectedEntrypoints(alone).map(e=>e.manifest??null)).toEqual([null,null]);
 expect(invocations(alone)).toEqual(["unknown","unknown"]);
});
test("a template from another section or a row with extra cells declares nothing",()=>{
 const split="## Commands\n\nUse `bun nx run workspace:<target>`.\n\n## Gates\n\n| Target | Checks |\n|---|---|\n| `check-decks` | mechanical deck checks |\n";
 expect(detectedEntrypoints(scan([{path:"AGENTS.md",text:split},project]))).toEqual([]);
 const extra=guide.replace("| `missing-one` | not declared in project.json |","| `missing-one` | first | second |");
 expect(detectedEntrypoints(scan([{path:"AGENTS.md",text:extra},project])).map(e=>e.name)).toEqual(["workspace:check-decks"]);
});
test("a code-block comment is not a heading, and a shared project name checks nothing",()=>{
 const fencedGuide=guide.replace("| Target |","```sh\n# run a gate\n```\n\n| Target |");
 expect(detectedEntrypoints(scan([{path:"AGENTS.md",text:fencedGuide},project])).map(e=>e.name)).toEqual(["workspace:check-decks","workspace:missing-one"]);
 const twin={path:"apps/other/project.json",text:project.text};
 const obs=entrypointObservations(scan([{path:"AGENTS.md",text:guide},project,twin]),emptyPolicy()).filter(o=>o.detector==="policy.verify-entrypoint@1");
 expect(obs.map(o=>o.facts.find(f=>f.claim==="invocation")!.status)).toEqual(["unknown","unknown"]);
 expect(obs[0]!.limits).toContain("No unique project.json declares this Nx project; target not checked");
});
