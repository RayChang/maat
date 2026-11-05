# T15 — Observe local links, imports, duplicate content, and context size

DECISION (implementer default): support inline Markdown links with non-whitespace destinations and heading anchors formed from lowercase ASCII letters/digits plus hyphens. Reference-style links and non-ASCII anchor normalization remain unknown. Ignore remote URLs without requests. Resolve relative paths lexically against the document directory and require an inventoried destination. Imports support standalone @relative/path lines only. Imports and links yield facts about structure, not semantic authority or usefulness. Import cycles and escaping paths remain diagnostics.

## Files

- Create: `src/detectors/documents.ts`.
- Modify: None.
- Test path: `tests/detectors/documents.test.ts`.

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
// T04
export declare function assertAcyclic(graph: Record<string, string[]>): void;
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
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
```

Produces:

```ts
export declare function documentObservations(snapshot: ScanData): Observation[];
```

## Steps

- [ ] 1. Write the failing test at `tests/detectors/documents.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { documentObservations } from "../../src/detectors/documents";
import { makeScan } from "../../src/snapshot";
import { emptyPolicy } from "../../src/policy/load";
import { sha256 } from "../../src/canonical";
test("links resolve locally, remote links stay unread, cycles are diagnosed",()=>{
 const pairs=[["AGENTS.md","[Guide](docs/guide.md#setup)\n[Remote](https://example.invalid)\n@docs/guide.md\n"],["docs/guide.md","# Setup\n@../AGENTS.md\n"]];
 const s=makeScan({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],
 materials:pairs.map(([path,text])=>({path:path!,text:text!,sha256:sha256(text!)}))},emptyPolicy());
 const out=documentObservations(s);
 expect(out.flatMap(o=>o.diagnostics)).toContain("import_cycle");
 expect(out.flatMap(o=>o.facts).some(f=>f.basis.includes("resolved: docs/guide.md#setup"))).toBe(true);
 expect(out.flatMap(o=>o.limits)).toContain("External URLs are not requested");
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/detectors/documents'`.

```sh
bun test tests/detectors/documents.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/detectors/documents.ts** (complete file)

```ts
import { posix } from "node:path";
import type { ScanData,Observation } from "../models";
import { observe,signal } from "../adapters/common";
import { assertAcyclic } from "../catalog/validate";
export function documentObservations(s:ScanData):Observation[] {
 const out:Observation[]=[],graph:Record<string,string[]>={};
 const docs=s.materials.filter(m=>m.path.endsWith(".md"));
 for(const m of docs) graph[m.path]=[];
 for(const m of docs) {
  const links=[...m.text.matchAll(/\[[^\]\n]*\]\(([^()\s]+)\)/g)],facts=[],diagnostics:string[]=[];
  for(const [,raw] of links) {
   if(/^[a-z][a-z0-9+.-]*:/i.test(raw!) || raw!.startsWith("//")) {diagnostics.push("external_link: "+raw);continue;}
   let link:string;try{link=decodeURIComponent(raw!);}catch{diagnostics.push("link_encoding");continue;}
   const [file,anchor]=link.split("#"),path=posix.normalize(posix.join(posix.dirname(m.path),file||posix.basename(m.path)));
   if(link.startsWith("/")||path===".."||path.startsWith("../")){diagnostics.push("link_escape: "+link);continue;}
   const target=s.materials.find(x=>x.path===path);
   const headings=target?[...target.text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(x=>x[1]!.toLowerCase().replace(/[^a-z0-9 -]/g,"").trim().replace(/ +/g,"-")):[];
   const found=!!target && (!anchor||headings.includes(anchor));
   facts.push(signal("documents","link",(found?"resolved: ":"unresolved: ")+path+(anchor?"#"+anchor:"")));
  }
  out.push(observe("documents.local-links@1",[m],{},facts,["External URLs are not requested","Resolution does not establish content sufficiency"],diagnostics));
  const imports=[...m.text.matchAll(/^@([^\s]+)$/gm)];
  const importDiagnostics:string[]=[];
  for(const [,raw] of imports) {
   const path=posix.normalize(posix.join(posix.dirname(m.path),raw!));
   if(raw!.startsWith("/")||path.startsWith("../")) importDiagnostics.push("import_escape: "+raw);
   else if(path in graph) graph[m.path]!.push(path);
   else importDiagnostics.push("import_unresolved: "+raw);
  }
  const copies=docs.filter(d=>d.path!==m.path&&d.sha256===m.sha256).map(d=>d.path);
  out.push(observe("instructions.import-topology@1",[m],{},[
   signal("documents","imports",JSON.stringify(graph[m.path])),
   signal("documents","identical_copies",JSON.stringify(copies))],["Symlinks not followed"],importDiagnostics));
  out.push(observe("context-size-reported@1",[m],{},[
   signal("documents","bytes",String(Buffer.byteLength(m.text))),
   signal("documents","lines",String(m.text.split("\n").length))],["No size threshold or quality judgment"]));
 }
 try{assertAcyclic(graph);}catch{out.push(observe("instructions.import-topology@1",[],{},[],[],["import_cycle"]));}
 return out;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/detectors/documents.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/detectors/documents.ts tests/detectors/documents.test.ts
git commit -m '✨ feat(detectors): observe bounded document topology and links'
```

