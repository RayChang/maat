# E05 — Exemption scopes hold their item; pin the unobserved target CLI case

The cloud review of PR #38 (after E04) asked for two fixes; a third (moving the `continue` in `layers.ts` earlier for readability) was marked not necessary and is not done.

1. Since G01, an item appears at a narrower scope only for its own observations, attestations or loops. An exemption with a `scope` (for example `{cli:"codex"}`) no longer shows: when that scope exists for other items, the exempted item is not listed there, so its `exemption_recorded_separately` diagnostic disappears. Before G01 it showed, because every item was listed at every scope. Fix: an exemption's scope also counts as about that item. This only restores what was visible before; exemption scopes do not create new evaluation scopes. Agent assessments keep showing only at scopes the item is listed at; the contract now says so (no code change).
2. The contract sentence added in E04 (a target CLI with no observation or attestation gets no scope) has no test. Pin it in the same new test.

Owner rule: over-design is forbidden. One code term, one test, one sentence.

## Files

- Create: None.
- Modify: `tests/evaluate/scopes.test.ts` (append one test), `src/evaluate/items.ts` (one anchored substring), `docs/specs/2026-11-04-maat-cli-interface.md` (one anchored substring).
- Test paths: `tests/evaluate/scopes.test.ts`.

## Interfaces

Consumes:

```ts
// G01
export declare function itemScopes(i: CatalogItem, s: Snapshot, p: Policy): Set<string>;
// Policy.exemptions: { check; reason; owner; expires_at; fingerprints: { path; sha256 }[]; scope?: Scope }[]
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Write the failing test. Append exactly this to the end of `tests/evaluate/scopes.test.ts`:

```ts
test("an exemption scope holds its item, and an unobserved target CLI gets no scope",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.target_clis=["claude-code"];
 p.attestations=[{check:"foundation.verify-entrypoints",claims:["declared"],answer:"draft",scope:{cli:"codex"}} as never];
 p.exemptions=[{check:"prompt.task-spec",reason:"owner decision",owner:"ray",expires_at:"2027-01-01T00:00:00Z",fingerprints:[{path:"AGENTS.md",sha256:"0".repeat(64)}],scope:{cli:"codex"}}];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 expect(r.items.filter(i=>i.scope.cli==="codex").map(i=>i.id)).toEqual(["foundation.verify-entrypoints","prompt.task-spec"]);
 expect(r.items.find(i=>i.id==="prompt.task-spec"&&i.scope.cli==="codex")!.diagnostics).toContain("exemption_recorded_separately");
 expect(r.items.some(i=>i.scope.cli==="claude-code")).toBe(false);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the new test failing on the first `toEqual` (it receives only `foundation.verify-entrypoints`).

```sh
bun test tests/evaluate/scopes.test.ts
```

- [ ] 3. Implement with two anchored edits. Change nothing else.

  a. In `src/evaluate/items.ts`, replace

```ts
...p.attestations.flatMap(a=>a.check===i.id&&a.scope?[a.scope]:[]),...loops]
```

  with

```ts
...p.attestations.flatMap(a=>a.check===i.id&&a.scope?[a.scope]:[]),...p.exemptions.flatMap(e=>e.check===i.id&&e.scope?[e.scope]:[]),...loops]
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace

```text
題目只出現在 `{}`。
```

  with

```text
題目只出現在 `{}`。題目的豁免所用的範圍也算與該題有關；代理評估只顯示在該題已列出的範圍。
```

- [ ] 4. Run the focused test; expect exit 0 and 3 passing tests. Then run the whole suite; expect 0 failures (95 tests).

```sh
bun test tests/evaluate/scopes.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evaluate/scopes.test.ts src/evaluate/items.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-review-followups/05-exemption-scopes.md
git commit -m '🐛 fix(evaluate): keep exemption scopes on their item'
```
