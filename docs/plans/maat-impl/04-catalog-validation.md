# T04 — Validate catalog references and expose catalog validate

Validate before consuming catalog data. Duplicate IDs are rejected within each namespace, and every versioned reference resolves exactly. The approved built-in version is 0.1.0; an overridden catalog remains explicitly non-authoritative regardless of its claimed approval metadata. Capability-provider links, item prerequisites, and supplied dependency arrays are checked for cycles.

## Files

- Create: `src/catalog/validate.ts`.
- Modify: `src/cli/index.ts`.
- Test path: `tests/catalog/validate.test.ts`.

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
```

Produces:

```ts
export declare function validateCatalog(catalog: Catalog): void;
export declare function assertAcyclic(graph: Record<string, string[]>): void;
```

## Steps

- [ ] 1. Write the failing test at `tests/catalog/validate.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { loadCatalog } from "../../src/catalog/load";
import { validateCatalog, assertAcyclic } from "../../src/catalog/validate";
test("frozen catalog validates and corrupted references fail", async () => {
  const c=await loadCatalog("catalog");
  expect(()=>validateCatalog(c)).not.toThrow();
  const duplicate=structuredClone(c); duplicate.items.push(duplicate.items[0]!);
  expect(()=>validateCatalog(duplicate)).toThrow("duplicate_id");
  const ref=structuredClone(c); ref.items[0]!.inspection.detectors.push("absent@1");
  expect(()=>validateCatalog(ref)).toThrow("unknown_reference");
  const missing=structuredClone(c); delete (missing.items[0] as unknown as Record<string,unknown>).sources;
  expect(()=>validateCatalog(missing)).toThrow("missing_contract");
  expect(()=>assertAcyclic({a:["b"],b:["a"]})).toThrow("dependency_cycle");
  const cycle=structuredClone(c);
  cycle.items.find(i=>i.id==="foundation.verify-entrypoints")!.prerequisites.required=["verify.entrypoint-declared@1"];
  expect(()=>validateCatalog(cycle)).toThrow("dependency_cycle");
  const malformed=structuredClone(c);(malformed.items[0]!.inspection as unknown as {detectors:unknown}).detectors=null;
  expect(()=>validateCatalog(malformed)).toThrow("catalog_shape");
  const run=Bun.spawnSync([process.execPath,"src/cli/index.ts","catalog","validate"]);
  expect(run.exitCode).toBe(0);
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/catalog/validate'`.

```sh
bun test tests/catalog/validate.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/catalog/validate.ts** (complete file)

```ts
import { MaatError } from "../errors";
import type { Catalog, RegistryEntry } from "./types";
const fail=(m:string):never=>{throw new MaatError(3,m);};
export function assertAcyclic(graph:Record<string,string[]>):void {
  const visiting=new Set<string>(), done=new Set<string>();
  function visit(id:string):void {
    if(visiting.has(id)) fail("dependency_cycle: "+id);
    if(done.has(id)) return;
    if(!(id in graph)) fail("unknown_reference: "+id);
    visiting.add(id);
    for(const next of graph[id]!) visit(next);
    visiting.delete(id);done.add(id);
  }
  Object.keys(graph).forEach(visit);
}
export function validateCatalog(c:Catalog):void {
  if(!c || c.catalog_version !== "0.1.0") fail("catalog_version");
  const required=["id","question","baseline","layer","applicability","inspection","evidence_requirements",
    "prerequisites","remediation","verification","sources","item_version","catalog_version"];
  const registries=[c.items,c.capabilities,c.detectors,c.rule_cards,c.templates];
  for(const entries of registries) {
    if(!Array.isArray(entries)) fail("catalog_array");
    const ids=new Set<string>();
    for(const e of entries) {
      if(!e || typeof e.id!=="string" || !/^[a-z][a-z0-9.@-]*$/.test(e.id)) fail("catalog_id");
      if(ids.has(e.id)) fail("duplicate_id: "+e.id);
      ids.add(e.id);
    }
  }
  const caps=new Set(c.capabilities.map(x=>x.id)), detectors=new Set(c.detectors.map(x=>x.id));
  const cards=new Set(c.rule_cards.map(x=>x.id+"@"+x.version));
  const templates=new Set(c.templates.map(x=>x.id+"@"+x.version));
  const check=(id:string,set:Set<string>)=>{if(!set.has(id)) fail("unknown_reference: "+id);};
  for(const i of c.items) {
    for(const key of required) if((i as unknown as Record<string,unknown>)[key] == null)
      fail("missing_contract: "+i.id+"."+key);
    if(i.item_version!==1 || i.catalog_version!==c.catalog_version) fail("item_version: "+i.id);
    if(!["foundation","prompt","context","harness","loop","graph"].includes(i.layer.primary)) fail("layer");
    if(!["baseline","advanced"].includes(i.baseline.proposed_tier)) fail("tier");
    if(!Array.isArray(i.sources) || !i.sources.length) fail("missing_contract: sources");
    if(!Array.isArray(i.inspection.detectors)||!Array.isArray(i.verification.rerun)||
      !Array.isArray(i.prerequisites.required)||!Array.isArray(i.prerequisites.recommended)||
      !Array.isArray(i.remediation.rule_cards)||!Array.isArray(i.remediation.actions)||
      !i.verification.attestation||typeof i.verification.attestation!=="object")
      fail("catalog_shape: "+i.id);
    if(i.prerequisites.conditional!==undefined&&!Array.isArray(i.prerequisites.conditional))fail("catalog_shape: conditional");
    for(const x of i.prerequisites.conditional??[])if(!Array.isArray(x.required)||!Array.isArray(x.recommended))fail("catalog_shape: conditional");
    for(const d of [...i.inspection.detectors,...i.verification.rerun]) check(d,detectors);
    for(const r of i.remediation.rule_cards) check(r.id+"@"+r.version,cards);
    for(const r of i.prerequisites.required) check(typeof r==="string"?r:r.capability,caps);
    for(const r of i.prerequisites.recommended) check(r,caps);
    for(const x of i.prerequisites.conditional??[])
      for(const r of [...x.required,...x.recommended]) check(r,caps);
    if(typeof i.verification.attestation.question!=="string" ||
      !Array.isArray(i.verification.attestation.requires)) fail("attestation_contract");
  }
  const graph:Record<string,string[]>={};
  for(const e of [...c.capabilities,...c.detectors,...c.rule_cards,...c.templates] as RegistryEntry[]) {
    if(e.version!==1) fail("registry_version");
    graph[e.id]=Array.isArray(e.depends_on)?e.depends_on as string[]:[];
    if(Array.isArray(e.templates)) for(const t of e.templates as string[]) check(t,templates);
  }
  assertAcyclic(graph);
  const providers:Record<string,string>={"verify.entrypoint-declared@1":"foundation.verify-entrypoints","verify.entrypoint-documented@1":"foundation.verify-entrypoints","evaluation.config-declared@1":"harness.verification-wiring","evaluation.run-recorded@1":"harness.verification-wiring","recovery.local-source-plan-declared@1":"harness.recovery","recovery.effect-plan-declared@1":"harness.recovery","loop.acceptance-policy-declared@1":"loop.acceptance-policy","loop.stopping-policy-declared@1":"loop.stopping-policy","loop.feedback-routing-declared@1":"loop.feedback-routing"};
  const prerequisites:Record<string,string[]>={};
  for(const capability of c.capabilities)prerequisites["cap:"+capability.id]=providers[capability.id]?["item:"+providers[capability.id]]:[];
  for(const i of c.items)prerequisites["item:"+i.id]=[
   ...i.prerequisites.required.map(r=>typeof r==="string"?r:r.capability),
   ...i.prerequisites.recommended,
   ...(i.prerequisites.conditional??[]).flatMap(x=>[...x.required,...x.recommended])
  ].map(id=>"cap:"+id);
  assertAcyclic(prerequisites);
}
```

**src/cli/index.ts** (replace complete file)

```ts
#!/usr/bin/env bun
import { versions } from "../versions";
import { MaatError } from "../errors";
import { parseArgs,one } from "./args";
import { loadCatalog } from "../catalog/load";
import { validateCatalog } from "../catalog/validate";
try {
  const args=parseArgs(process.argv.slice(2));
  let result:unknown;
  if(args.command==="version") result=versions;
  else if(args.command==="catalog validate") {
    const catalog=await loadCatalog(one(args,"catalog")); validateCatalog(catalog);
    result={valid:true,catalog_version:catalog.catalog_version};
  } else throw new MaatError(2,"usage_error: command is not connected");
  if(!one(args,"quiet")) console.log(JSON.stringify(result,null,one(args,"json")?0:2));
} catch(error) {
  console.error(error instanceof Error?error.message:"internal_error");
  process.exitCode=error instanceof MaatError?error.code:1;
}
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/catalog/validate.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/catalog/validate.ts src/cli/index.ts tests/catalog/validate.test.ts
git commit -m '✨ feat(catalog): reject invalid catalog contracts and references'
```

