# T16 — Observe bounded analysis, environment, and security configurations

Supported bounded sources are JSON package manifests, JSON tsconfig without executable extensions, and Dependabot YAML update declarations. tsconfig strict is a structural signal, not proof of an analysis entrypoint or correctness. A formatter dependency cannot establish static analysis. Dynamic JS/TS lint configs and unrecognized test syntax return detector_unsupported. The test-case parser is intentionally unsupported in adapter-independent v1; native and external test evidence still have the human route.

## Files

- Create: `src/detectors/configuration.ts`.
- Modify: None.
- Test path: `tests/detectors/configuration.test.ts`.

## Interfaces

Consumes:

```ts
// T01
export declare const versions: Versions;
// T01
export interface Versions {
  tool_version: string; report_schema: string; policy_schema: string;
  ledger_schema: string;
  catalog_version: string;
  adapters: { name: string; adapter_version: string; verified_cli_range: string; checked_at: string }[];
}
// T05
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
// T05
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
// T05
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
// T05
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
// T05
export declare function canonical(value: unknown): string;
// T05
export interface Decision { status: "applicable"|"not_applicable"|"unknown"; reason?: string; owner?: string; expires_at?: string; loops?: {id:string;kind:"execution-feedback"|"event-driven"|"cross-run-improvement";scope:string}[]; }
// T05
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; document?:string; }
// T05
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
// T05
export interface Fact { subject: string; claim: string; status: Truth; scope: Scope; basis: string; complete: boolean; signal?: boolean; }
// T05
export interface Fingerprint { path: string; sha256: string; }
// T05
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
// T05
export interface Material extends Fingerprint { text: string; }
// T05
export interface Observation { detector: string; version: number; scope: Scope; evidence: Evidence[]; limits: string[]; facts: Fact[]; diagnostics: string[]; }
// T05
export interface Policy {
 policy_schema:string; catalog_version:string; target_clis:string[];
 scope:{include:string[];exclude:string[]};
 applicability:Record<string,Decision>;
 targets:Record<string,{baseline?:boolean}>;
 exemptions:{check:string;reason:string;owner:string;expires_at:string;fingerprints:Fingerprint[];scope?:Scope}[];
 attestations:Attestation[];
}
// T05
export type ScanData = Omit<Snapshot,"materials"> & { materials:Material[] };
// T05
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
// T05
export declare function sha256(value: string | Uint8Array): string;
// T05
export interface Snapshot {
 report_schema:string; versions:Versions; repository:{path:string;repo_id:string};
 scope:{include:string[];exclude:string[];limits:string[];diagnostics:string[];complete:boolean};
 target_clis:string[]; materials:Fingerprint[]; adapters:AdapterResult[]; observations:Observation[];
}
// T05
export type Truth = "holds"|"fails"|"unknown";
// T06
export declare function emptyPolicy(catalogVersion?: string): Policy;
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeScan(i: Inventory, p: Policy, adapters?: AdapterResult[], observations?: Observation[]): ScanData;
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T10
export declare function observe(detector: string, materials: Material[], scope?: Scope, facts?: Fact[], limits?: string[], diagnostics?: string[]): Observation;
// T10
export declare function parseConfig(material: Material, format: 'json' | 'toml' | 'yaml'): { data: Record<string,unknown>; diagnostics: string[] };
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
```

Produces:

```ts
export declare function configurationObservations(snapshot: ScanData): Observation[];
```

## Steps

- [ ] 1. Write the failing test at `tests/detectors/configuration.test.ts` with this complete content.

```ts
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
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/detectors/configuration'`.

```sh
bun test tests/detectors/configuration.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/detectors/configuration.ts** (complete file)

```ts
import type { ScanData,Observation } from "../models";
import { observe,parseConfig,signal } from "../adapters/common";
export function configurationObservations(s:ScanData):Observation[] {
 const out:Observation[]=[];
 for(const m of s.materials) {
  if(/(^|\/)package\.json$/.test(m.path)) {
   const {data,diagnostics}=parseConfig(m,"json");
   out.push(observe("environment.declarations@1",[m],{},[
    signal("foundation.dev-environment","versions",JSON.stringify(data.engines??{})),
    signal("foundation.dev-environment","dependencies",JSON.stringify(Object.keys((data.dependencies??{}) as object)))],
    ["No dependency install or reproducibility claim"],diagnostics));
  }
  if(/(^|\/)tsconfig\.json$/.test(m.path)) {
   const {data,diagnostics}=parseConfig(m,"json");
   out.push(observe("analysis.config@1",[m],{},[
    signal("foundation.static-analysis","configuration",JSON.stringify({
     compilerOptions:data.compilerOptions??{},include:data.include??[],exclude:data.exclude??[]}))],
    ["Unresolved extends and tool defaults require confirmation; not executed"],diagnostics));
  }
  if(/(^|\/)(eslint|prettier)\.config\.[cm]?[jt]s$/.test(m.path))
   out.push(observe("analysis.config@1",[m],{},[],[],["dynamic_config: "+m.path]));
  if(m.path===".github/dependabot.yml"||m.path===".github/dependabot.yaml") {
   const {data,diagnostics}=parseConfig(m,"yaml");
   out.push(observe("security.config-signals@1",[m],{},[
    signal("foundation.security-signals","updates",JSON.stringify(data.updates??[]))],
    ["No vulnerability scan; no platform enforcement or ownership claim"],diagnostics));
  }
 }
 out.push(observe("tests.structure@1",s.materials.filter(m=>/\.(test|spec)\.[cm]?[jt]sx?$/.test(m.path)),{},[],
 ["Test content requires scoped human confirmation in this parser version"],["detector_unsupported: tests.structure@1"]));
 return out;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/detectors/configuration.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/detectors/configuration.ts tests/detectors/configuration.test.ts
git commit -m '✨ feat(detectors): report configuration signals without semantic promotion'
```

