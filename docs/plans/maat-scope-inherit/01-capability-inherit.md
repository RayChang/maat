# N01 — A capability shown for the whole project also counts for each CLI

A second clean skill run on fvg found the harness layer blocked at `{cli:claude-code}` and `{cli:codex}` (`worker_evaluation_requirement`), and the loop layer blocked at the declared loop scope (`conditional_evaluation_requirement`), although the project scope `{}` already had `verify.entrypoint-declared@1` and `verify.entrypoint-documented@1` holding. Capabilities are evaluated per scope, and the entrypoint facts exist only at `{}`, so every narrower scope stayed `unknown`. The agent had to draft 5 extra attestations at scopes the report never listed to unblock those layers. Owner decision 2026-11-06: when a capability is `unknown` at a narrower scope and that scope has no evidence of its own (empty `basis`), it takes the project scope result and claims, with `inherited_from_project_scope` added to its basis; a narrower scope with its own result keeps it, including an `unknown` that has its own basis (a CLI that was not selected, conflicting evidence, an invalid or expired attestation; cloud review of PR #50).

Measured on fvg with the run-2 drafts minus those 5 extra attestations: before, 3 layers blocked; after, none; required-item results unchanged (12 verified, 4 partial). All 99 existing tests pass.

Owner rule: over-design is forbidden. One change at the end of `evaluateCapabilities`, one test file, one contract sentence.

## Files

- Create: `tests/evaluate/capability-inherit.test.ts`.
- Modify: `src/evaluate/capabilities.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evaluate/capability-inherit.test.ts`.

## Interfaces

Consumes:

```ts
export declare function evaluateCapabilities(c: Catalog, scopes: Scope[], s: Snapshot, p: Policy, now: string): CapabilityResult[];
// CapabilityResult: { id: string; scope: Scope; status: Truth; claims: Claim[]; basis: string[] }
export declare function entrypointObservations(s: ScanData, _p: Policy): Observation[];
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Write the failing test. Create `tests/evaluate/capability-inherit.test.ts` with exactly (it contains `\n` and `\"` inside strings; copy it byte-exact):

```ts
import { test,expect } from "bun:test";
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot,makeScan } from "../../src/snapshot";
import { sha256 } from "../../src/canonical";
import { entrypointObservations } from "../../src/detectors/entrypoints";
test("a capability shown for the whole project also counts for each CLI",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.target_clis=["claude-code"];
 p.attestations=[{check:"prompt.task-spec",claims:["goal"],answer:"draft",scope:{cli:"codex"}} as never];
 const materials=[{path:"AGENTS.md",text:"Verification command: bun run test\nVerification purpose: regression\n"},
  {path:"package.json",text:"{\"scripts\":{\"test\":\"bun test\"}}\n"}].map(m=>({...m,sha256:sha256(m.text)}));
 const inv={root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials};
 const cli={detector:"permissions.declarations@1",version:1,scope:{cli:"claude-code"},evidence:[],limits:[],diagnostics:[],facts:[]};
 const s=makeSnapshot(inv,p,[],[...entrypointObservations(makeScan(inv,p),p),cli]);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 const declared=r.capabilities.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.cli==="claude-code")!;
 expect(declared.status).toBe("holds");
 expect(declared.basis).toContain("inherited_from_project_scope");
 expect(r.layers.find(l=>l.layer==="harness"&&l.scope.cli==="claude-code")!.unknown_required).toEqual([]);
 expect(r.capabilities.find(x=>x.id==="verify.entrypoint-declared@1"&&x.scope.cli==="codex")!.status).toBe("unknown");
});
```

- [ ] 2. Run the focused test; expect exit 1 with `expect(declared.status).toBe("holds")` failing (received `unknown`).

```sh
bun test tests/evaluate/capability-inherit.test.ts
```

- [ ] 3. Implement with two anchored edits. Change nothing else.

  a. In `src/evaluate/capabilities.ts`, at the end of `evaluateCapabilities`, replace

```text
  }
 }
 return out;
}
```

  with

```text
  }
 }
 const project=(id:string)=>out.find(x=>x.id===id&&!Object.keys(x.scope).length);
 return out.map(x=>{const base=project(x.id);
  return Object.keys(x.scope).length&&x.status==="unknown"&&!x.basis.length&&base&&base.status!=="unknown"?{...x,status:base.status,claims:base.claims,basis:[...base.basis,"inherited_from_project_scope"]}:x;});
}
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace

```text
代理評估只顯示在該題已列出的範圍。
```

  with

```text
代理評估只顯示在該題已列出的範圍。能力（`capabilities[]`）在較窄範圍沒有自己的證據（`basis` 為空）、結果為 `unknown` 時，沿用專案範圍 `{}` 的結果與各主張，`basis` 附 `inherited_from_project_scope`；較窄範圍有自己的成立或不成立結果時以它為準（2026-11-06 補充）。
```

- [ ] 4. Run the focused test; expect exit 0. Then run the whole suite; expect 0 failures (100 tests).

```sh
bun test tests/evaluate/capability-inherit.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evaluate/capability-inherit.test.ts src/evaluate/capabilities.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-scope-inherit/01-capability-inherit.md
git commit -m '🐛 fix(evaluate): narrower scopes inherit capabilities shown for the project'
```
