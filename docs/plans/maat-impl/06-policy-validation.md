# T06 — Validate policy input with a dependency-free schema walker

DECISION (implementer default): unknown top-level policy keys are rejected; the documented optional sections default to empty collections. An absent default policy is valid input for scan and emits policy_missing. An explicitly requested absent policy is input error 3. Schema major 1 is accepted; catalog major must match the loaded catalog. Expiry and fingerprint failures are diagnostics during scan/evaluate and make policy validate exit 3. `targets.<check>.baseline` answers that check's approved baseline condition; it does not change its catalog tier. Applicability is answered in applicability.<check-id>; applicability.<layer> is the fallback. Evidence carries its own scope. targets entries contain only baseline.

## Files

- Create: `src/schema.ts`, `src/policy/load.ts`.
- Modify: None.
- Test path: `tests/policy/load.test.ts`.

## Interfaces

Consumes:

```ts
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
export interface RegistryEntry{ id: string; version: number; [key: string]: unknown; }
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
export interface Fingerprint { path: string; sha256: string; }
// T05
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
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
```

Produces:

```ts
export interface Shape { type?: "object"|"array"|"string"|"number"|"boolean"; required?: string[]; properties?: Record<string,Shape>; additionalProperties?: boolean | Shape; items?: Shape; enum?: unknown[]; minItems?: number; minLength?: number; pattern?: string; }
export declare function checkShape(value: unknown, shape: Shape, path?: string): void;
export declare const policyShape: Shape;
export declare function parsePolicy(text: string, catalogVersion: string): Policy;
export declare function loadPolicy(path: string, catalogVersion: string, optional?: boolean): Promise<{ policy: Policy; diagnostics: string[] }>;
export declare function emptyPolicy(catalogVersion?: string): Policy;
export declare function policySkeleton(catalogVersion?: string): string;
```

## Steps

- [ ] 1. Write the failing test at `tests/policy/load.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { parsePolicy, emptyPolicy, loadPolicy, policySkeleton } from "../../src/policy/load";
test("absence is allowed only for the default path; choices stay unknown",async()=>{
 const p=parsePolicy("policy_schema: 1.0.0\ncatalog_version: 0.1.0\ntarget_clis: [codex]\n","0.1.0");
 expect(p.target_clis).toEqual(["codex"]); expect(p.applicability).toEqual({});
 expect(parsePolicy(policySkeleton(),"0.1.0")).toEqual(emptyPolicy());
 expect((await loadPolicy("/maat-test-path-does-not-exist","0.1.0",true)).diagnostics).toEqual(["policy_missing"]);
 await expect(loadPolicy("/maat-test-path-does-not-exist","0.1.0")).rejects.toThrow("policy_read");
 for(const text of ["[]","policy_schema: 2.0.0\ncatalog_version: 0.1.0",
   "policy_schema: 1.0.0\ncatalog_version: 1.0.0",
   "policy_schema: 1.0.0\ncatalog_version: 0.1.0\ntarget_clis: [ide]",
   "policy_schema: 1.0.0\ncatalog_version: 0.1.0\nsurprise: true"])
   expect(()=>parsePolicy(text,"0.1.0")).toThrow();
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/policy/load'`.

```sh
bun test tests/policy/load.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/schema.ts** (complete file)

```ts
import { MaatError } from "./errors";
export interface Shape {
 type?:"object"|"array"|"string"|"number"|"boolean"; required?:string[];
 properties?:Record<string,Shape>; additionalProperties?:boolean|Shape; items?:Shape;
 enum?:unknown[];minItems?:number;minLength?:number;pattern?:string;
}
export function checkShape(v:unknown,s:Shape,path="$"):void {
 const fail=():never=>{throw new MaatError(3,"schema_error: "+path);};
 if(s.enum && !s.enum.some(x=>JSON.stringify(x)===JSON.stringify(v))) fail();
 if(s.type==="array") {
  if(!Array.isArray(v) || v.length<(s.minItems??0)) fail();
  (v as unknown[]).forEach((x,i)=>checkShape(x,s.items??{},path+"["+i+"]"));return;
 }
 if(s.type==="object") {
  if(!v || typeof v!=="object" || Array.isArray(v)) fail();
  const o=v as Record<string,unknown>;
  for(const k of s.required??[]) if(!(k in o)) fail();
  for(const [k,x] of Object.entries(o)) {
   if(["__proto__","constructor","prototype"].includes(k)) fail();
   const child=s.properties?.[k];
   if(child) checkShape(x,child,path+"."+k);
   else if(s.additionalProperties===false) fail();
   else if(typeof s.additionalProperties==="object") checkShape(x,s.additionalProperties,path+"."+k);
  }
  return;
 }
 if(s.type && typeof v!==s.type) fail();
 if(typeof v==="number" && !Number.isFinite(v)) fail();
 if(typeof v==="string" && (v.length<(s.minLength??0) || (s.pattern && !new RegExp(s.pattern).test(v)))) fail();
}
```

**src/policy/load.ts** (complete file)

```ts
import { readFile } from "node:fs/promises";
import { MaatError } from "../errors";
import { checkShape, type Shape } from "../schema";
import type { Policy } from "../models";
const str:Shape={type:"string"}, strings:Shape={type:"array",items:str};
const object:Shape={type:"object"};
const scope:Shape={type:"object",additionalProperties:false,properties:Object.fromEntries(
 ["cli","workflow","boundary","artifact","evaluator","effect"].map(k=>[k,str]))};
const fp:Shape={type:"object",required:["path","sha256"],properties:{path:{type:"string",minLength:1},sha256:{type:"string",pattern:"^[0-9a-f]{64}$"}}};
const decision:Shape={type:"object",required:["status"],properties:{
 status:{enum:["applicable","not_applicable","unknown"]},reason:str,owner:str,expires_at:str,
 loops:{type:"array",items:{type:"object",required:["id","kind","scope"],properties:{
 id:str,kind:{enum:["execution-feedback","event-driven","cross-run-improvement"]},scope:str}}}
}};
export const policyShape:Shape={type:"object",additionalProperties:false,
 required:["policy_schema","catalog_version"],properties:{
 policy_schema:{type:"string",pattern:"^1\\.[0-9]+\\.[0-9]+$"},
 catalog_version:{type:"string",pattern:"^[0-9]+\\.[0-9]+\\.[0-9]+$"},
 target_clis:{type:"array",items:{enum:["claude-code","codex","copilot"]}},
 scope:{type:"object",additionalProperties:false,properties:{include:strings,exclude:strings}},
 applicability:{type:"object",additionalProperties:decision},
 targets:{type:"object",additionalProperties:{type:"object",additionalProperties:false,
  properties:{baseline:{type:"boolean"}}}},
 exemptions:{type:"array",items:{type:"object",required:["check","reason","owner","expires_at","fingerprints"],
  properties:{check:str,reason:{type:"string",minLength:1},owner:str,expires_at:str,fingerprints:{type:"array",minItems:1,items:fp},scope}}},
 attestations:{type:"array",items:object},

}};
export function emptyPolicy(catalogVersion="0.1.0"):Policy {
 return {policy_schema:"1.0.0",catalog_version:catalogVersion,target_clis:[],
 scope:{include:["."],exclude:[]},applicability:{},targets:{},exemptions:[],
 attestations:[]};
}
export function parsePolicy(text:string,catalogVersion:string):Policy {
 let input:unknown;
 try{input=Bun.YAML.parse(text);}catch{throw new MaatError(3,"policy_parse");}
 checkShape(input,policyShape);
 const p=input as Partial<Policy>;
 if(p.catalog_version!.split(".")[0]!==catalogVersion.split(".")[0]) throw new MaatError(3,"catalog_incompatible");
 const base=emptyPolicy(catalogVersion);
 return {...base,...p,scope:{...base.scope,...p.scope}};
}
export async function loadPolicy(path:string,catalogVersion:string,optional=false):Promise<{policy:Policy;diagnostics:string[]}> {
 let text:string;
 try{text=await readFile(path,"utf8");}
 catch(e){if(optional && (e as NodeJS.ErrnoException).code==="ENOENT")
   return {policy:emptyPolicy(catalogVersion),diagnostics:["policy_missing"]};
  throw new MaatError(3,"policy_read: "+path);}
 return {policy:parsePolicy(text,catalogVersion),diagnostics:[]};
}
export function policySkeleton(catalogVersion="0.1.0"):string {
 return "# Fill project choices; absent answers remain unknown.\n"+JSON.stringify(emptyPolicy(catalogVersion),null,2)+"\n";
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/policy/load.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/schema.ts src/policy/load.ts tests/policy/load.test.ts
git commit -m '✨ feat(policy): load and validate versioned policy answers'
```

