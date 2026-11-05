# T29 — Write explicit outputs only outside the target repository

DECISION (implementer default): --quiet suppresses stdout only; stderr diagnostics remain visible. --out writes <kind>.json and <kind>.md for every command, where kind is its space-separated command name converted to hyphens, except scan/evaluate use report. --format both prints Markdown followed by a fenced JSON document. All destinations, including --snapshot and --ledger, are canonicalized before creating anything; repository descendants and aliases to them are rejected as input error 3. Atomic output replaces a destination symlink itself, never follows it. Existing non-target files are replaced only at explicitly selected output locations.

## Files

- Create: `src/cli/output.ts`.
- Modify: None.
- Test path: `tests/cli/output.test.ts`.

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
export interface ItemResult {
 id:string;item_version:number;layer:Layer;scope:Scope;
 applicability:{status:Decision["status"];reason:string;questions:string[]};
 result:ItemStatus;claims:Claim[];observations:Observation[];assessments:Assessment[];
 attestations:{ref:string;valid:boolean;invalid_reason:string|null}[];
 prerequisites:{required:{capability:string;status:Truth}[];recommended:{capability:string;status:Truth}[]};
 baseline:{tier:"baseline"|"advanced";when_status:Truth};diagnostics:string[];
}
// T05
export type ItemStatus = "verified"|"partial"|"missing"|"not_applicable"|"unknown";
// T05
export type Layer = "foundation"|"prompt"|"context"|"harness"|"loop"|"graph";
// T05
export interface LayerResult { layer:Layer;scope:Scope;status:LayerStatus;authoritative:boolean;missing_required:string[];unknown_required:string[];baseline_gaps:string[];usage_signals:string[]; }
// T05
export type LayerStatus = "adopted"|"ready"|"blocked"|"not_applicable"|"in_use_unsupported"|"pending";
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
export interface ProtectionObservation { measure:string;protects:string;threat:string;boundary:string;evidence:Evidence[];unknown:string[]; }
// T05
export interface Report {
 report_schema:string;tool_version:string;catalog_version:string;adapters:(Omit<AdapterResult,"sources"|"observations"|"surfaces">&{surfaces:Omit<AdapterSurface,"paths">[]})[];
 generated_at:string;valid_until:string|null;repository:Snapshot["repository"];scope:Snapshot["scope"];target_clis:string[];
 policy:{path:string|null;policy_schema:string;valid:boolean;diagnostics:string[]};
 items:ItemResult[];capabilities:Omit<CapabilityResult,"claims">[];layers:LayerResult[];
 protection_observations:ProtectionObservation[];diagnostics:string[];
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
// T10
export declare function signal(subject: string, claim: string, basis: string, scope?: Scope): Fact;
```

Produces:

```ts
export declare function outsidePath(destination: string, repository: string): Promise<string>;
export declare function writeOutside(destination: string, text: string, repository: string): Promise<void>;
export declare function emitOutput(value: unknown, markdown: string, options: {repository:string;kind:string;out?:string;quiet?:boolean;format?:'markdown'|'json'|'both'}): Promise<string>;
```

## Steps

- [ ] 1. Write the failing test at `tests/cli/output.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,symlink,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { outsidePath,emitOutput } from "../../src/cli/output";
test("explicit output cannot enter the target through symlink aliases",async()=>{
 const base=await mkdtemp(join(tmpdir(),"maat-output-")),repo=join(base,"repo");
 try{
  await mkdir(repo);await symlink(repo,join(base,"alias"));
  await expect(outsidePath(join(base,"alias","report.json"),repo)).rejects.toThrow("output_inside_repository");
  expect(await emitOutput({ok:true},"# Report\n",{repository:repo,kind:"report",out:join(base,"out"),quiet:true})).toBe("");
  expect(await Bun.file(join(base,"out/report.json")).json()).toEqual({ok:true});
  expect(await Bun.file(join(base,"out/report.md")).text()).toBe("# Report\n");
 }finally{await rm(base,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/cli/output'`.

```sh
bun test tests/cli/output.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/cli/output.ts** (complete file)

```ts
import { realpath, mkdir, open, rename, unlink } from "node:fs/promises";
import { resolve,dirname,basename,join,relative,isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { MaatError } from "../errors";
import { canonical } from "../canonical";
async function canonicalFuture(path:string):Promise<string> {
 const tail:string[]=[];let current=resolve(path);
 while(true) {
  try{return join(await realpath(current),...tail.reverse());}
  catch(e) {
   if((e as NodeJS.ErrnoException).code!=="ENOENT") throw new MaatError(3,"output_path");
   const parent=dirname(current);if(parent===current)throw new MaatError(3,"output_path");
   tail.push(basename(current));current=parent;
  }
 }
}
export async function outsidePath(destination:string,repository:string):Promise<string> {
 const root=await canonicalFuture(repository),dest=await canonicalFuture(destination),rel=relative(root,dest);
 if(rel===""||(!rel.startsWith(".."+"/")&&rel!==".."&&!isAbsolute(rel))) throw new MaatError(3,"output_inside_repository");
 return dest;
}
export async function writeOutside(destination:string,text:string,repository:string):Promise<void> {
 const target=await outsidePath(destination,repository);
 await mkdir(dirname(target),{recursive:true});
 await outsidePath(dirname(target),repository);
 const temp=join(dirname(target),"."+basename(target)+"."+randomUUID()+".tmp");
 let file;
 try {
  file=await open(temp,"wx",0o600);await file.writeFile(text,"utf8");await file.sync();await file.close();file=undefined;
  await rename(temp,target);
 } catch(e) {throw e instanceof MaatError?e:new MaatError(3,"output_write");}
 finally {if(file)await file.close();await unlink(temp).catch(()=>{});}
}
export async function emitOutput(value:unknown,markdown:string,o:{repository:string;kind:string;out?:string;quiet?:boolean;format?:"markdown"|"json"|"both"}):Promise<string> {
 const json=canonical(value)+"\n";
 if(o.out) {
  const a=await outsidePath(join(o.out,o.kind+".json"),o.repository);
  const b=await outsidePath(join(o.out,o.kind+".md"),o.repository);
  await writeOutside(a,json,o.repository);await writeOutside(b,markdown,o.repository);
 }
 if(o.quiet)return "";
 return o.format==="json"?json:o.format==="both"?markdown+"\n\u0060\u0060\u0060json\n"+json+"\u0060\u0060\u0060\n":markdown;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/cli/output.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/cli/output.ts tests/cli/output.test.ts
git commit -m '✨ feat(output): protect repository boundaries for report outputs'
```

