# T11 — Recognize Codex repository surfaces and instruction shadowing

Codex instruction candidates are AGENTS.override.md then AGENTS.md in the same directory; empty files are skipped. Nested directories remain separate scopes rather than being merged into a repository-wide winner. Parse .codex/config.toml as data and retain approval_policy, sandbox_mode, and sandbox_workspace_write declarations. Other fields are recorded as unsupported syntax rather than executed. Skills are discovered in .agents/skills. Hooks/model gates remain unsupported by this v1 adapter. Sources checked 2026-11-04: [instruction order](https://learn.chatgpt.com/docs/agent-configuration/agents-md), [project configuration and trust](https://learn.chatgpt.com/docs/config-file/config-basic).

## Files

- Create: `src/adapters/codex/index.ts`.
- Modify: None.
- Test path: `tests/adapters/codex.test.ts`.

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
// T10
export declare function adapterBase(name: string, sources: string[]): AdapterResult;
// T10
export declare function observe(detector: string, materials: Material[], scope?: Scope, facts?: Fact[], limits?: string[], diagnostics?: string[]): Observation;
// T10
export declare function parseConfig(material: Material, format: 'json' | 'toml' | 'yaml'): { data: Record<string,unknown>; diagnostics: string[] };
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
```

Produces:

```ts
export declare function codex(materials: Material[]): AdapterResult;
```

## Steps

- [ ] 1. Write the failing test at `tests/adapters/codex.test.ts` with this complete content.

```ts
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
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/adapters/codex'`.

```sh
bun test tests/adapters/codex.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/adapters/codex/index.ts** (complete file)

```ts
import type { Material,AdapterResult } from "../../models";
import { adapterBase,observe,parseConfig,signal } from "../common";
import { canonical } from "../../canonical";
export function codex(materials:Material[]):AdapterResult {
 const r=adapterBase("codex",["https://learn.chatgpt.com/docs/agent-configuration/agents-md","https://learn.chatgpt.com/docs/config-file/config-basic"]);
 const scope={cli:"codex"}, candidates=materials.filter(m=>/(^|\/)AGENTS(?:\.override)?\.md$/.test(m.path));
 const dirs=[...new Set(candidates.map(m=>m.path.slice(0,m.path.lastIndexOf("/")+1)))].sort();
 for(const dir of dirs) {
  const winner=["AGENTS.override.md","AGENTS.md"].map(n=>candidates.find(m=>m.path===dir+n && m.text.trim())).find(Boolean);
  if(winner) r.observations.push(observe("instructions.precedence-model@1",[winner],scope,
   [signal("context.instruction-authority","authority",dir+" local winner: "+winner.path,scope)],
   ["Candidate directory precedence; effective cwd, fallback names, global guidance and trust unobserved"]));
 }
 const settings=materials.filter(m=>/(^|\/)\.codex\/config\.toml$/.test(m.path));
 for(const m of settings) {
  const {data,diagnostics}=parseConfig(m,"toml");
  for(const k of Object.keys(data)) if(!["approval_policy","sandbox_mode","sandbox_workspace_write"].includes(k))
   diagnostics.push("config_key_unsupported: "+k);
  const facts=["approval_policy","sandbox_mode","sandbox_workspace_write"].filter(k=>k in data)
   .map(k=>signal("adapter:codex",k,canonical(data[k]),scope));
  r.observations.push(observe("permissions.declarations@1",[m],scope,facts,
   ["Project configuration requires trust; CLI flags, user and organization overrides unknown"],diagnostics));
 }
 r.surfaces=[
 {surface:"instructions",support:"supported",reason:"Per-directory candidate order only",paths:candidates.map(m=>m.path)},
 {surface:"skills",support:"supported",reason:"Structure only",paths:materials.filter(m=>/(^|\/)\.agents\/skills\/[^/]+\/SKILL\.md$/.test(m.path)).map(m=>m.path)},
 {surface:"permissions",support:"supported",reason:"Named TOML declarations only",paths:settings.map(m=>m.path)},
 {surface:"hooks",support:"unsupported",reason:"No verified bounded hook parser in adapter 1.0.0",paths:[]},
 {surface:"runtime",support:"unknown",reason:"Trust, loading and enforcement are unobserved",paths:[]}];
 return r;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/adapters/codex.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/adapters/codex/index.ts tests/adapters/codex.test.ts
git commit -m '✨ feat(adapters): recognize Codex config and instruction precedence'
```

