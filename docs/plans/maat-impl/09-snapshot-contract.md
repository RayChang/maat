# T09 — Create and validate self-contained snapshots

DECISION (implementer default): snapshots store material paths/digests and raw observations, never full file contents. ScanData holds bounded text only during scan. Evaluate consumes stored observations plus explicitly supplied policy and evidence; it never re-runs detectors or reads the target repository. Snapshot major-version, unique paths, digest syntax, and observation reference bindings are checked. The host is responsible for supplying the snapshot it intends to audit.

## Files

- Create: `src/snapshot.ts`.
- Modify: None.
- Test path: `tests/snapshot/contract.test.ts`.

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
export declare function checkShape(value: unknown, shape: Shape, path?: string): void;
// T06
export declare function emptyPolicy(catalogVersion?: string): Policy;
// T06
export interface Shape { type?: "object"|"array"|"string"|"number"|"boolean"; required?: string[]; properties?: Record<string,Shape>; additionalProperties?: boolean | Shape; items?: Shape; enum?: unknown[]; minItems?: number; minLength?: number; pattern?: string; }
// T08
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
```

Produces:

```ts
export declare function makeSnapshot(inventory: Inventory, policy: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
export declare function parseSnapshot(text: string): Snapshot;
export declare function makeScan(i: Inventory, p: Policy, adapters?: AdapterResult[], observations?: Observation[]): ScanData;
```

## Steps

- [ ] 1. Write the failing test at `tests/snapshot/contract.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { makeSnapshot, parseSnapshot } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("snapshot excludes file text and rejects malformed digests",()=>{
 const s=makeSnapshot({root:"/repo",repo_id:"0123456789abcdef",materials:[{path:"a.md",text:"a",sha256:sha256("a")}],
 complete:false,diagnostics:["read_error: b.md"],limits:[],include:["."],exclude:[]},emptyPolicy());
 expect(parseSnapshot(JSON.stringify(s))).toEqual(s);
 expect("text" in s.materials[0]!).toBe(false);
 const changed=structuredClone(s);changed.materials[0]!.sha256="invalid";
 expect(()=>parseSnapshot(JSON.stringify(changed))).toThrow("schema_error");
 expect(()=>parseSnapshot('{"report_schema":"2.0.0"}')).toThrow();
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/snapshot'`.

```sh
bun test tests/snapshot/contract.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/snapshot.ts** (complete file)

```ts
import type { Snapshot, ScanData, Policy, AdapterResult, Observation } from "./models";
import type { Inventory } from "./discovery/inventory";
import { versions } from "./versions";
import { sha256 } from "./canonical";
import { MaatError } from "./errors";
import { checkShape } from "./schema";
export function makeScan(i:Inventory,p:Policy,adapters:AdapterResult[]=[],observations:Observation[]=[]):ScanData {
 return {report_schema:versions.report_schema,versions:structuredClone(versions),
 repository:{path:i.root,repo_id:i.repo_id},
 scope:{include:i.include,exclude:i.exclude,limits:i.limits,diagnostics:i.diagnostics,complete:i.complete},
 target_clis:p.target_clis,materials:i.materials,adapters,observations};
}
export function makeSnapshot(i:Inventory,p:Policy,adapters:AdapterResult[]=[],observations:Observation[]=[]):Snapshot {
 const s=makeScan(i,p,adapters,observations);return {...s,materials:s.materials.map(({path,sha256})=>({path,sha256}))};
}
export function parseSnapshot(text:string):Snapshot {
 let data:unknown;
 try{data=JSON.parse(text);}catch{throw new MaatError(3,"snapshot_parse");}
 checkShape(data,{"type":"object","required":["report_schema","versions","repository","scope","target_clis","materials","adapters","observations"],"properties":{"report_schema":{"type":"string","pattern":"^1\\."},"versions":{"type":"object","required":["tool_version","catalog_version","report_schema","policy_schema","ledger_schema","adapters"],"properties":{"tool_version":{"type":"string"},"catalog_version":{"type":"string"},"report_schema":{"type":"string"},"policy_schema":{"type":"string"},"ledger_schema":{"type":"string"},"adapters":{"type":"array","items":{"type":"object","required":["name","adapter_version","verified_cli_range","checked_at"],"properties":{"name":{"type":"string"},"adapter_version":{"type":"string"},"verified_cli_range":{"type":"string"},"checked_at":{"type":"string"}}}}}},"repository":{"type":"object","required":["path","repo_id"],"properties":{"path":{"type":"string"},"repo_id":{"type":"string","pattern":"^[a-f0-9]{16}$"}}},"scope":{"type":"object"},"target_clis":{"type":"array"},"materials":{"type":"array","items":{"type":"object","required":["path","sha256"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}}}},"adapters":{"type":"array"},"observations":{"type":"array","items":{"type":"object","required":["detector","version","scope","evidence","limits","facts","diagnostics"],"properties":{"detector":{"type":"string"},"version":{"type":"number"},"scope":{"type":"object"},"evidence":{"type":"array","items":{"type":"object","required":["path","sha256","lines"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"lines":{"type":"string","pattern":"^[1-9][0-9]*-[1-9][0-9]*$"},"quote":{"type":"string"}}}},"limits":{"type":"array"},"facts":{"type":"array","items":{"type":"object","required":["subject","claim","status","scope","basis","complete"],"properties":{"subject":{"type":"string"},"claim":{"type":"string"},"status":{"enum":["holds","fails","unknown"]},"scope":{"type":"object"},"basis":{"type":"string"},"complete":{"type":"boolean"}}}},"diagnostics":{"type":"array"}}}}}});
 const s=data as Snapshot, paths=new Set<string>();
 for(const m of s.materials) {
  if(paths.has(m.path)||!/^[a-f0-9]{64}$/.test(m.sha256)) throw new MaatError(3,"schema_error");
  paths.add(m.path);
 }
 for(const o of s.observations) {
  if(!o || !Array.isArray(o.evidence)||!Array.isArray(o.facts)||!Array.isArray(o.limits)) throw new MaatError(3,"observation_shape");
  for(const e of o.evidence) if(!s.materials.some(m=>m.path===e.path&&m.sha256===e.sha256))
   throw new MaatError(3,"observation_fingerprint");
 }
 return s;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/snapshot/contract.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/snapshot.ts tests/snapshot/contract.test.ts
git commit -m '✨ feat(snapshot): bind observations to immutable material snapshots'
```

