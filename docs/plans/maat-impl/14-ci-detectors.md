# T14 — Parse literal CI invocation and failure consequence independently

DECISION (implementer default): inspect literal GitHub Actions run steps, with each workflow/job/step retained as a distinct scope. Match an explicit document entrypoint from the bounded declaration detector. Expressions, uses actions, wrappers and multiline shell remain unknown. continue-on-error:true is advisory. No additional policy selector fields are introduced.

## Files

- Create: `src/detectors/ci.ts`.
- Modify: None.
- Test path: `tests/detectors/ci.test.ts`.

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
export declare function sameScope(a: Scope, b: Scope): boolean;
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
// T13
export declare function detectedEntrypoints(s: ScanData): Entrypoint[];
```

Produces:

```ts
export declare function ciObservations(snapshot: ScanData, policy: Policy): Observation[];
```

## Steps

- [ ] 1. Write the failing test at `tests/detectors/ci.test.ts` with this complete content.

```ts
import { test,expect } from "bun:test";
import { ciObservations } from "../../src/detectors/ci";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("literal configured invocation is distinct from runtime enforcement",()=>{
 const p=emptyPolicy(),materials=[{path:"AGENTS.md",text:"Verification command: bun test\nVerification purpose: regression\n"},
 {path:".github/workflows/ci.yml",text:"jobs:\n  test:\n    steps:\n      - run: bun test\n        continue-on-error: true\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials},p);
 const facts=ciObservations(s,p).flatMap(o=>o.facts);
 expect(facts.find(f=>f.claim==="invocation")!.status).toBe("holds");
 expect(facts.find(f=>f.claim==="consequence")!.basis).toBe("advisory");
 s.materials[1]!.text=s.materials[1]!.text.replace("bun test","bun test && echo ok");
 expect(ciObservations(s,p).flatMap(o=>o.facts).find(f=>f.claim==="invocation")!.status).toBe("unknown");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/detectors/ci'`.

```sh
bun test tests/detectors/ci.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/detectors/ci.ts** (complete file)

```ts
import type { ScanData,Policy,Observation,Fact } from "../models";
import { observe,parseConfig,signal } from "../adapters/common";
import { detectedEntrypoints } from "./entrypoints";
export function ciObservations(s:ScanData,_p:Policy):Observation[] {
 const out:Observation[]=[],entries=detectedEntrypoints(s);
 for(const m of s.materials.filter(m=>/^\.github\/workflows\/[^/]+\.ya?ml$/.test(m.path))) {
  const parsed=parseConfig(m,"yaml");
  out.push(observe("ci-config-found@1",[m],{},[signal("ci","configuration",m.path)],
   ["Configuration does not establish an agent loop"],parsed.diagnostics));
  const jobs=parsed.data.jobs;
  if(!jobs||typeof jobs!=="object")continue;
  for(const [name,raw] of Object.entries(jobs)) {
   if(!raw||typeof raw!=="object")continue;
   const job=raw as Record<string,unknown>;if(!Array.isArray(job.steps))continue;
   for(const [index,rawStep] of job.steps.entries()) {
    if(!rawStep||typeof rawStep!=="object")continue;
    const step=rawStep as Record<string,unknown>,scope={workflow:m.path,boundary:name+"/"+index,evaluator:"command"};
    const command=typeof step.run==="string"?step.run.trim():null;
    const entry=entries.find(e=>e.command===command);
    const literal=!!command&&!/[\n\r;&|$<>`]/.test(command)&&!step.uses;
    const status:Fact["status"]=literal&&entry?"holds":"unknown";
    const a=step["continue-on-error"],b=job["continue-on-error"];
    const consequence=a===true||b===true?"advisory":(a===undefined||a===false)&&(b===undefined||b===false)?"blocking":"unknown";
    out.push(observe("ci.step-invokes-entrypoint@1",[m,...s.materials.filter(x=>x.path===entry?.document)],scope,
     [{subject:"foundation.ci-verification",claim:"invocation",status,scope,basis:command??"Unrecognized step",complete:status==="holds"}],
     ["Exact declared invocation only; execution and remote gating unobserved"]));
    out.push(observe("ci.failure-consequence@1",[m],scope,[signal("foundation.ci-verification","consequence",consequence,scope)],
     ["Configured failure consequence only"]));
   }
  }
 }
 return out;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/detectors/ci.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/detectors/ci.ts tests/detectors/ci.test.ts
git commit -m '✨ feat(detectors): observe literal CI verification obligations'
```

