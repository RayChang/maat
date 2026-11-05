# T05 — Define domain models and canonical fingerprints

DECISION (implementer default): scope identity is exact equality of its populated fields. Canonical JSON sorts object keys and retains array order; repo_id is the first 16 SHA-256 hex characters of the canonical absolute root. Policy has only its contract fields. Machine observations, agent assessments from explicit evidence files, and user attestations stay separate. Assessments never become policy entries.

## Files

- Create: `src/models.ts`, `src/canonical.ts`.
- Modify: None.
- Test path: `tests/models/canonical.test.ts`.

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
// T02
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; constructor(code: 1 | 2 | 3 | 4, message: string); }
```

Produces:

```ts
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
export type Truth = "holds"|"fails"|"unknown";
export type ItemStatus = "verified"|"partial"|"missing"|"not_applicable"|"unknown";
export type LayerStatus = "adopted"|"ready"|"blocked"|"not_applicable"|"in_use_unsupported"|"pending";
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
export interface Fingerprint { path: string; sha256: string; }
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
export interface Material extends Fingerprint { text: string; }
export interface Fact { subject: string; claim: string; status: Truth; scope: Scope; basis: string; complete: boolean; signal?: boolean; }
export interface Observation { detector: string; version: number; scope: Scope; evidence: Evidence[]; limits: string[]; facts: Fact[]; diagnostics: string[]; }
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
export interface Decision { status: "applicable"|"not_applicable"|"unknown"; reason?: string; owner?: string; expires_at?: string; loops?: {id:string;kind:"execution-feedback"|"event-driven"|"cross-run-improvement";scope:string}[]; }
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; document?:string; }
export interface Policy {
 policy_schema:string; catalog_version:string; target_clis:string[];
 scope:{include:string[];exclude:string[]};
 applicability:Record<string,Decision>;
 targets:Record<string,{baseline?:boolean}>;
 exemptions:{check:string;reason:string;owner:string;expires_at:string;fingerprints:Fingerprint[];scope?:Scope}[];
 attestations:Attestation[];
}
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
export interface Snapshot {
 report_schema:string; versions:Versions; repository:{path:string;repo_id:string};
 scope:{include:string[];exclude:string[];limits:string[];diagnostics:string[];complete:boolean};
 target_clis:string[]; materials:Fingerprint[]; adapters:AdapterResult[]; observations:Observation[];
}
export interface Claim { name:string;status:Truth;basis:string[]; }
export interface CapabilityResult { id:string;status:Truth;scope:Scope;basis:string[];claims:Claim[]; }
export interface ItemResult {
 id:string;item_version:number;layer:Layer;scope:Scope;
 applicability:{status:Decision["status"];reason:string;questions:string[]};
 result:ItemStatus;claims:Claim[];observations:Observation[];assessments:Assessment[];
 attestations:{ref:string;valid:boolean;invalid_reason:string|null}[];
 prerequisites:{required:{capability:string;status:Truth}[];recommended:{capability:string;status:Truth}[]};
 baseline:{tier:"baseline"|"advanced";when_status:Truth};diagnostics:string[];
}
export interface LayerResult { layer:Layer;scope:Scope;status:LayerStatus;authoritative:boolean;missing_required:string[];unknown_required:string[];baseline_gaps:string[];usage_signals:string[]; }
export interface ProtectionObservation { measure:string;protects:string;threat:string;boundary:string;evidence:Evidence[];unknown:string[]; }
export interface Report {
 report_schema:string;tool_version:string;catalog_version:string;adapters:(Omit<AdapterResult,"sources"|"observations"|"surfaces">&{surfaces:Omit<AdapterSurface,"paths">[]})[];
 generated_at:string;valid_until:string|null;repository:Snapshot["repository"];scope:Snapshot["scope"];target_clis:string[];
 policy:{path:string|null;policy_schema:string;valid:boolean;diagnostics:string[]};
 items:ItemResult[];capabilities:Omit<CapabilityResult,"claims">[];layers:LayerResult[];
 protection_observations:ProtectionObservation[];diagnostics:string[];
}
export declare function canonical(value: unknown): string;
export declare function sha256(value: string | Uint8Array): string;
export declare function sameScope(a: Scope, b: Scope): boolean;
export declare function repoId(absolutePath: string): string;
export type ScanData = Omit<Snapshot,"materials"> & { materials:Material[] };
```

## Steps

- [ ] 1. Write the failing test at `tests/models/canonical.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { canonical, sha256, sameScope, repoId } from "../../src/canonical";
test("fingerprints are stable while scopes never pool evidence",()=>{
 expect(canonical({b:2,a:{z:1,x:0}})).toBe('{"a":{"x":0,"z":1},"b":2}');
 expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
 expect(repoId("/project")).toHaveLength(16);
 expect(sameScope({workflow:"A",cli:"codex"},{cli:"codex",workflow:"A"})).toBe(true);
 expect(sameScope({workflow:"A"},{workflow:"B"})).toBe(false);
 expect(()=>canonical({x:undefined})).toThrow("non_json_value");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/canonical'`.

```sh
bun test tests/models/canonical.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/models.ts** (complete file)

```ts
import type { Versions } from "./versions";
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
export type Truth = "holds"|"fails"|"unknown";
export type ItemStatus = "verified"|"partial"|"missing"|"not_applicable"|"unknown";
export type LayerStatus = "adopted"|"ready"|"blocked"|"not_applicable"|"in_use_unsupported"|"pending";
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
export interface Fingerprint { path: string; sha256: string; }
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
export interface Material extends Fingerprint { text: string; }
export interface Fact { subject: string; claim: string; status: Truth; scope: Scope; basis: string; complete: boolean; signal?: boolean; }
export interface Observation { detector: string; version: number; scope: Scope; evidence: Evidence[]; limits: string[]; facts: Fact[]; diagnostics: string[]; }
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
export interface Decision { status: "applicable"|"not_applicable"|"unknown"; reason?: string; owner?: string; expires_at?: string; loops?: {id:string;kind:"execution-feedback"|"event-driven"|"cross-run-improvement";scope:string}[]; }
export interface Entrypoint { name:string; command:string; purpose:string; scope:Scope; manifest?:string; script?:string; document?:string; }
export interface Policy {
 policy_schema:string; catalog_version:string; target_clis:string[];
 scope:{include:string[];exclude:string[]};
 applicability:Record<string,Decision>;
 targets:Record<string,{baseline?:boolean}>;
 exemptions:{check:string;reason:string;owner:string;expires_at:string;fingerprints:Fingerprint[];scope?:Scope}[];
 attestations:Attestation[];
}
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
export interface Snapshot {
 report_schema:string; versions:Versions; repository:{path:string;repo_id:string};
 scope:{include:string[];exclude:string[];limits:string[];diagnostics:string[];complete:boolean};
 target_clis:string[]; materials:Fingerprint[]; adapters:AdapterResult[]; observations:Observation[];
}
export interface Claim { name:string;status:Truth;basis:string[]; }
export interface CapabilityResult { id:string;status:Truth;scope:Scope;basis:string[];claims:Claim[]; }
export interface ItemResult {
 id:string;item_version:number;layer:Layer;scope:Scope;
 applicability:{status:Decision["status"];reason:string;questions:string[]};
 result:ItemStatus;claims:Claim[];observations:Observation[];assessments:Assessment[];
 attestations:{ref:string;valid:boolean;invalid_reason:string|null}[];
 prerequisites:{required:{capability:string;status:Truth}[];recommended:{capability:string;status:Truth}[]};
 baseline:{tier:"baseline"|"advanced";when_status:Truth};diagnostics:string[];
}
export interface LayerResult { layer:Layer;scope:Scope;status:LayerStatus;authoritative:boolean;missing_required:string[];unknown_required:string[];baseline_gaps:string[];usage_signals:string[]; }
export interface ProtectionObservation { measure:string;protects:string;threat:string;boundary:string;evidence:Evidence[];unknown:string[]; }
export interface Report {
 report_schema:string;tool_version:string;catalog_version:string;adapters:(Omit<AdapterResult,"sources"|"observations"|"surfaces">&{surfaces:Omit<AdapterSurface,"paths">[]})[];
 generated_at:string;valid_until:string|null;repository:Snapshot["repository"];scope:Snapshot["scope"];target_clis:string[];
 policy:{path:string|null;policy_schema:string;valid:boolean;diagnostics:string[]};
 items:ItemResult[];capabilities:Omit<CapabilityResult,"claims">[];layers:LayerResult[];
 protection_observations:ProtectionObservation[];diagnostics:string[];
}
export type ScanData = Omit<Snapshot,"materials"> & { materials:Material[] };
```

**src/canonical.ts** (complete file)

```ts
import { createHash } from "node:crypto";
import type { Scope } from "./models";
export function canonical(value:unknown):string {
 function sort(v:unknown):unknown {
  if(v===null || typeof v==="string" || typeof v==="boolean") return v;
  if(typeof v==="number" && Number.isFinite(v)) return v;
  if(Array.isArray(v)) return v.map(sort);
  if(v && typeof v==="object" && Object.getPrototypeOf(v)===Object.prototype)
   return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort((v as Record<string,unknown>)[k])]));
  throw Error("non_json_value");
 }
 return JSON.stringify(sort(value));
}
export function sha256(value:string|Uint8Array):string { return createHash("sha256").update(value).digest("hex"); }
export function sameScope(a:Scope,b:Scope):boolean { return canonical(a)===canonical(b); }
export function repoId(absolutePath:string):string { return sha256(absolutePath).slice(0,16); }
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/models/canonical.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/models.ts src/canonical.ts tests/models/canonical.test.ts
git commit -m '✨ feat(models): define evidence models and canonical fingerprints'
```

