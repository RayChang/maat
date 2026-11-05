# T30 — Ship versioned text resources and deterministic rendering

DECISION (implementer default): v1 ships six text templates and one generic rule-card skill (verify-before-done, delivered in the skills task). Other cards remain complete plan guidance from their extracted contracts; no card is silently treated as a runnable template. No executable hook template is claimed as verified. Rendering rejects missing, empty, extra, or unresolved inputs. All resource metadata and body bytes contribute to plan fingerprints. Template installation is not evidence of compliance.

## Files

- Create: `src/plan/templates.ts`, `scripts/materialize-templates.ts`.
- Modify: None.
- Test path: `tests/templates/render.test.ts`.
- Create from the exact resource recipe in Step 3:
  - <code>templates/foundation/verify-entrypoint.md</code>
  - <code>templates/prompt/task-contract.md</code>
  - <code>templates/context/authority-map.md</code>
  - <code>templates/harness/local-recovery.md</code>
  - <code>templates/loop/result-routing.md</code>
  - <code>templates/graph/handoff.md</code>
  - <code>catalog/templates.yaml</code>

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
export declare function loadCatalog(root?: string): Promise<Catalog>;
// T03
export interface RegistryEntry{ id: string; version: number; [key: string]: unknown; }
// T04
export declare function validateCatalog(catalog: Catalog): void;
```

Produces:

```ts
export interface Template { id:string;version:number;layer:string;rule_card:{id:string;version:number};checks:string[];form:'text'|'config'|'script';parameters:string[];path:string;body:string;supports:string[];cannot_prove:string[];support:string; }
export declare const templateDefinitions: Template[];
export declare function renderTemplate(template: Template, inputs: Record<string,string>): string;
```

## Steps

- [ ] 1. Write the failing test at `tests/templates/render.test.ts` with this complete content.

```ts
import { test, expect } from "bun:test";
import { templateDefinitions,renderTemplate } from "../../src/plan/templates";
import { loadCatalog } from "../../src/catalog/load";
test("missing values and unresolved placeholders cannot produce a usable render",async()=>{
 const t=templateDefinitions.find(t=>t.id==="task-contract")!;
 expect(()=>renderTemplate(t,{goal:"Fix login"})).toThrow("template_input");
 const body=renderTemplate(t,{goal:"Fix login",scope:"Login view",constraints:"API unchanged",acceptance:"Show the specified error"});
 expect(body).toContain("Goal: Fix login");
 expect(body).not.toContain("{{");
 expect(()=>renderTemplate(t,{goal:"{{x}}",scope:"a",constraints:"b",acceptance:"c"})).toThrow("template_unresolved");
 const c=await loadCatalog("catalog");
 expect(c.templates).toHaveLength(6);
 for(const t of templateDefinitions) expect(await Bun.file(t.path).text()).toBe(t.body);
});
```

- [ ] 2. Run the focused test; expect exit 1 and `Cannot find module '../../src/plan/templates'`.

```sh
bun test tests/templates/render.test.ts
```

- [ ] 3. Write the minimal implementation shown below.

**src/plan/templates.ts** (complete file)

```ts
import { MaatError } from "../errors";
export interface Template { id:string;version:number;layer:string;rule_card:{id:string;version:number};
 checks:string[];form:"text"|"config"|"script";parameters:string[];path:string;body:string;
 supports:string[];cannot_prove:string[];support:string; }
export const templateDefinitions:Template[]=[
  {
    "id": "verify-entrypoint",
    "version": 1,
    "layer": "foundation",
    "rule_card": {
      "id": "verify-before-done",
      "version": 1
    },
    "checks": [
      "foundation.verify-entrypoints"
    ],
    "form": "text",
    "parameters": [
      "command",
      "purpose"
    ],
    "path": "templates/foundation/verify-entrypoint.md",
    "body": "Verification command: {{command}}\nVerification purpose: {{purpose}}\nRecord the result and list any verification not performed.\n",
    "supports": [
      "foundation.verify-entrypoints declaration content"
    ],
    "cannot_prove": [
      "Runtime enforcement",
      "Task effectiveness",
      "Future adherence"
    ],
    "support": "text-only"
  },
  {
    "id": "task-contract",
    "version": 1,
    "layer": "prompt",
    "rule_card": {
      "id": "plan-before-act",
      "version": 1
    },
    "checks": [
      "prompt.task-spec"
    ],
    "form": "text",
    "parameters": [
      "goal",
      "scope",
      "constraints",
      "acceptance"
    ],
    "path": "templates/prompt/task-contract.md",
    "body": "Goal: {{goal}}\nScope: {{scope}}\nConstraints: {{constraints}}\nAcceptance: {{acceptance}}\nClarify an absent field before changing the project.\n",
    "supports": [
      "prompt.task-spec declaration content"
    ],
    "cannot_prove": [
      "Runtime enforcement",
      "Task effectiveness",
      "Future adherence"
    ],
    "support": "text-only"
  },
  {
    "id": "authority-map",
    "version": 1,
    "layer": "context",
    "rule_card": {
      "id": "agents-md-core",
      "version": 1
    },
    "checks": [
      "context.instruction-authority"
    ],
    "form": "text",
    "parameters": [
      "cli",
      "source",
      "precedence"
    ],
    "path": "templates/context/authority-map.md",
    "body": "CLI: {{cli}}\nAuthoritative source: {{source}}\nPrecedence: {{precedence}}\nRecord and resolve known conflicting instructions with the owner.\n",
    "supports": [
      "context.instruction-authority declaration content"
    ],
    "cannot_prove": [
      "Runtime enforcement",
      "Task effectiveness",
      "Future adherence"
    ],
    "support": "text-only"
  },
  {
    "id": "local-recovery",
    "version": 1,
    "layer": "harness",
    "rule_card": {
      "id": "rollback-strategy",
      "version": 1
    },
    "checks": [
      "harness.recovery"
    ],
    "form": "text",
    "parameters": [
      "baseline",
      "steps",
      "owner",
      "coverage",
      "exclusions"
    ],
    "path": "templates/harness/local-recovery.md",
    "body": "Baseline: {{baseline}}\nRecovery steps: {{steps}}\nOwner: {{owner}}\nCoverage: {{coverage}}\nExclusions: {{exclusions}}\nPreserve unrelated work; this declaration is not a recovery rehearsal.\n",
    "supports": [
      "harness.recovery declaration content"
    ],
    "cannot_prove": [
      "Runtime enforcement",
      "Task effectiveness",
      "Future adherence"
    ],
    "support": "text-only"
  },
  {
    "id": "result-routing",
    "version": 1,
    "layer": "loop",
    "rule_card": {
      "id": "stop-the-line",
      "version": 1
    },
    "checks": [
      "loop.feedback-routing"
    ],
    "form": "text",
    "parameters": [
      "boundary",
      "routes",
      "authority"
    ],
    "path": "templates/loop/result-routing.md",
    "body": "Evaluation boundary: {{boundary}}\nResult-to-action table: {{routes}}\nDecision authority: {{authority}}\nUnevaluable, error, timeout, and cancel cannot become pass.\n",
    "supports": [
      "loop.feedback-routing declaration content"
    ],
    "cannot_prove": [
      "Runtime enforcement",
      "Task effectiveness",
      "Future adherence"
    ],
    "support": "text-only"
  },
  {
    "id": "handoff",
    "version": 1,
    "layer": "graph",
    "rule_card": {
      "id": "handoff-contract",
      "version": 1
    },
    "checks": [
      "graph.handoff-contract"
    ],
    "form": "text",
    "parameters": [
      "sender",
      "receiver",
      "content",
      "version",
      "missing",
      "stale"
    ],
    "path": "templates/graph/handoff.md",
    "body": "Sender: {{sender}}\nReceiver: {{receiver}}\nRequired content: {{content}}\nVersion binding: {{version}}\nMissing content: {{missing}}\nStale content: {{stale}}\n",
    "supports": [
      "graph.handoff-contract declaration content"
    ],
    "cannot_prove": [
      "Runtime enforcement",
      "Task effectiveness",
      "Future adherence"
    ],
    "support": "text-only"
  }
];
export function renderTemplate(t:Template,inputs:Record<string,string>):string {
 if(Object.keys(inputs).some(k=>!t.parameters.includes(k)))throw new MaatError(3,"template_extra_input");
 for(const key of t.parameters) if(!inputs[key]?.trim())throw new MaatError(3,"template_input: "+key);
 const rendered=t.body.replace(/\{\{([a-z_]+)\}\}/g,(_,k:string)=>inputs[k]!);
 if(!rendered.trim() || /\{\{|\}\}/.test(rendered))throw new MaatError(3,"template_unresolved");
 return rendered;
}
```

**scripts/materialize-templates.ts** (complete file)

```ts
import { mkdir,writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { templateDefinitions } from "../src/plan/templates";
for(const t of templateDefinitions) {
 await mkdir(dirname(t.path),{recursive:true});await writeFile(t.path,t.body);
}
await writeFile("catalog/templates.yaml",JSON.stringify(templateDefinitions,null,2)+"\n");
```

**command: materialize shipped templates** (complete file)

```sh
bun scripts/materialize-templates.ts
```

- [ ] 4. Run the focused test; expect exit 0 and all tests passing.

```sh
bun test tests/templates/render.test.ts
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the specification-writing run does not commit.

```sh
git add -- src/plan/templates.ts scripts/materialize-templates.ts tests/templates/render.test.ts catalog/templates.yaml templates
git commit -m '✨ feat(templates): ship scoped templates with explicit required inputs'
```

