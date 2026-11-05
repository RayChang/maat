# T18 — Evaluate three-valued claims without overwriting evidence

Complete scoped machine negatives can establish fails. User attestations confirm the listed affirmative claims; neither an unconfirmed absence nor an agent assessment grants a negative or positive semantic conclusion. Conflicting established facts remain unknown. Expired and stale evidence is retained with reasons. Empty all/any is unknown; only an explicitly empty prerequisite list is vacuously satisfied.

## Files

- Create: `src/evaluate/truth.ts`.
- Modify: None.
- Test path: `tests/evaluate/truth.test.ts`.

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
export interface Claim { name:string;status:Truth;basis:string[]; }
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
// T07
export declare function attestationIssues(a: Attestation, materials: Fingerprint[], versions: Versions, scope: Scope, now: string): string[];
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T09
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T11
export declare function codex(materials: Material[]): AdapterResult;
```

Produces:

```ts
export declare function allTruth(values: Truth[]): Truth;
export declare function anyTruth(values: Truth[]): Truth;
export declare function resolveClaim(subject: string, claim: string, scope: Scope, snapshot: Snapshot, policy: Policy, now: string, userCheck?: string, userClaim?: string): Claim;
```

## Steps

- [ ] 1. Write the failing test at `tests/evaluate/truth.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { allTruth, anyTruth, resolveClaim } from "../../src/evaluate/truth";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("all/any truth tables do not promote unknown",()=>{
 const values=["holds","fails","unknown"] as const;
 const all=[["holds","fails","unknown"],["fails","fails","fails"],["unknown","fails","unknown"]] as const;
 const any=[["holds","holds","holds"],["holds","fails","unknown"],["holds","unknown","unknown"]] as const;
 for(let i=0;i<3;i++)for(let j=0;j<3;j++) {
  expect(allTruth([values[i]!,values[j]!])).toBe(all[i]![j]!);
  expect(anyTruth([values[i]!,values[j]!])).toBe(any[i]![j]!);
 }
 expect(allTruth([])).toBe("unknown");expect(anyTruth([])).toBe("unknown");
 const p=emptyPolicy(),s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[{detector:"test",version:1,scope:{},evidence:[],limits:[],diagnostics:[],
 facts:[{subject:"x",claim:"a",status:"holds",scope:{},basis:"declaration",complete:true},
 {subject:"x",claim:"a",status:"fails",scope:{},basis:"contradiction",complete:true}]}];
 expect(resolveClaim("x","a",{},s,p,"2026-11-04").status).toBe("unknown");
 expect(resolveClaim("x","a",{workflow:"other"},s,p,"2026-11-04").status).toBe("unknown");
});
test("CLI-specific claims remain unknown until that CLI is selected",()=>{
 const p=emptyPolicy(),s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,
 include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p),scope={cli:"codex"};
 s.observations=[{detector:"fixture",version:1,scope,evidence:[],limits:[],diagnostics:[],facts:[
 {subject:"x",claim:"a",status:"holds",scope,basis:"Scoped declaration",complete:true}]}];
 expect(resolveClaim("x","a",scope,s,p,"2026-11-04").status).toBe("unknown");
 s.target_clis=["codex"];
 expect(resolveClaim("x","a",scope,s,p,"2026-11-04").status).toBe("holds");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/evaluate/truth'`.

```sh
bun test tests/evaluate/truth.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/evaluate/truth.ts** (complete file)

```ts
import type { Truth,Claim,Scope,Snapshot,Policy } from "../models";
import { sameScope } from "../canonical";
import { attestationIssues } from "../evidence/validate";
export function allTruth(v:Truth[]):Truth {
 return !v.length?"unknown":v.includes("fails")?"fails":v.includes("unknown")?"unknown":"holds";
}
export function anyTruth(v:Truth[]):Truth {
 return !v.length?"unknown":v.includes("holds")?"holds":v.includes("unknown")?"unknown":"fails";
}
export function resolveClaim(subject:string,claim:string,scope:Scope,s:Snapshot,p:Policy,now:string,userCheck=subject,userClaim=claim):Claim {
 if(scope.cli&&!s.target_clis.includes(scope.cli))return {name:claim,status:"unknown",basis:["cli_not_selected"]};
 const basis:string[]=[],values:Truth[]=[];
 for(const o of s.observations) for(const f of o.facts)
  if(f.subject===subject && f.claim===claim && sameScope(f.scope,scope) && !f.signal) {
   const status=f.status==="fails"&&(!f.complete||!s.scope.complete)?"unknown":f.status;
   values.push(status);basis.push("static: "+f.basis);
  }
 for(const [index,a] of p.attestations.entries()) {
  if(a.check!==userCheck || !Array.isArray(a.claims) || !userClaim.split('|').some(k=>a.claims.includes(k)) || !a.scope || !sameScope(a.scope,scope)) continue;
  const invalid=attestationIssues(a,s.materials,s.versions,scope,now);
  if(invalid.length){basis.push("attestation "+index+" invalid: "+invalid.join(","));values.push("unknown");}
  else {values.push("holds");basis.push("attested_by_user: "+a.attested_by+" #"+index);}
 }
 const positive=values.includes("holds"),negative=values.includes("fails");
 if(positive&&negative) return {name:claim,status:"unknown",basis:[...basis,"evidence_conflict"]};
 return {name:claim,status:positive?"holds":negative?"fails":"unknown",basis};
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/evaluate/truth.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/evaluate/truth.ts tests/evaluate/truth.test.ts
git commit -m '✨ feat(evaluate): merge scoped evidence with three-valued truth'
```

