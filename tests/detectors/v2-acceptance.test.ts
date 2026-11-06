import { test, expect } from "bun:test";
import { runDetectors } from "../../src/detectors";
import { loadCatalog } from "../../src/catalog/load";
import { makeScan,makeSnapshot,parseSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
import { buildReport } from "../../src/report";
import { claudeCode } from "../../src/adapters/claude-code";
import { codex } from "../../src/adapters/codex";
import { copilot } from "../../src/adapters/copilot";
const files:Record<string,string>={
 "AGENTS.md":"# Guide\nVerification command: bun test\nVerification purpose: regression\nSee [ci](.github/workflows/ci.yml).\n",
 "CLAUDE.md":"@AGENTS.md\n",
 "package.json":JSON.stringify({scripts:{test:"bun test"},engines:{bun:">=1.4.0"}}),
 "tsconfig.json":JSON.stringify({compilerOptions:{strict:true}}),
 ".github/dependabot.yml":"version: 2\nupdates: []\n",
 ".github/workflows/ci.yml":"on: [push]\njobs:\n  test:\n    steps:\n      - run: bun test\n",
 ".claude/settings.json":JSON.stringify({permissions:{deny:["Read(./.env)"]},hooks:{
  Stop:[{hooks:[{type:"command",command:"jq -e .stop_hook_active"},{type:"command",command:"bun test"},{type:"agent",prompt:"Review the diff"}]}]}}),
 ".codex/config.toml":"approval_policy = \"on-request\"\n",
 ".github/hooks/stop.json":JSON.stringify({version:1,hooks:{agentStop:[{type:"command",bash:"bun test"}]}})};
const unsupported=["instructions.scoping@1","loop.bounds@1","loop.routing-declared@1","loop.self-declared@1",
 "loop.trigger@1","policy.human-evaluation@1","recovery.local-plan@1","tests.structure@1"];
test("v2 leaves exactly eight detectors unsupported and the repaired trigger survives snapshot and evaluation",async()=>{
 const p={...emptyPolicy(),target_clis:["claude-code","codex","copilot"]},c=await loadCatalog("catalog");
 const materials=Object.entries(files).map(([path,text])=>({path,text,sha256:sha256(text)}));
 const inventory={root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials};
 const adapters=[claudeCode(materials),codex(materials),copilot(materials)];
 const o=runDetectors(makeScan(inventory,p,adapters),p,c);
 const flagged=[...new Set(o.flatMap(x=>x.diagnostics).filter(d=>d.startsWith("detector_unsupported: ")).map(d=>d.slice(22)))].sort();
 expect(flagged).toEqual(unsupported);
 for(const d of c.detectors.map(x=>x.id).filter(id=>!unsupported.includes(id)))
  expect([d,o.some(x=>x.detector===d&&x.evidence.length>0&&x.facts.length>0)]).toEqual([d,true]);
 const snapshot=parseSnapshot(JSON.stringify(makeSnapshot(inventory,p,adapters,o)));
 const report=buildReport(snapshot,p,c,"2026-11-05T00:00:00Z");
 const wiring=report.items.find(i=>i.id==="harness.verification-wiring"&&i.scope.cli==="claude-code"&&Object.keys(i.scope).length===1)!;
 expect(wiring.claims.find(x=>x.name==="trigger")).toEqual({name:"trigger",status:"holds",basis:["static: Literal hook event Stop"]});
});
