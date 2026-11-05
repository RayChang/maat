# T07 — Validate attestations, assessments, and explicit external evidence

DECISION (implementer default): date-only expiries end at 00:00 UTC. Attestations require a substantive affirmative confirmation, cited quotations/line ranges, scope, material hashes, catalog/adapter bindings, confirmer and expiry. One explicitly provided evidence file contains one attestation or agent assessment plus source and provided_by. Agent assessments remain a separate internal collection and never become policy keys or grant claims.

## Files

- Create: `src/evidence/validate.ts`.
- Modify: None.
- Test path: `tests/evidence/validity.test.ts`.

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
// T05
export interface Assessment { check: string; claim: string; stance: "supports"|"refutes"|"insufficient"; citations: Evidence[]; uncertainty: string; by: string; scope: Scope; catalog_version: string; item_version: number; }
// T05
export interface Attestation { check: string; claims: string[]; answer: string; materials: Evidence[]; scope: Scope; attested_by: string; attested_at: string; expires_at: string; catalog_version: string; adapter_version: Record<string,string>; source?: string; provided_by?: string; }
// T05
export declare function canonical(value: unknown): string;
// T05
export interface Evidence extends Fingerprint { lines: string; quote?: string; }
// T05
export interface Fingerprint { path: string; sha256: string; }
// T05
export interface Material extends Fingerprint { text: string; }
// T05
export declare function sameScope(a: Scope, b: Scope): boolean;
// T05
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
// T05
export declare function sha256(value: string | Uint8Array): string;
// T06
export declare function checkShape(value: unknown, shape: Shape, path?: string): void;
// T06
export interface Shape { type?: "object"|"array"|"string"|"number"|"boolean"; required?: string[]; properties?: Record<string,Shape>; additionalProperties?: boolean | Shape; items?: Shape; enum?: unknown[]; minItems?: number; minLength?: number; pattern?: string; }
```

Produces:

```ts
export interface EvidenceBundle { attestations:Attestation[];assessments:Assessment[]; }
export declare function attestationIssues(a: Attestation, materials: Fingerprint[], versions: Versions, scope: Scope, now: string): string[];
export declare function loadEvidence(paths: string[]): Promise<EvidenceBundle>;
export declare function decisionValid(value: { reason?: string; owner?: string; expires_at?: string }, now: string): boolean;
```

## Steps

- [ ] 1. Write the failing test at `tests/evidence/validity.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { attestationIssues, decisionValid } from "../../src/evidence/validate";
import { sha256 } from "../../src/canonical";
import { versions } from "../../src/versions";
import type { Attestation } from "../../src/models";
test("valid, expired, changed, scoped, and empty user answers",()=>{
 const text="Fix login feedback.\nOnly edit the login view.\n";
 const m={path:"task.md",text,sha256:sha256(text)};
 const a:Attestation={check:"prompt.task-spec",claims:["goal"],answer:"The task explicitly requires fixing login feedback.",
 materials:[{path:m.path,sha256:m.sha256,lines:"1-1",quote:"Fix login feedback."}],
 scope:{cli:"codex"},attested_by:"ray",attested_at:"2026-11-04T00:00:00Z",
 expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{codex:"1.0.0"}};
 expect(attestationIssues(a,[m],versions,a.scope,"2026-11-04T01:00:00Z")).toEqual([]);
 expect(attestationIssues(a,[m],versions,a.scope,"2027-01-01T00:00:00Z")).toContain("expired");
 expect(attestationIssues(a,[{...m,sha256:sha256("changed")}],versions,a.scope,"2026-11-05")).toContain("fingerprint_mismatch");
 expect(attestationIssues({...a,answer:"yes"},[m],versions,a.scope,"2026-11-05")).toContain("answer_not_substantive");
 expect(attestationIssues(a,[m],versions,{workflow:"other"},"2026-11-05")).toContain("scope_mismatch");
 expect(decisionValid({reason:"Read only",owner:"ray",expires_at:"2027-01-01",},"2026-11-05")).toBe(true);
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/evidence/validate'`.

```sh
bun test tests/evidence/validity.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/evidence/validate.ts** (complete file)

```ts
import { readFile } from "node:fs/promises";
import type { Attestation, Assessment, Material, Scope, Fingerprint } from "../models";
import type { Versions } from "../versions";
import { sameScope } from "../canonical";
import { checkShape } from "../schema";
import { MaatError } from "../errors";
export interface EvidenceBundle { attestations:Attestation[];assessments:Assessment[]; }
export function decisionValid(v:{reason?:string;owner?:string;expires_at?:string},now:string):boolean {
 return !!(v.reason?.trim()&&v.owner?.trim()&&Number.isFinite(Date.parse(v.expires_at??""))&&Date.parse(v.expires_at!)>Date.parse(now));
}
export function attestationIssues(a:Attestation,m:Fingerprint[],v:Versions,scope:Scope,now:string):string[] {
 const out:string[]=[];
 if(!a || typeof a!=="object") return ["attestation_shape"];
 for(const k of ["check","answer","attested_by","attested_at","expires_at","catalog_version"] as const)
  if(typeof a[k]!=="string" || !a[k].trim()) out.push("missing_"+k);
 if(!Array.isArray(a.claims)||!a.claims.length||!a.claims.every(x=>typeof x==="string")) out.push("missing_claims");
 if(!a.scope || !a.adapter_version || !Array.isArray(a.materials)||!a.materials.length) return [...out,"missing_materials_or_scope"];
 if(/^(yes|no|true|false|有|沒有|是|否)$/i.test((a.answer??"").trim())) out.push("answer_not_substantive");
 const at=Date.parse(a.attested_at), end=Date.parse(a.expires_at), time=Date.parse(now);
 if(!Number.isFinite(at)||!Number.isFinite(end)||at>time||end<=at) out.push("invalid_time");
 if(end<=time) out.push("expired");
 if(a.catalog_version?.split(".")[0]!==v.catalog_version.split(".")[0]) out.push("catalog_incompatible");
 if(!sameScope(a.scope,scope)) out.push("scope_mismatch");
 if(scope.cli && a.adapter_version[scope.cli]!==v.adapters.find(x=>x.name===scope.cli)?.adapter_version)
  out.push("adapter_incompatible");
 for(const e of a.materials) {
  const found=m.find(x=>x.path===e.path);
  if(!found || found.sha256!==e.sha256) {out.push("fingerprint_mismatch");continue;}
  const range=/^([1-9][0-9]*)-([1-9][0-9]*)$/.exec(e.lines??"");
  if(!range){out.push("invalid_lines");continue;}
  const start=Number(range[1]),stop=Number(range[2]);
  if(stop<start || typeof e.quote!=="string" || !e.quote.trim())
   out.push("citation_mismatch");
 }
 return [...new Set(out)];
}
export async function loadEvidence(paths:string[]):Promise<EvidenceBundle> {
 const result:EvidenceBundle={attestations:[],assessments:[]};
 for(const path of paths) {
  let data:unknown;try{data=Bun.YAML.parse(await readFile(path,"utf8"));}catch{throw new MaatError(3,"evidence_parse: "+path);}
  checkShape(data,{type:"object",required:["source","provided_by"],properties:{
   source:{type:"string",minLength:1},provided_by:{type:"string",minLength:1}}});
  const record=data as Record<string,unknown>;
  if(typeof record.claim==="string") {
   checkShape(record,{type:"object",required:["check","claim","stance","citations","uncertainty","by","scope","catalog_version","item_version"],
    properties:{stance:{enum:["supports","refutes","insufficient"]},citations:{type:"array"},scope:{type:"object"}}});
   result.assessments.push(record as unknown as Assessment);
  } else {
   result.attestations.push(record as unknown as Attestation);
  }
 }
 return result;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/evidence/validity.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/evidence/validate.ts tests/evidence/validity.test.ts
git commit -m '✨ feat(evidence): validate scoped evidence without repository reads'
```

