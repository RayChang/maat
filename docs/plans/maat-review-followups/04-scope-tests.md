# E04 — Pin the attestation and loop scope rules, and note the target CLI case

The cloud review of PR #38 (develop to main, covering G01) asked for two follow-ups:

1. `tests/evaluate/scopes.test.ts` only covers the observation rule of `itemScopes`. The other two rules (an attestation for the item uses that scope; the policy declares a loop scope under the item or its layer) have no test, so removing one would silently drop items from reports. Add one test that pins both. The behavior already exists, so this test passes immediately; it guards against regressions.
2. G01 removed the old fallback that added `{cli}` scopes when nothing else existed. CLI contract §5.1 does not say what happens now when a target CLI has no observation or attestation: it gets no separate scope, and its items appear only at `{}`. Add that sentence.

Owner rule: over-design is forbidden. One test and one sentence.

## Files

- Create: None.
- Modify: `tests/evaluate/scopes.test.ts` (append one test), `docs/specs/2026-11-04-maat-cli-interface.md` (one anchored substring).
- Test paths: `tests/evaluate/scopes.test.ts`.

## Interfaces

Consumes:

```ts
// G01
export declare function itemScopes(i: CatalogItem, s: Snapshot, p: Policy): Set<string>;
// T19
export declare function buildReport(s: Snapshot, p: Policy, c: Catalog, now: string, ...rest: unknown[]): Report;
```

Produces: None (test and text only).

## Steps

- [ ] 1. Append exactly this to the end of `tests/evaluate/scopes.test.ts`:

```ts
test("attestation and loop scopes hold only their own items",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 p.applicability={loop:{status:"applicable",loops:[{id:"stop",kind:"execution-feedback",scope:".claude/hooks/stop.sh"}]}};
 p.attestations=[{check:"prompt.task-spec",claims:["goal"],answer:"draft",scope:{cli:"codex"}} as never];
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const r=buildReport(s,p,c,"2026-11-04T00:00:00Z");
 expect(r.items.filter(i=>i.scope.cli==="codex").map(i=>i.id)).toEqual(["prompt.task-spec"]);
 expect(r.items.filter(i=>i.scope.workflow===".claude/hooks/stop.sh").map(i=>i.id)).toEqual(c.items.filter(i=>i.layer.primary==="loop").map(i=>i.id));
});
```

- [ ] 2. Run the focused test; expect exit 0 and 2 passing tests. This test pins existing behavior, so there is no red run; if it fails, stop and report.

```sh
bun test tests/evaluate/scopes.test.ts
```

- [ ] 3. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace

```text
`layers[]` 只在該層於某範圍有題目時列出那個範圍（2026-11-06 補充）。
```

  with

```text
`layers[]` 只在該層於某範圍有題目時列出那個範圍（2026-11-06 補充）。選了目標 CLI，但沒有該 CLI 的觀察或確認時，不另列該 CLI 的範圍，題目只出現在 `{}`。
```

- [ ] 4. Run the whole suite; expect 0 failures (94 tests).

```sh
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evaluate/scopes.test.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-review-followups/04-scope-tests.md
git commit -m '✅ test(evaluate): pin attestation and loop scope rules'
```
