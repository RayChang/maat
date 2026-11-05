# T33 — Connect explain, catalog list, policy, attest, and version

DECISION (implementer default): explain accepts bare or @version check/card/template IDs and full capability IDs. Ambiguous namespaces are an input error. policy init prints a commented YAML-compatible JSON skeleton. attest template emits null/empty values that cannot accidentally validate, plus the exact question and accepted claim names; it never writes. policy validate diagnoses stale attestations/exemptions using bounded repository discovery, with no command execution. A missing file or invalid schema is exit 3. Inspector Markdown is a fenced structured contract, preserving all source fields.

## Files

- Create: `src/cli/inspect.ts`.
- Modify: None.
- Test path: `tests/cli/inspect.test.ts`.

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
export interface Args { command: string; positionals: string[]; flags: Record<string, string[]>; }
// T02
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; constructor(code: 1 | 2 | 3 | 4, message: string); }
// T02
export declare function one(args: Args, flag: string): string | undefined;
// T02
export declare function parseArgs(argv: string[]): Args;
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
// T04
export declare function validateCatalog(catalog: Catalog): void;
// T05
export interface AdapterResult { name:string; adapter_version:string; verified_cli_range:string; checked_at:string; sources:string[]; surfaces:AdapterSurface[]; observations:Observation[]; }
// T05
export interface AdapterSurface { surface:string; support:"supported"|"unsupported"|"unknown"; reason:string; paths:string[]; }
// T05
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
// T05
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
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
// T06
export declare function loadPolicy(path: string, catalogVersion: string, optional?: boolean): Promise<{ policy: Policy; diagnostics: string[] }>;
// T06
export declare function policySkeleton(catalogVersion?: string): string;
// T07
export declare function attestationIssues(a: Attestation, materials: Fingerprint[], versions: Versions, scope: Scope, now: string): string[];
// T07
export declare function decisionValid(value: { reason?: string; owner?: string; expires_at?: string }, now: string): boolean;
// T08
export declare function discover(root: string, scope: Policy['scope']): Promise<Inventory>;
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
// T19
export declare const capabilityRules: Record<string,{check:string;claim:string;fields:string[]}>;
// T26
export declare const itemClaims: Record<string,string[]>;
// T32
export interface CommandResult { value:unknown;markdown:string;repository:string;kind:string;snapshot?:Snapshot; }
```

Produces:

```ts
export declare function runInspectCommand(args: Args, now: string, cwd?: string): Promise<CommandResult>;
```

## Steps

- [ ] 1. Write the failing test at `tests/cli/inspect.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { runInspectCommand } from "../../src/cli/inspect";
import { parseArgs } from "../../src/cli/args";
test("focused explain and skeleton preserve manual requirements",async()=>{
 const time="2026-11-04T00:00:00Z";
 const e=await runInspectCommand(parseArgs(["explain","prompt.task-spec"]),time);
 expect((e.value as {id:string}).id).toBe("prompt.task-spec");
 const a=await runInspectCommand(parseArgs(["attest","template","--check","prompt.task-spec"]),time);
 expect((a.value as {claims:string[]}).claims).toEqual(["goal","scope","constraints","acceptance"]);
 const list=await runInspectCommand(parseArgs(["catalog","list","--layer","prompt","--tier","baseline"]),time);
 expect((list.value as unknown[]).length).toBe(2);
 await expect(runInspectCommand(parseArgs(["explain","unknown"]),time)).rejects.toThrow("unknown_id");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/cli/inspect'`.

```sh
bun test tests/cli/inspect.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/cli/inspect.ts** (complete file)

```ts
import type { Args } from "./args";
import { one } from "./args";
import type { CommandResult } from "./audit";
import { versions } from "../versions";
import { loadCatalog } from "../catalog/load";
import { validateCatalog } from "../catalog/validate";
import { loadPolicy,policySkeleton } from "../policy/load";
import { discover } from "../discovery/inventory";
import { attestationIssues,decisionValid } from "../evidence/validate";
import { itemClaims } from "../evaluate/items";
import { capabilityRules } from "../evaluate/capabilities";
import { MaatError } from "../errors";
import { resolve } from "node:path";
export async function runInspectCommand(a:Args,now:string,cwd=process.cwd()):Promise<CommandResult> {
 const c=await loadCatalog(one(a,"catalog"));validateCatalog(c);
 let value:unknown,markdown:string|undefined;
 if(a.command==="version") value=versions;
 else if(a.command==="catalog validate")value={valid:true,catalog_version:c.catalog_version};
 else if(a.command==="catalog list")value=c.items.filter(i=>(!one(a,"layer")||i.layer.primary===one(a,"layer"))&&
 (!one(a,"tier")||i.baseline.proposed_tier===one(a,"tier")));
 else if(a.command==="explain") {
  const id=a.positionals[0]!;
  const matches=[...c.items.map(i=>({id:i.id,version:i.item_version,data:i})),
   ...c.capabilities.map(x=>({id:x.id,version:x.version,data:x})),
   ...c.rule_cards.map(x=>({id:x.id,version:x.version,data:x})),
   ...c.templates.map(x=>({id:x.id,version:x.version,data:x}))]
   .filter(x=>id===x.id||id===x.id+"@"+x.version);
  if(matches.length!==1)throw new MaatError(3,matches.length?"ambiguous_id":"unknown_id");
  value=matches[0]!.data;
 } else if(a.command==="policy init") {
  markdown=policySkeleton(c.catalog_version);
  value=(await import("../policy/load")).emptyPolicy(c.catalog_version);
 } else if(a.command==="policy validate") {
  const path=a.positionals[0]??resolve(cwd,".maat/policy.yaml");
  const {policy:p}=await loadPolicy(path,c.catalog_version);
  const inventory=await discover(cwd,p.scope);
  const issues=p.attestations.flatMap(x=>attestationIssues(x,inventory.materials,versions,x.scope,now));
  for(const e of p.exemptions)if(!decisionValid(e,now)||!e.fingerprints.length||!e.fingerprints.every(f=>inventory.materials.some(m=>m.path===f.path&&m.sha256===f.sha256)))issues.push("invalid_exemption");
  if(issues.length)throw new MaatError(3,"policy_invalid: "+[...new Set(issues)].join(","));
  value={valid:true,policy_schema:p.policy_schema};
 } else if(a.command==="attest template") {
  const item=c.items.find(i=>i.id===one(a,"check"));
  if(!item)throw new MaatError(3,"unknown_check");
  value={check:item.id,claims:itemClaims[item.id],answer:"",materials:[],scope:{},attested_by:"",
   attested_at:now,expires_at:"",catalog_version:c.catalog_version,adapter_version:{},
   question:item.verification.attestation.question,
   requires:item.verification.attestation.requires,
   optional_capability_claims:Object.values(capabilityRules).filter(r=>r.check===item.id).map(r=>({claim:r.claim,requires:r.fields}))};
 } else throw new MaatError(2,"usage_error: unknown inspector");
 return {value,markdown:markdown??"# maat "+a.command+"\n\n\u0060\u0060\u0060json\n"+JSON.stringify(value,null,2)+"\n\u0060\u0060\u0060\n",
 repository:resolve(cwd),kind:a.command.replaceAll(" ","-")};
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/cli/inspect.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/cli/inspect.ts tests/cli/inspect.test.ts
git commit -m '✨ feat(cli): expose focused contracts and policy templates'
```

