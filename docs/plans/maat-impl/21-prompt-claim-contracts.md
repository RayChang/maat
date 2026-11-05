# T21 — Prompt evidence claims

DECISION (implementer default): these claim identifiers name the existing prompt item requirements in catalog §8. They do not add mandatory project fields. Each listed claim is tested through unknown, valid human confirmation, and expired-confirmation routes.

## Files

- Create: `src/evaluate/contracts/prompt.ts`.
- Modify: None.
- Test path: `tests/evaluate/prompt-claims.test.ts`.

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
export declare function canonical(value: unknown): string;
// T05
export interface Claim { name:string;status:Truth;basis:string[]; }
// T05
export interface Decision { status: "applicable"|"not_applicable"|"unknown"; reason?: string; owner?: string; expires_at?: string; loops?: {id:string;kind:"execution-feedback"|"event-driven"|"cross-run-improvement";scope:string}[]; }
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
export declare function resolveClaim(subject: string, claim: string, scope: Scope, snapshot: Snapshot, policy: Policy, now: string, userCheck?: string, userClaim?: string): Claim;
```

Produces:

```ts
export declare const promptClaims: Record<string,string[]>;
```

## Steps

- [ ] 1. Write the failing test at `tests/evaluate/prompt-claims.test.ts` with this complete content.

```ts
import { test,expect } from "bun:test";
import { promptClaims } from "../../src/evaluate/contracts/prompt";
import { resolveClaim } from "../../src/evaluate/truth";
import { loadCatalog } from "../../src/catalog/load";
import { makeSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("prompt contracts preserve every item and require bound human evidence",async()=>{
 const catalog=await loadCatalog("catalog");
 expect(Object.keys(promptClaims).sort()).toEqual(catalog.items.filter(i=>i.layer.primary==="prompt").map(i=>i.id).sort());
 const material={path:"evidence.md",text:"Reviewed project evidence",sha256:sha256("Reviewed project evidence")};
 for(const [check,claims] of Object.entries(promptClaims)) {
  expect(claims.length).toBeGreaterThan(0);
  const p=emptyPolicy(),s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,materials:[material],
   include:["."],exclude:[],limits:[],diagnostics:[]},p);
  for(const claim of claims)expect(resolveClaim(check,claim,{},s,p,"2026-11-04").status).toBe("unknown");
  p.attestations=[{check,claims,answer:"The cited material was reviewed against every named catalog requirement.",
   materials:[{path:material.path,sha256:material.sha256,lines:"1-1",quote:material.text}],scope:{},attested_by:"ray",
   attested_at:"2026-11-01",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}}];
  for(const claim of claims) {
   expect(resolveClaim(check,claim,{},s,p,"2026-11-04").status).toBe("holds");
   expect(resolveClaim(check,claim,{},s,p,"2027-01-01").status).toBe("unknown");
  }
 }
});
```

- [ ] 2. Run the focused test; expect exit 1 and an error containing Cannot find module for src/evaluate/contracts/prompt.

```sh
bun test tests/evaluate/prompt-claims.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/evaluate/contracts/prompt.ts** (complete file)

```ts
export const promptClaims:Record<string,string[]>={
  "prompt.task-spec": [
    "goal",
    "scope",
    "constraints",
    "acceptance"
  ],
  "prompt.output-contract": [
    "receiver",
    "format",
    "summary",
    "locations",
    "verification",
    "unperformed"
  ],
  "prompt.plan-for-nontrivial": [
    "activation",
    "steps",
    "verification",
    "replan"
  ]
};
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/evaluate/prompt-claims.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/evaluate/contracts/prompt.ts tests/evaluate/prompt-claims.test.ts
git commit -m '✨ feat(catalog): define prompt evidence claims'
```

