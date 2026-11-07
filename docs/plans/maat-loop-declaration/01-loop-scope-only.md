# L01 — List declared loop items only at their loop scopes

Owner decision 2026-11-08, after the fourth clean skill run on fvg (b3f7ab85b):

- The skill never said what a loop `scope` is. The agent tried `{}`, `{cli: ...}`, a list and three object shapes, and each failed with `schema_error: $.applicability.loop.loops[0].scope`. Only a string validates, and `evaluationScopes` in `src/evaluate/items.ts` turns it into `{"workflow": <string>}`. The same gap was reported in runs 2 and 3.
- One declared loop made the six loop baseline items required twice. `itemScopes` always adds the project scope `{}` and also adds every declared loop scope, so the same questions appeared at `{}` and at `{"workflow": ...}`. Attestation scopes are exact matches, so the user had to confirm both.
- Required rows went from 23 targets to 36.

The owner chose this change: once the policy declares loops for an item or its layer, list that item only at the loop scopes and at narrower scopes where it was observed or attested, never at `{}`. The layer also gets no `{}` row when it has no items there.

The loop detectors currently emit observations at `{}` with no facts (`detector_unsupported`), so no machine evidence is lost. Measured with a prototype on the run-4 fvg snapshot and its all-confirmed preview policy:

- Required rows went from 36 to 30.
- The loop rows are `loop {"workflow":"tools/fvg-feature-delivery"} adopted` and `loop {"cli":"claude-code"} ready` (one Stop-hook item).
- No `loop {}` row remains.

Owner rule: over-design is forbidden. Change only the item scope set, the layer row skip, one skill sentence, one spec sentence, and the two tests.

## Files

- Create: None.
- Modify: `tests/evaluate/scopes.test.ts`, `tests/skills/contracts.test.ts`, `src/evaluate/items.ts`, `src/evaluate/layers.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evaluate/scopes.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
// src/canonical.ts
export declare function canonical(v: unknown): string;
// src/models.ts
export interface Decision { status: "applicable"|"not_applicable"|"unknown"; reason?: string; owner?: string; expires_at?: string; loops?: {id:string;kind:"execution-feedback"|"event-driven"|"cross-run-improvement";scope:string}[]; }
```

Produces: None (`itemScopes` and `evaluateLayers` keep their signatures).

## Steps

- [ ] 1. Write the failing tests.

  a. In `tests/evaluate/scopes.test.ts`, replace

```ts
 expect(r.items.filter(i=>i.scope.workflow===".claude/hooks/stop.sh").map(i=>i.id)).toEqual(c.items.filter(i=>i.layer.primary==="loop").map(i=>i.id));
});
```

  with

```ts
 expect(r.items.filter(i=>i.scope.workflow===".claude/hooks/stop.sh").map(i=>i.id)).toEqual(c.items.filter(i=>i.layer.primary==="loop").map(i=>i.id));
 expect(r.items.filter(i=>i.layer==="loop"&&!Object.keys(i.scope).length)).toHaveLength(0);
 expect(r.layers.filter(l=>l.layer==="loop").map(l=>l.scope)).toEqual([{workflow:".claude/hooks/stop.sh"}]);
});
```

  b. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("declared under applicability.loop as status: applicable plus loops");
```

  with

```ts
 expect(diagnose).toContain("declared under applicability.loop as status: applicable plus loops");
 expect(diagnose).toContain("Each loop scope is one path or glob string");
```

- [ ] 2. Run the focused tests. Expect exit 1 with `3 pass`, `2 fail`:
  - the scopes test `attestation and loop scopes hold only their own items` fails on `toHaveLength(0)` (received length 7);
  - the contracts test fails on `toContain("Each loop scope is one path or glob string")`.

```sh
bun test tests/evaluate/scopes.test.ts tests/skills/contracts.test.ts
```

- [ ] 3. Implement.

  a. In `src/evaluate/items.ts`, replace

```ts
 return new Set([{},...s.observations.filter(own).map(o=>o.scope),...p.attestations.flatMap(a=>a.check===i.id&&a.scope?[a.scope]:[]),...p.exemptions.flatMap(e=>e.check===i.id&&e.scope?[e.scope]:[]),...loops].map(x=>canonical(x)));
```

  with

```ts
 const scopes=new Set([{},...s.observations.filter(own).map(o=>o.scope),...p.attestations.flatMap(a=>a.check===i.id&&a.scope?[a.scope]:[]),...p.exemptions.flatMap(e=>e.check===i.id&&e.scope?[e.scope]:[]),...loops].map(x=>canonical(x)));
 if(loops.length)scopes.delete(canonical({}));
 return scopes;
```

  b. In `src/evaluate/layers.ts`, replace

```ts
  if(!selected.length&&Object.keys(scope).length)continue;
```

  with

```ts
  if(!selected.length&&(Object.keys(scope).length||fallback?.loops?.length))continue;
```

  c. In `skills/maat-diagnose/SKILL.md`, replace

```text
and scope), and attestations.
```

  with

```text
and scope), and attestations. Each loop scope is one path or glob string (for example tools/feature-delivery/**); maat reports it as the scope {"workflow": that string}. Once loops are declared, the loop items are listed only at each loop scope and at CLI scopes where maat observes a loop signal, not at the project scope {}; each listed scope needs its own attestation.
```

  d. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace

```text
`items[]` 在專案範圍 `{}` 列出每一題；
```

  with

```text
`items[]` 在專案範圍 `{}` 列出每一題，例外是政策為該題或其所屬層宣告了迴圈：這時該題只列在各迴圈範圍與下述與它有關的較窄範圍，不列在 `{}`，該層也不列 `{}` 那一列（使用者 2026-11-08 決定）；
```

- [ ] 4. Run the focused tests; expect exit 0 and `0 fail`. Then run the whole suite; expect `110 pass`, `0 fail`.

```sh
bun test tests/evaluate/scopes.test.ts tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evaluate/scopes.test.ts tests/skills/contracts.test.ts src/evaluate/items.ts src/evaluate/layers.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-loop-declaration/01-loop-scope-only.md
git commit -m '🐛 fix(evaluate): list declared loop items only at their loop scopes'
```
