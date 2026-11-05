# T12 — Recognize GitHub Copilot CLI repository surfaces

Read AGENTS.md, .github/copilot-instructions.md, path-specific .github/instructions/*.instructions.md, and .agents/skills/*/SKILL.md as candidates; no effective precedence is asserted. Bounded hooks are .github/hooks/*.json with version:1 and hooks[event][] containing type:command and bash or command string. exec/args, model/HTTP handlers, inline cross-tool hooks, and additional keys remain unknown. This is an enumerated parser subset, not a statement that the product lacks those features. Sources checked 2026-11-04: [official Copilot CLI configuration](https://github.com/github/copilot-cli/blob/main/_auto%64ocs/configuration.md), [CLI hook schema](https://docs.github.com/en/copilot/reference/hooks-reference).

## Files

- Create: `src/adapters/copilot/index.ts`.
- Modify: None.
- Test path: `tests/adapters/copilot.test.ts`.

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
export declare function copilot(materials: Material[]): AdapterResult;
```

## Steps

- [ ] 1. Write the failing test at `tests/adapters/copilot.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { copilot } from "../../src/adapters/copilot";
import { sha256 } from "../../src/canonical";
test("Copilot schema version and event casing remain product-specific",()=>{
 const text='{"version":1,"hooks":{"agentStop":[{"type":"command","bash":"bun test"}]}}';
 const r=copilot([{path:".github/hooks/verify.json",text,sha256:sha256(text)}]);
 expect(r.observations[0]!.facts[0]!.claim).toBe("hook:agentStop");
 const bad=text.replace('"version":1','"version":2');
 expect(copilot([{path:".github/hooks/verify.json",text:bad,sha256:sha256(bad)}])
 .observations.flatMap(x=>x.diagnostics)).toContain("hook_version_unsupported");
 expect(r.surfaces.find(x=>x.surface==="permissions")!.support).toBe("unknown");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/adapters/copilot'`.

```sh
bun test tests/adapters/copilot.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/adapters/copilot/index.ts** (complete file)

```ts
import type { Material,AdapterResult } from "../../models";
import { adapterBase,observe,parseConfig,signal } from "../common";
import { canonical } from "../../canonical";
export function copilot(materials:Material[]):AdapterResult {
 const r=adapterBase("copilot",["https://github.com/github/copilot-cli/blob/main/_auto%64ocs/configuration.md","https://docs.github.com/en/copilot/reference/hooks-reference"]);
 const scope={cli:"copilot"};
 const instructions=materials.filter(m=>/(^|\/)AGENTS\.md$/.test(m.path)||m.path===".github/copilot-instructions.md"||/^\.github\/instructions\/.+\.instructions\.md$/.test(m.path));
 const hooks=materials.filter(m=>/^\.github\/hooks\/[^/]+\.json$/.test(m.path));
 for(const m of instructions) r.observations.push(observe("instruction-file-found@1",[m],scope,
 [signal("context.instruction-authority","authority",m.path,scope)],["Custom agent opt-in, precedence and runtime loading unknown"]));
 for(const m of hooks) {
  const {data,diagnostics}=parseConfig(m,"json");
  if(data.version!==1) diagnostics.push("hook_version_unsupported");
  else if(data.hooks && typeof data.hooks==="object" && !Array.isArray(data.hooks)) {
   for(const [event,entries] of Object.entries(data.hooks)) {
    if(!Array.isArray(entries)){diagnostics.push("hook_shape: "+event);continue;}
    for(const h of entries) {
     if(!h || h.type!=="command" || Object.keys(h).some(k=>!["type","bash","command","timeoutSec"].includes(k)) ||
       typeof (h.bash??h.command)!=="string"){diagnostics.push("hook_unsupported: "+event);continue;}
     r.observations.push(observe("hooks.invokes-entrypoint@1",[m],scope,
      [signal("adapter:copilot","hook:"+event,canonical({type:"command",value:h.bash??h.command}),scope)],
      ["Shell text is data; loading, trust, invocation and outcome unobserved"]));
    }
   }
  } else diagnostics.push("hook_shape");
  if(diagnostics.length) r.observations.push(observe("hooks.invokes-entrypoint@1",[m],scope,[],[],diagnostics));
 }
 r.surfaces=[
 {surface:"instructions",support:"supported",reason:"Candidate files only",paths:instructions.map(m=>m.path)},
 {surface:"skills",support:"supported",reason:"Structure only",paths:materials.filter(m=>/^\.agents\/skills\/[^/]+\/SKILL\.md$/.test(m.path)).map(m=>m.path)},
 {surface:"hooks",support:"supported",reason:"Version 1 literal command handlers only",paths:hooks.map(m=>m.path)},
 {surface:"permissions",support:"unknown",reason:"Effective permissions are not inferred from repository files",paths:[]},
 {surface:"runtime",support:"unknown",reason:"No CLI session or external policy observation",paths:[]}];
 return r;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/adapters/copilot.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/adapters/copilot/index.ts tests/adapters/copilot.test.ts
git commit -m '✨ feat(adapters): recognize Copilot CLI instructions and hook declarations'
```

