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
