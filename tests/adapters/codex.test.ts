import { test, expect } from "bun:test";
import { codex } from "../../src/adapters/codex";
import { sha256 } from "../../src/canonical";
const m=(path:string,text:string)=>({path,text,sha256:sha256(text)});
test("override shadows only its directory and no Claude hook semantics leak",()=>{
 const r=codex([m("AGENTS.md","base"),m("AGENTS.override.md","override"),m("sub/AGENTS.md","nested"),
 m(".codex/config.toml",'approval_policy = "on-request"\nsandbox_mode = "read-only"'),
 m(".claude/settings.json",'{"hooks":{"Stop":[]}}')]);
 const paths=r.observations.filter(o=>o.detector==="instructions.precedence-model@1").flatMap(o=>o.evidence.map(e=>e.path));
 expect(paths).toEqual(["AGENTS.override.md","sub/AGENTS.md"]);
 expect(r.surfaces.find(s=>s.surface==="hooks")!.support).toBe("unsupported");
 expect(r.observations.some(o=>o.detector==="hooks.invokes-entrypoint@1")).toBe(false);
});
