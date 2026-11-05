# T10 — Recognize Claude Code repository surfaces

DECISION (implementer default): adapters advertise repository grammar support, with verified_cli_range set to unverified because no runtime version range has been exercised. checked_at records documentation review, not a product certification. Unknown keys, global settings, trust, and runtime loading remain explicit limits. Signals never become positive semantic claims. The same material can be read once and interpreted separately by each selected adapter.

The parser reads CLAUDE.md, .claude/CLAUDE.md, .claude/skills/*/SKILL.md, .claude/settings.json, and .claude/settings.local.json within each discovered directory. Imports are analyzed separately. Settings precedence is reported as a local-over-project candidate, with user and organization overrides unknown. The bounded hook grammar is hooks[event][] with hooks[] entries of type command/prompt/agent and a string command or prompt; args and additional handler keys make command interpretation unknown. permissions allow/deny/ask string arrays are declarations. Sources checked 2026-11-04: [Claude hook locations and handler fields](https://code.claude.com/docs/en/hooks), [official settings examples](https://github.com/anthropics/claude-code/tree/main/examples/settings).

## Files

- Create: `src/adapters/common.ts`, `src/adapters/claude-code/index.ts`.
- Modify: None.
- Test path: `tests/adapters/claude-code.test.ts`.

## Interfaces

Consumes:

```ts
// T05
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
// T05
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
// T05
export declare function canonical(value: unknown): string;
// T05
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
// T05
export interface Fact { subject: string; claim: string; status: Truth; scope: Scope; basis: string; complete: boolean; signal?: boolean; }
// T05
export interface Fingerprint { path: string; sha256: string; }
// T05
export interface Material extends Fingerprint { text: string; }
// T05
export interface Observation { detector: string; version: number; scope: Scope; evidence: Evidence[]; limits: string[]; facts: Fact[]; diagnostics: string[]; }
// T05
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
// T05
export declare function sha256(value: string | Uint8Array): string;
// T05
export type Truth = "holds"|"fails"|"unknown";
```

Produces:

```ts
export declare function observe(detector: string, materials: Material[], scope?: Scope, facts?: Fact[], limits?: string[], diagnostics?: string[]): Observation;
export declare function parseConfig(material: Material, format: 'json' | 'toml' | 'yaml'): { data: Record<string,unknown>; diagnostics: string[] };
export declare function adapterBase(name: string, sources: string[]): AdapterResult;
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
export declare function claudeCode(materials: Material[]): AdapterResult;
```

## Steps

- [ ] 1. Write the failing test at `tests/adapters/claude-code.test.ts` with this complete content.

```ts
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
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/adapters/claude-code'`.

```sh
bun test tests/adapters/claude-code.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/adapters/common.ts** (complete file)

```ts
import type { Material, Fact, Scope, Observation, AdapterResult } from "../models";
export function observe(detector:string,materials:Material[],scope:Scope={},facts:Fact[]=[],limits:string[]=[],diagnostics:string[]=[]):Observation {
 return {detector,version:1,scope,evidence:materials.map(m=>({path:m.path,sha256:m.sha256,
 lines:"1-"+m.text.split("\n").length})),facts,limits,diagnostics};
}
export function signal(subject:string,claim:string,basis:string,scope:Scope={}):Fact {
 return {subject,claim,status:"unknown",scope,basis,complete:false,signal:true};
}
export function parseConfig(m:Material,format:"json"|"toml"|"yaml"):{data:Record<string,unknown>;diagnostics:string[]} {
 try {
  const data:unknown=format==="json"?JSON.parse(m.text):format==="toml"?Bun.TOML.parse(m.text):Bun.YAML.parse(m.text);
  if(!data || typeof data!=="object" || Array.isArray(data)) throw Error();
  return {data:data as Record<string,unknown>,diagnostics:[]};
 }catch{return {data:{},diagnostics:["parse_error: "+m.path]};}
}
export function adapterBase(name:string,sources:string[]):AdapterResult {
 return {name,adapter_version:"1.0.0",verified_cli_range:"unverified",checked_at:"2026-11-04",sources,
 surfaces:[],observations:[]};
}
```

**src/adapters/claude-code/index.ts** (complete file)

```ts
import type { Material, AdapterResult } from "../../models";
import { observe,parseConfig,adapterBase,signal } from "../common";
import { canonical } from "../../canonical";
export function claudeCode(materials:Material[]):AdapterResult {
 const r=adapterBase("claude-code",["https://code.claude.com/docs/en/hooks","https://github.com/anthropics/claude-code/tree/main/examples/settings"]);
 const scope={cli:"claude-code"};
 const groups:Record<string,Material[]>={
 instructions:materials.filter(m=>/(^|\/)CLAUDE\.md$/.test(m.path)),
 skills:materials.filter(m=>/(^|\/)\.claude\/skills\/[^/]+\/SKILL\.md$/.test(m.path)),
 hooks:materials.filter(m=>/(^|\/)\.claude\/settings(?:\.local)?\.json$/.test(m.path)),
 permissions:materials.filter(m=>/(^|\/)\.claude\/settings(?:\.local)?\.json$/.test(m.path))};
 for(const [surface,files] of Object.entries(groups)) r.surfaces.push({
 surface,support:"supported",paths:files.map(m=>m.path),
 reason:"Repository grammar only; local settings may override project settings; user and managed settings unobserved."});
 for(const m of groups.instructions!) r.observations.push(observe("instruction-file-found@1",[m],scope,
 [signal("context.instruction-authority","authority",m.path,scope)],["Runtime loading and conflicts unknown"]));
 for(const m of groups.hooks!) {
  const {data,diagnostics}=parseConfig(m,"json");
  const hooks=data.hooks;
  if(hooks && typeof hooks==="object" && !Array.isArray(hooks)) {
   for(const [event,entries] of Object.entries(hooks)) {
    if(!Array.isArray(entries)){diagnostics.push("hook_shape: "+event);continue;}
    for(const group of entries) {
     if(!group || !Array.isArray(group.hooks)){diagnostics.push("hook_shape: "+event);continue;}
     for(const h of group.hooks) {
      if(!h || !["command","prompt","agent"].includes(h.type)) {diagnostics.push("hook_unsupported: "+event);continue;}
      const value=h.type==="command"?h.command:h.prompt;
      if(typeof value!=="string" || Object.keys(h).some(k=>!["type","command","prompt","timeout"].includes(k)))
       {diagnostics.push("hook_dynamic: "+event);continue;}
      r.observations.push(observe(h.type==="command"?"hooks.invokes-entrypoint@1":"evaluation.model-gate@1",
       [m],scope,[signal("adapter:claude-code","hook:"+event,canonical({type:h.type,value}),scope)],
       ["Trust, actual trigger, result delivery and effectiveness unobserved"]));
     }
    }
   }
  }
  const p=data.permissions;
  if(p && typeof p==="object" && !Array.isArray(p)) for(const key of ["allow","deny","ask"]) {
   const rules=(p as Record<string,unknown>)[key];
   if(Array.isArray(rules) && rules.every(x=>typeof x==="string"))
    r.observations.push(observe("permissions.declarations@1",[m],scope,
     [signal("adapter:claude-code",key,canonical(rules),scope)],["Declared rule strings; enforcement unknown"]));
   else if(rules!==undefined) diagnostics.push("permission_shape: "+key);
  }
  if(diagnostics.length) r.observations.push(observe("permissions.declarations@1",[m],scope,[],[],diagnostics));
 }
 r.surfaces.push({surface:"runtime",support:"unknown",paths:[],reason:"No CLI launch, trust probe, user settings, or organization policy read."});
 return r;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/adapters/claude-code.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/adapters/common.ts src/adapters/claude-code/index.ts tests/adapters/claude-code.test.ts
git commit -m '✨ feat(adapters): recognize Claude Code repository declarations'
```

