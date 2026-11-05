# T13 — Observe manifest entrypoints and exact documentation correspondence

DECISION (implementer default): the bounded declaration grammar is two nonempty lines in one Markdown material: Verification command: <literal command> and Verification purpose: <literal purpose>. Package scripts alone are candidates. bun run / npm run script references must match package.json; a complete missing binding is negative evidence. Entrypoints come from observed material, not extra policy fields. No invocation is executed.

## Files

- Create: `src/detectors/entrypoints.ts`.
- Modify: None.
- Test path: `tests/detectors/entrypoints.test.ts`.

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
export declare function entrypointObservations(snapshot: ScanData, policy: Policy): Observation[];
export declare function detectedEntrypoints(s: ScanData): Entrypoint[];
```

## Steps

- [ ] 1. Write the failing test at `tests/detectors/entrypoints.test.ts` with this complete content.

```ts
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
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/detectors/entrypoints'`.

```sh
bun test tests/detectors/entrypoints.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/detectors/entrypoints.ts** (complete file)

```ts
import type { ScanData,Observation,Fact,Entrypoint,Policy } from "../models";
import { observe,parseConfig,signal } from "../adapters/common";
export function detectedEntrypoints(s:ScanData):Entrypoint[] {
 const out:Entrypoint[]=[];
 for(const m of s.materials.filter(m=>m.path.endsWith(".md"))) {
  const command=/^Verification command: (.+)$/m.exec(m.text)?.[1]?.trim();
  const purpose=/^Verification purpose: (.+)$/m.exec(m.text)?.[1]?.trim();
  if(!command||!purpose)continue;
  const script=/^(?:bun|npm) run ([a-zA-Z0-9:_-]+)$/.exec(command)?.[1];
  out.push({name:script??command,command,purpose,scope:{},document:m.path,
   ...(script?{manifest:"package.json",script}:{})});
 }
 return out;
}
export function entrypointObservations(s:ScanData,_p:Policy):Observation[] {
 const out:Observation[]=[];
 for(const m of s.materials.filter(x=>/(^|\/)package\.json$/.test(x.path))) {
  const parsed=parseConfig(m,"json"),scripts=parsed.data.scripts;
  const facts=scripts&&typeof scripts==="object"?Object.entries(scripts).filter(([,v])=>typeof v==="string")
   .map(([k,v])=>signal("manifest",k,String(v))):[];
  out.push(observe("manifest.verify-entrypoint@1",[m],{},facts,["Script names do not establish purpose"],parsed.diagnostics));
 }
 for(const e of detectedEntrypoints(s)) {
  const doc=s.materials.find(m=>m.path===e.document)!,manifest=s.materials.find(m=>m.path===e.manifest);
  let invocation:Fact["status"]="holds";
  if(e.script) {
   if(!manifest)invocation="unknown";
   else {
    const parsed=parseConfig(manifest,"json"),scripts=parsed.data.scripts as Record<string,unknown>|undefined;
    invocation=parsed.diagnostics.length?"unknown":typeof scripts?.[e.script]==="string"?"holds":s.scope.complete?"fails":"unknown";
   }
  }
  const refs=manifest?[doc,manifest]:[doc];
  const facts:Fact[]=[{subject:"verify.entrypoint-declared@1",claim:"name",status:"holds",scope:e.scope,basis:e.name,complete:true},
   {subject:"verify.entrypoint-declared@1",claim:"invocation",status:invocation,scope:e.scope,basis:e.command,complete:invocation!=="unknown"},
   {subject:"verify.entrypoint-declared@1",claim:"purpose",status:"holds",scope:e.scope,basis:e.purpose,complete:true}];
  out.push(observe("policy.verify-entrypoint@1",refs,e.scope,facts,["Explicit document declaration; never executed"]));
  out.push(observe("instructions.verify-entrypoint@1",refs,e.scope,["invocation","purpose","correspondence"].map(claim=>({
   subject:"verify.entrypoint-documented@1",claim,status:claim==="correspondence"?invocation:"holds",
   scope:e.scope,basis:claim==="purpose"?e.purpose:e.command,complete:invocation!=="unknown"})),
   ["Declared correspondence only; runtime reading unobserved"]));
 }
 return out;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/detectors/entrypoints.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/detectors/entrypoints.ts tests/detectors/entrypoints.test.ts
git commit -m '✨ feat(detectors): observe declared verification entrypoints'
```

