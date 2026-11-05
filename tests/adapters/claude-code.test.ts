import { test,expect } from "bun:test";
import { observe,parseConfig,signal,adapterBase } from "../../src/adapters/common";
import { claudeCode } from "../../src/adapters/claude-code";
import { sha256 } from "../../src/canonical";
test("malformed settings preserve unknown and signal-only observations",()=>{
 const m={path:".claude/settings.json",text:"{",sha256:"a".repeat(64)};
 expect(parseConfig(m,"json").diagnostics).toEqual(["parse_error: .claude/settings.json"]);
 const o=observe("instruction-file-found@1",[m],{cli:"codex"},[signal("x","file","present")]);
 expect(o.facts[0]!.signal).toBe(true);
 expect(o.evidence[0]!.lines).toBe("1-1");
 expect(adapterBase("codex",[]).verified_cli_range).toBe("unverified");
});
test("Claude hooks are inert declarations and local overrides remain visible",()=>{
 const text=JSON.stringify({hooks:{Stop:[{hooks:[{type:"command",command:"touch MUST_NOT_EXIST"}]}]},permissions:{deny:["Edit(tests/**)"]}});
 const r=claudeCode([{path:".claude/settings.json",text,sha256:sha256(text)},
 {path:"CLAUDE.md",text:"@AGENTS.md",sha256:sha256("@AGENTS.md")}]);
 expect(r.surfaces.map(x=>x.surface)).toEqual(["instructions","skills","hooks","permissions","runtime"]);
 expect(r.observations.some(x=>x.detector==="hooks.invokes-entrypoint@1")).toBe(true);
 expect(r.observations.flatMap(x=>x.facts).every(x=>x.signal)).toBe(true);
 expect(r.surfaces.find(x=>x.surface==="runtime")!.support).toBe("unknown");
});
