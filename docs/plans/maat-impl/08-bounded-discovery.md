# T08 — Inventory files within a canonical repository boundary

DECISION (implementer default): inspect at most 10,000 regular text files, 1 MiB per file, and 32 MiB total, with deterministic lexical traversal. Exceeding a limit marks the inventory incomplete. Read UTF-8 files only. Skip node_modules, vendor, dist, build, credential-looking names, and hidden directories except the explicit repository configuration allowlist. Symlinks are inventoried as unknown and never followed, including internal symlinks; this conservative boundary still satisfies the no-escape rule. `.git/HEAD` may be read, while hooks, objects, config, and credential files are excluded. Include/exclude patterns use Bun.Glob.match only; no subprocess or ignore parser is used. Exclusions are recorded and never turn unknown into absence.

## Files

- Create: `src/discovery/inventory.ts`.
- Modify: None.
- Test path: `tests/discovery/inventory.test.ts`.

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
export interface Material extends Fingerprint { text: string; }
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
export declare function repoId(absolutePath: string): string;
// T05
export type Scope = { cli?: string; workflow?: string; boundary?: string; artifact?: string; evaluator?: string; effect?: string };
// T05
export declare function sha256(value: string | Uint8Array): string;
```

Produces:

```ts
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
export declare function discover(root: string, scope: Policy['scope']): Promise<Inventory>;
```

## Steps

- [ ] 1. Write the failing test at `tests/discovery/inventory.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discover } from "../../src/discovery/inventory";
test("reads configuration, skips secrets, never follows symlinks",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-discovery-"));
 try{
  await mkdir(join(root,".claude")); await mkdir(join(root,".ssh"));
  await writeFile(join(root,"README.md"),"Hello\n");
  await writeFile(join(root,".claude/settings.json"),'{"hooks":{}}');
  await writeFile(join(root,".ssh/id_rsa"),"DO NOT READ");
  await symlink("/etc/passwd",join(root,"escape.md"));
  const r=await discover(root,{include:["."],exclude:[]});
  expect(r.materials.map(m=>m.path)).toEqual([".claude/settings.json","README.md"]);
  expect(r.diagnostics).toContain("symlink_unread: escape.md");
  expect(r.complete).toBe(false);
  expect(r.materials.some(m=>m.text.includes("DO NOT READ"))).toBe(false);
 }finally{await rm(root,{recursive:true,force:true});}
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/discovery/inventory'`.

```sh
bun test tests/discovery/inventory.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/discovery/inventory.ts** (complete file)

```ts
import { realpath, readdir, lstat, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256, repoId } from "../canonical";
import type { Material, Policy } from "../models";
import { MaatError } from "../errors";
export interface Inventory { root:string;repo_id:string;materials:Material[];complete:boolean;diagnostics:string[];limits:string[];include:string[];exclude:string[]; }
export async function discover(input:string,scope:Policy["scope"]):Promise<Inventory> {
 let root:string;
 try {root=await realpath(resolve(input));if(!(await lstat(root)).isDirectory()) throw Error();}
 catch {throw new MaatError(3,"repository_path");}
 const r:Inventory={root,repo_id:repoId(root),materials:[],complete:true,diagnostics:[],
 limits:["10000 files","1 MiB/file","32 MiB total","UTF-8 only","symlinks not followed"],
 include:scope.include,exclude:[...scope.exclude,"node_modules/**","vendor/**","dist/**","build/**","credential paths","unlisted hidden directories"]};
 let total=0,count=0;
 const hidden=new Set([".claude",".codex",".github",".agents",".maat",".git"]);
 const denied=new Set(["node_modules","vendor","dist","build"]);
 const credential=/(^\.env($|\.)|credentials?|secrets?|^id_(rsa|ed25519)$|\.pem$|\.key$|^\.npmrc$|^\.netrc$)/i;
 const pattern=(p:string,g:string)=>g==="." || new Bun.Glob(g).match(p) || p.startsWith(g.replace(/\/$/,"")+"/");
 function diagnostic(s:string){r.complete=false;r.diagnostics.push(s);}
 async function walk(rel:string):Promise<void> {
  let names:string[];
  try{names=(await readdir(join(root,rel))).sort();}catch{diagnostic("read_error: "+rel);return;}
  for(const name of names) {
   const p=rel?rel+"/"+name:name;
   if(denied.has(name)||credential.test(name)) continue;
   if(scope.exclude.some(g=>pattern(p,g))) continue;
   let st;
   try{st=await lstat(join(root,p));}catch{diagnostic("read_error: "+p);continue;}
   if(st.isSymbolicLink()){diagnostic("symlink_unread: "+p);continue;}
   if(st.isDirectory()){
    if(name.startsWith(".") && !hidden.has(name)) continue;
    if(p.startsWith(".git/")) continue;
    await walk(p);continue;
   }
   if(!st.isFile() || (p.startsWith(".git/") && p!==".git/HEAD")) continue;
   if(name.startsWith(".") && ![".gitignore",".tool-versions"].includes(name) && !hidden.has(rel.split("/")[0]!)) continue;
   if(!scope.include.some(g=>pattern(p,g))) continue;
   if(++count>10000 || st.size>1048576 || total+st.size>33554432){diagnostic("scan_limit: "+p);continue;}
   try{
    const bytes=await readFile(join(root,p));
    total+=bytes.length;
    if(bytes.includes(0)){diagnostic("binary_unread: "+p);continue;}
    const text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    r.materials.push({path:p,text,sha256:sha256(bytes)});
   }catch{diagnostic("read_error: "+p);}
  }
 }
 await walk("");return r;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/discovery/inventory.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/discovery/inventory.ts tests/discovery/inventory.test.ts
git commit -m '✨ feat(discovery): read bounded files without running project code'
```

