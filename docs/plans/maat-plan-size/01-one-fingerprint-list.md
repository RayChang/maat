# T01 — Keep one fingerprint list per plan

Lottery run 3 (2026-11-11): `maat plan` wrote a 311 KB `plan.json` for 7 actions. Every action carried its own `fingerprints` array, and each one was the same list as the plan's top-level `fingerprints` (both come from `reportFingerprints(r)`). Nothing in `src/` reads an action's `fingerprints`; `flow open` and drift checks use the top-level list only (`src/flow/model.ts`).

Rules of the change:
- `buildPlan` no longer writes `fingerprints` on each action; the plan's top-level `fingerprints` is unchanged.
- The plan schema no longer requires `fingerprints` on an action. Plans written by older maat versions, whose actions still carry it, keep parsing because the schema allows extra keys and their own `plan_fingerprint` still matches their content.
- `plan.md` is unchanged.

Measured on the lottery copy (5 actions): `plan.json` goes from 249,634 to 97,394 bytes; apart from the removed arrays and `plan_fingerprint`, the JSON is identical, `plan.md` is byte-identical, and `flow open` accepts both the new plan and the old one. The remaining size is mostly the report diagnostics and the top-level fingerprint list, which this task does not change.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/plan/build.test.ts` (append), `src/plan/types.ts`, `src/plan/index.ts`, `tests/helpers/flow.ts`, `tests/flow/guards.test.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/plan/build.test.ts`.

## Interfaces

Consumes:

```ts
export declare function buildPlan(r:Report,targets:string[],c:Catalog,answers?:unknown):Plan; // src/plan/index.ts
export declare function parsePlan(text:string):Plan; // src/plan/index.ts
```

Produces: `PlanAction` in `src/plan/types.ts` loses its `fingerprints` field; `Plan.fingerprints` stays.

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/plan/build.test.ts` (the file ends with a newline; add nothing else):

```ts
test("plan actions do not repeat the plan's fingerprint list, and older plans that repeat it still parse",async()=>{
 const {canonical,sha256}=await import("../../src/canonical");
 const p=emptyPolicy(),c=await loadCatalog("catalog");
 const s=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 const plan=buildPlan(buildReport(s,p,c,"2026-11-04T00:00:00Z"),[],c);
 expect(plan.actions).toHaveLength(3);
 expect(plan.actions.map(a=>"fingerprints" in a)).toEqual([false,false,false]);
 const unsigned=JSON.parse(JSON.stringify(plan)) as {plan_fingerprint?:string;actions:Record<string,unknown>[]};
 delete unsigned.plan_fingerprint;
 unsigned.actions.forEach(a=>{a.fingerprints=[{path:"AGENTS.md",sha256:sha256("# Agents\n")}];});
 const older={...unsigned,plan_fingerprint:sha256(canonical(unsigned))};
 expect(parsePlan(JSON.stringify(older))).toEqual(older as unknown as typeof plan);
});
```

- [ ] 2. Run the focused test; expect exit 1 with `4 pass`, `1 fail`: every action still has `fingerprints`.

```sh
bun test tests/plan/build.test.ts
```

- [ ] 3. Implement. Make these 7 edits. Each "replace" text occurs exactly once in its file. Edits b to e are all in `src/plan/index.ts`; edits d and e are inside the long one-line schema near the end of that file.

  a. In `src/plan/types.ts`, replace

```ts
 fingerprints:Fingerprint[];fix_conditions:{max_fixes:number};stop_conditions:string[];
```

  with

```ts
 fix_conditions:{max_fixes:number};stop_conditions:string[];
```

  b. In `src/plan/index.ts`, replace

```ts
  const command:string|null=null,fingerprints=reportFingerprints(r);
```

  with

```ts
  const command:string|null=null;
```

  c. In `src/plan/index.ts`, replace

```ts
manual:contract.verification.attestation.question},fingerprints,fix_conditions:
```

  with

```ts
manual:contract.verification.attestation.question},fix_conditions:
```

  d. In `src/plan/index.ts`, replace

```ts
"role_approval_required","verification","fingerprints","fix_conditions","stop_conditions"]
```

  with

```ts
"role_approval_required","verification","fix_conditions","stop_conditions"]
```

  e. In `src/plan/index.ts`, replace

```ts
"manual":{"type":"string"}}},"fingerprints":{"type":"array","items":{"type":"object","required":["path","sha256"],"properties":{"path":{"type":"string"},"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}}}},"stop_conditions"
```

  with

```ts
"manual":{"type":"string"}}},"stop_conditions"
```

  f. In `tests/helpers/flow.ts`, replace

```ts
 fingerprints,fix_conditions:{max_fixes:1},
```

  with

```ts
 fix_conditions:{max_fixes:1},
```

  g. In `tests/flow/guards.test.ts`, replace

```ts
manual:"Review task"},fingerprints:current,
```

  with

```ts
manual:"Review task"},
```

- [ ] 4. Run the focused test; expect exit 0 and `5 pass`. Then run the whole suite; expect `128 pass`, `0 fail`.

```sh
bun test tests/plan/build.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the spec. Make this 1 edit; the "replace" text occurs exactly once in its file.

  a. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
每個動作的 `fix_conditions` 與 `stop_conditions`，供 `flow open` 綁定。
```

  with

```text
每個動作的 `fix_conditions` 與 `stop_conditions`，供 `flow open` 綁定。證據指紋只在計畫最上層的 `fingerprints` 列一份，動作不再各自重複（2026-11-12 補充）；舊計畫的動作若帶 `fingerprints`，仍可讀取，但不使用。
```

- [ ] 7. Run the whole suite again; expect `128 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/plan/build.test.ts src/plan/types.ts src/plan/index.ts tests/helpers/flow.ts tests/flow/guards.test.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-plan-size/01-one-fingerprint-list.md
git commit -m '⚡️ perf(plan): keep one fingerprint list instead of one per action'
```
