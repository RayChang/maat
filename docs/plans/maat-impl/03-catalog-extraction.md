# T03 — Extract the frozen catalog and load its data files

DECISION (implementer default): JSON text is used as YAML-compatible serialization for generated resources. The extractor preserves every source field and normalizes string attestations to objects. Source mappings and approval history remain in source_metadata. The initial template registry is empty. Item and rule-card paths are exactly the IDs from catalog §8 with .yaml appended; the executable extraction recipe below enumerates them without implementer choices. Do not rerun extraction after editing machine-authoritative files unless intentionally resynchronizing the approved source.

## Files

- Create: `src/catalog/types.ts`, `scripts/extract-catalog.ts`, `src/catalog/load.ts`.
- Modify: None.
- Test path: `tests/catalog/extract.test.ts`.
- Create from the exact resource recipe in Step 3:
  - <code>catalog/items/foundation.verify-entrypoints.yaml</code>
  - <code>catalog/items/foundation.ci-verification.yaml</code>
  - <code>catalog/items/harness.verification-wiring.yaml</code>
  - <code>catalog/items/loop.feedback-routing.yaml</code>
  - <code>catalog/items/context.instruction-authority.yaml</code>
  - <code>catalog/items/foundation.automated-tests.yaml</code>
  - <code>catalog/items/foundation.static-analysis.yaml</code>
  - <code>catalog/items/foundation.dev-environment.yaml</code>
  - <code>catalog/items/foundation.security-signals.yaml</code>
  - <code>catalog/items/prompt.task-spec.yaml</code>
  - <code>catalog/items/prompt.output-contract.yaml</code>
  - <code>catalog/items/prompt.plan-for-nontrivial.yaml</code>
  - <code>catalog/items/context.index-to-details.yaml</code>
  - <code>catalog/items/context.just-in-time.yaml</code>
  - <code>catalog/items/context.reusable-workflows.yaml</code>
  - <code>catalog/items/context.lessons-store.yaml</code>
  - <code>catalog/items/context.instruction-hygiene.yaml</code>
  - <code>catalog/items/context.maintenance.yaml</code>
  - <code>catalog/items/context.code-navigation.yaml</code>
  - <code>catalog/items/harness.permission-boundaries.yaml</code>
  - <code>catalog/items/harness.recovery.yaml</code>
  - <code>catalog/items/harness.isolation.yaml</code>
  - <code>catalog/items/harness.mechanical-enforcement.yaml</code>
  - <code>catalog/items/harness.review-ownership.yaml</code>
  - <code>catalog/items/harness.high-risk-controls.yaml</code>
  - <code>catalog/items/harness.untrusted-input.yaml</code>
  - <code>catalog/items/harness.agent-observability.yaml</code>
  - <code>catalog/items/harness.cost-visibility.yaml</code>
  - <code>catalog/items/harness.outcome-measurement.yaml</code>
  - <code>catalog/items/loop.trigger.yaml</code>
  - <code>catalog/items/loop.acceptance-policy.yaml</code>
  - <code>catalog/items/loop.stopping-policy.yaml</code>
  - <code>catalog/items/loop.bounds.yaml</code>
  - <code>catalog/items/loop.resumable-state.yaml</code>
  - <code>catalog/items/loop.learn-from-results.yaml</code>
  - <code>catalog/items/graph.roles.yaml</code>
  - <code>catalog/items/graph.declared-routes.yaml</code>
  - <code>catalog/items/graph.edge-gates.yaml</code>
  - <code>catalog/items/graph.handoff-contract.yaml</code>
  - <code>catalog/items/graph.human-gates.yaml</code>
  - <code>catalog/items/graph.shared-state.yaml</code>
  - <code>catalog/rule-cards/agents-md-core.yaml</code>
  - <code>catalog/rule-cards/bugfix-workflow.yaml</code>
  - <code>catalog/rule-cards/ci-verify.yaml</code>
  - <code>catalog/rule-cards/contextual-rules.yaml</code>
  - <code>catalog/rule-cards/cost-recording.yaml</code>
  - <code>catalog/rule-cards/data-migration.yaml</code>
  - <code>catalog/rule-cards/definition-of-done.yaml</code>
  - <code>catalog/rule-cards/dependency-discipline.yaml</code>
  - <code>catalog/rule-cards/git-hygiene.yaml</code>
  - <code>catalog/rule-cards/graph-edge-gates.yaml</code>
  - <code>catalog/rule-cards/graph-routing.yaml</code>
  - <code>catalog/rule-cards/handoff-contract.yaml</code>
  - <code>catalog/rule-cards/high-risk-protocol.yaml</code>
  - <code>catalog/rule-cards/human-approval.yaml</code>
  - <code>catalog/rule-cards/incremental-delivery.yaml</code>
  - <code>catalog/rule-cards/instruction-curation.yaml</code>
  - <code>catalog/rule-cards/instruction-maintenance.yaml</code>
  - <code>catalog/rule-cards/instrumentation.yaml</code>
  - <code>catalog/rule-cards/isolation-boundaries.yaml</code>
  - <code>catalog/rule-cards/lessons-file.yaml</code>
  - <code>catalog/rule-cards/loop-budget.yaml</code>
  - <code>catalog/rule-cards/loop-stop-policy.yaml</code>
  - <code>catalog/rule-cards/loop-trigger.yaml</code>
  - <code>catalog/rule-cards/norm-check-mapping.yaml</code>
  - <code>catalog/rule-cards/outcome-evaluation.yaml</code>
  - <code>catalog/rule-cards/permission-boundaries.yaml</code>
  - <code>catalog/rule-cards/plan-before-act.yaml</code>
  - <code>catalog/rule-cards/plan-template.yaml</code>
  - <code>catalog/rule-cards/repo-discovery.yaml</code>
  - <code>catalog/rule-cards/reusable-workflow.yaml</code>
  - <code>catalog/rule-cards/review-checklist.yaml</code>
  - <code>catalog/rule-cards/rollback-strategy.yaml</code>
  - <code>catalog/rule-cards/security-privacy.yaml</code>
  - <code>catalog/rule-cards/shared-state-contract.yaml</code>
  - <code>catalog/rule-cards/static-analysis.yaml</code>
  - <code>catalog/rule-cards/stop-the-line.yaml</code>
  - <code>catalog/rule-cards/subagent-roles.yaml</code>
  - <code>catalog/rule-cards/testing-strategy.yaml</code>
  - <code>catalog/rule-cards/to&#100;o-file.yaml</code>
  - <code>catalog/rule-cards/tripwires.yaml</code>
  - <code>catalog/rule-cards/untrusted-input-boundary.yaml</code>
  - <code>catalog/rule-cards/verification-story.yaml</code>
  - <code>catalog/rule-cards/verify-before-done.yaml</code>
  - <code>catalog/capabilities.yaml</code>
  - <code>catalog/detectors.yaml</code>
  - <code>catalog/templates.yaml</code>
  - <code>catalog/metadata.json</code>

## Interfaces

Consumes:

```ts
// T02
export declare class MaatError extends Error { code: 1 | 2 | 3 | 4; constructor(code: 1 | 2 | 3 | 4, message: string); }
```

Produces:

```ts
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
export interface RegistryEntry{ id: string; version: number; [key: string]: unknown; }
export interface Catalog {
  root: string; catalog_version: string; approved: boolean; items: CatalogItem[];
  capabilities: RegistryEntry[]; detectors: RegistryEntry[]; rule_cards: RegistryEntry[];
  templates: RegistryEntry[]; source_metadata: string;
}
export declare function extractCatalog(markdown: string, out: string): Promise<void>;
export declare function loadCatalog(root?: string): Promise<Catalog>;
export declare function catalogTuples(markdown: string): [string, number, string][];
```

## Steps

- [ ] 1. Write the failing test at `tests/catalog/extract.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractCatalog, catalogTuples } from "../../scripts/extract-catalog";
import { loadCatalog } from "../../src/catalog/load";
test("41 items, 28 detectors, 43 cards, and nine capabilities stay in sync", async () => {
  const d = await mkdtemp(join(tmpdir(),"maat-catalog-"));
  try {
    const md = await Bun.file("docs/specs/2026-11-03-five-layer-catalog.md").text();
    await extractCatalog(md,d);
    const c = await loadCatalog(d);
    expect(c.items).toHaveLength(41);
    expect(c.detectors).toHaveLength(28);
    expect(c.rule_cards).toHaveLength(43);
    expect(c.capabilities).toHaveLength(9);
    expect(c.items.map(i => [i.id,i.item_version,i.baseline.proposed_tier]).sort())
      .toEqual(catalogTuples(md).sort());
    expect(c.items.filter(i => i.baseline.proposed_tier === "baseline")).toHaveLength(23);
    expect(c.items.every(i => Array.isArray(i.verification.attestation.requires))).toBe(true);
  } finally { await rm(d,{recursive:true,force:true}); }
});
test("checked-in catalog matches frozen markdown", async () => {
  const c = await loadCatalog("catalog");
  const md = await Bun.file("docs/specs/2026-11-03-five-layer-catalog.md").text();
  expect(c.items.map(i => [i.id,i.item_version,i.baseline.proposed_tier]).sort())
    .toEqual(catalogTuples(md).sort());
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../scripts/extract-catalog'`.

```sh
bun test tests/catalog/extract.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/catalog/types.ts** (complete file)

```ts
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
export interface RegistryEntry { id: string; version: number; [key: string]: unknown; }
export interface Catalog {
  root: string; catalog_version: string; approved: boolean; items: CatalogItem[];
  capabilities: RegistryEntry[]; detectors: RegistryEntry[]; rule_cards: RegistryEntry[];
  templates: RegistryEntry[]; source_metadata: string;
}
```

**scripts/extract-catalog.ts** (complete file)

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CatalogItem, RegistryEntry } from "../src/catalog/types";
function blocks(markdown: string): CatalogItem[] {
  const section = markdown.split("## 8. ")[1]?.split("## 9. ")[0] ?? "";
  return [...section.matchAll(/\x60{3}yaml\n([\s\S]*?)\x60{3}/g)]
    .map(m => Bun.YAML.parse(m[1]!) as CatalogItem);
}
export function catalogTuples(markdown: string): [string,number,string][] {
  return blocks(markdown).map(i => [i.id,i.item_version,i.baseline.proposed_tier]);
}
export async function extractCatalog(markdown: string, out: string): Promise<void> {
  const items = blocks(markdown);
  if (items.length !== 41) throw Error("catalog_count: expected 41");
  for (const sub of ["items","rule-cards"]) await mkdir(join(out,sub),{recursive:true});
  const cards = new Map<string,RegistryEntry>();
  for (const item of items) {
    const a = item.verification.attestation as unknown;
    if (typeof a === "string") item.verification.attestation = {
      question:a, requires:["範圍","證據指紋","catalog 與 adapter 版本","確認者","有效期限"]
    };
    await writeFile(join(out,"items",item.id+".yaml"),JSON.stringify(item,null,2)+"\n");
    for (const card of item.remediation.rule_cards) {
      const entry = cards.get(card.id) ?? { ...card, contracts: [] };
      (entry.contracts as unknown[]).push({ check:item.id, item_version:item.item_version,
        actions:item.remediation.actions, targets:item.remediation.targets,
        risk:item.remediation.risk, needs_approval:item.remediation.needs_approval,
        verification:item.verification, derived_from:item.sources });
      cards.set(card.id,entry);
    }
  }
  for (const card of cards.values())
    await writeFile(join(out,"rule-cards",card.id+".yaml"),JSON.stringify(card,null,2)+"\n");
  function table(start:string,end:string): RegistryEntry[] {
    const section = markdown.split(start)[1]?.split(end)[0] ?? "";
    return section.split("\n").filter(l => /^\| \x60[^\x60]+@1\x60 \|/.test(l)).map(line => {
      const cells=line.split("|").slice(1,-1).map(s=>s.trim());
      return { id:cells[0]!.replaceAll("\u0060",""),version:1,contract:cells.slice(1) };
    });
  }
  await writeFile(join(out,"capabilities.yaml"),JSON.stringify(table("### 7.1 ","### 7.2 "),null,2)+"\n");
  await writeFile(join(out,"detectors.yaml"),JSON.stringify(table("### 10.1 ","### 10.2 "),null,2)+"\n");
  await writeFile(join(out,"templates.yaml"),"[]\n");
  await writeFile(join(out,"metadata.json"),JSON.stringify({
    catalog_version:"0.1.0",approved:true,
    source_metadata:markdown.split("## 5. ")[1]!.split("## 7. ")[0]
  },null,2)+"\n");
}
if (import.meta.main)
  await extractCatalog(await Bun.file("docs/specs/2026-11-03-five-layer-catalog.md").text(),"catalog");
```

**src/catalog/load.ts** (complete file)

```ts
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MaatError } from "../errors";
import type { Catalog, CatalogItem, RegistryEntry } from "./types";
export async function loadCatalog(root?: string): Promise<Catalog> {
  const here=dirname(fileURLToPath(import.meta.url));
  const path=resolve(root ?? (existsSync(join(here,"../../catalog")) ? join(here,"../../catalog") : join(here,"../catalog")));
  try {
    async function read<T>(file:string):Promise<T> {
      return Bun.YAML.parse(await readFile(join(path,file),"utf8")) as T;
    }
    async function dir<T>(name:string):Promise<T[]> {
      const names=(await readdir(join(path,name))).filter(n=>n.endsWith(".yaml")).sort();
      return Promise.all(names.map(n=>read<T>(name+"/"+n)));
    }
    const meta=await read<{catalog_version:string;approved:boolean;source_metadata:string}>("metadata.json");
    return {root:path,...meta,items:await dir<CatalogItem>("items"),
      rule_cards:await dir<RegistryEntry>("rule-cards"),
      capabilities:await read<RegistryEntry[]>("capabilities.yaml"),
      detectors:await read<RegistryEntry[]>("detectors.yaml"),
      templates:await read<RegistryEntry[]>("templates.yaml")};
  } catch { throw new MaatError(3,"catalog_parse: unreadable or invalid catalog"); }
}
```

**command: extract frozen resources** (complete file)

```sh
bun scripts/extract-catalog.ts
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/catalog/extract.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/catalog/types.ts scripts/extract-catalog.ts src/catalog/load.ts tests/catalog/extract.test.ts catalog
git commit -m '✨ feat(catalog): extract versioned catalog resources'
```

