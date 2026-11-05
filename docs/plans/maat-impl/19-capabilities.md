# T19 — Evaluate the nine registered capability predicates

DECISION (implementer default): capabilityRules supplies stable field names for catalog §7.1's existing all predicates. A user claim named in claim confirms all the listed declaration components only when its attestation is valid; the attestation question must request every component. These aliases are not new checks or thresholds. evaluation_config and run_record are optional evidence claims on harness.verification-wiring and do not add item requirements. Machine facts and user confirmations are any routes to the same claim; different scoped evidence never combines. The registry remains the authority: an unknown capability ID is an input error.

## Files

- Create: `src/evaluate/capabilities.ts`.
- Modify: None.
- Test path: `tests/evaluate/capabilities.test.ts`.

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
// T03
export interface Catalog {
  root: string; catalog_version: string; approved: boolean; items: CatalogItem[];
  capabilities: RegistryEntry[]; detectors: RegistryEntry[]; rule_cards: RegistryEntry[];
  templates: RegistryEntry[]; source_metadata: string;
}
// T03
export interface CatalogItem {
  id: string; item_version: number; catalog_version: string; question: string;
  layer: { primary: string; related: string[] };
  baseline: { proposed_tier: "baseline" | "advanced"; when: string | false };
  applicability: { applicable: string; not_applicable: string; unknown: string; questions: string[] };
  inspection: { inputs: string[]; detectors: string[]; methods: string[]; review?: string; limits: string };
  evidence_requirements: Record<string, unknown>;
  prerequisites: {
    required: (string | { capability: string; scope: string })[]; recommended: string[];
    conditional?: { when: string; required: string[]; recommended: string[] }[];
  };
  remediation: { rule_cards: { id: string; version: number }[]; actions: string[];
    targets: string; risk: string; needs_approval: boolean };
  verification: { rerun: string[]; logic: string; expected: unknown;
    attestation: { question: string; requires: string[] } };
  sources: { type: string; ref: string; use: string }[];
}
// T03
export declare function loadCatalog(root?: string): Promise<Catalog>;
// T03
export interface RegistryEntry{ id: string; version: number; [key: string]: unknown; }
// T05
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
// T05
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
// T05
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
// T05
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
// T05
export interface CapabilityResult { id:string;status:Truth;scope:Scope;basis:string[];claims:Claim[]; }
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
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T18
export declare function allTruth(values: Truth[]): Truth;
// T18
export declare function resolveClaim(subject: string, claim: string, scope: Scope, snapshot: Snapshot, policy: Policy, now: string, userCheck?: string, userClaim?: string): Claim;
```

Produces:

```ts
export declare const capabilityRules: Record<string,{check:string;claim:string;fields:string[]}>;
export declare function evaluateCapabilities(catalog: Catalog, scopes: Scope[], snapshot: Snapshot, policy: Policy, now: string): CapabilityResult[];
```

## Steps

- [ ] 1. Write the failing test at `tests/evaluate/capabilities.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { evaluateCapabilities } from "../../src/evaluate/capabilities";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("scope A cannot establish scope B and a check result grants nothing",async()=>{
 const p=emptyPolicy(),s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 s.observations=[{detector:"policy.verify-entrypoint@1",version:1,scope:{workflow:"A"},evidence:[],limits:[],diagnostics:[],
 facts:["name","invocation","purpose"].map(claim=>({subject:"verify.entrypoint-declared@1",claim,status:"holds" as const,
 scope:{workflow:"A"},basis:"policy declaration",complete:true}))}];
 const r=evaluateCapabilities(await loadCatalog("catalog"),[{workflow:"A"},{workflow:"B"}],s,p,"2026-11-04");
 expect(r.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.workflow==="A")!.status).toBe("holds");
 expect(r.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.workflow==="B")!.status).toBe("unknown");
 expect(r.find(x=>x.id==="evaluation.run-recorded@1")!.status).toBe("unknown");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/evaluate/capabilities'`.

```sh
bun test tests/evaluate/capabilities.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/evaluate/capabilities.ts** (complete file)

```ts
import type { Catalog } from "../catalog/types";
import type { CapabilityResult,Scope,Snapshot,Policy } from "../models";
import { allTruth,resolveClaim } from "./truth";
import { MaatError } from "../errors";
export const capabilityRules:Record<string,{check:string;claim:string;fields:string[]}>={
  "verify.entrypoint-declared@1": {
    "check": "foundation.verify-entrypoints",
    "claim": "declared",
    "fields": [
      "name",
      "invocation",
      "purpose"
    ]
  },
  "verify.entrypoint-documented@1": {
    "check": "foundation.verify-entrypoints",
    "claim": "documented",
    "fields": [
      "invocation",
      "purpose",
      "correspondence"
    ]
  },
  "evaluation.config-declared@1": {
    "check": "harness.verification-wiring",
    "claim": "evaluation_config",
    "fields": [
      "input",
      "method",
      "criteria",
      "result"
    ]
  },
  "evaluation.run-recorded@1": {
    "check": "harness.verification-wiring",
    "claim": "run_record",
    "fields": [
      "artifact",
      "method",
      "time",
      "result",
      "record"
    ]
  },
  "recovery.local-source-plan-declared@1": {
    "check": "harness.recovery",
    "claim": "local",
    "fields": [
      "baseline",
      "steps",
      "owner",
      "coverage",
      "exclusions"
    ]
  },
  "recovery.effect-plan-declared@1": {
    "check": "harness.recovery",
    "claim": "other_effects",
    "fields": [
      "effect",
      "steps",
      "authorizer",
      "limits",
      "unknown_result"
    ]
  },
  "loop.acceptance-policy-declared@1": {
    "check": "loop.acceptance-policy",
    "claim": "acceptance",
    "fields": [
      "candidate",
      "authority",
      "criteria",
      "evidence",
      "accept",
      "reject",
      "exception"
    ]
  },
  "loop.stopping-policy-declared@1": {
    "check": "loop.stopping-policy",
    "claim": "stopping",
    "fields": [
      "normal",
      "cancel",
      "blocked",
      "resume",
      "exhausted",
      "responsibility"
    ]
  },
  "loop.feedback-routing-declared@1": {
    "check": "loop.feedback-routing",
    "claim": "routing",
    "fields": [
      "outcomes",
      "authority",
      "unevaluable"
    ]
  }
};
export function evaluateCapabilities(c:Catalog,scopes:Scope[],s:Snapshot,p:Policy,now:string):CapabilityResult[] {
 const out:CapabilityResult[]=[];
 for(const entry of c.capabilities) {
  const rule=capabilityRules[entry.id];
  if(!rule) throw new MaatError(3,"capability_unsupported: "+entry.id);
  for(const scope of scopes) {
   const claims=rule.fields.map(field=>resolveClaim(entry.id,field,scope,s,p,now,rule.check,field+'|'+rule.claim));
   out.push({id:entry.id,scope,status:allTruth(claims.map(x=>x.status)),claims,basis:claims.flatMap(x=>x.basis)});
  }
 }
 return out;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/evaluate/capabilities.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/evaluate/capabilities.ts tests/evaluate/capabilities.test.ts
git commit -m '✨ feat(evaluate): evaluate capability claims within exact scopes'
```

