# C02 — Reject answered paths that start with `policy:`

Cloud review of PR #77 (C01), point 1: the `normal` path rule in `src/plan/index.ts` accepts `"policy:/etc/hosts"`, because it does not start with `/`, has no `..` segment, and `posix.normalize` leaves it unchanged. `policy:` is the pseudo-path maat gives the policy file the user named at scan time, and `onDisk` in `src/flow/template.ts` reads the absolute path after that prefix. So an answered `path` or `extra_paths` entry starting with `policy:` lets a plan action read and change a file outside the repository. The answered `path` already had this hole; C01's `extra_paths` shares the same rule. The fix adds one condition to `normal`, so both answers fail with `answer_path` or `answer_extra_paths` (exit 3). Owner rule (2026-11-09): fix this before the next improve run.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: None.
- Modify: `tests/e2e/flow-extra-paths.test.ts`, `src/plan/index.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/flow-extra-paths.test.ts`.

## Interfaces

Consumes:

```ts
// C01
export declare function buildPlan(r:Report,targets:string[],c:Catalog,answers?:unknown):Plan;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. In `tests/e2e/flow-extra-paths.test.ts`, replace

```ts
  expect([bad.code,bad.stderr]).toEqual([3,expect.stringContaining("answer_extra_paths")]);
```

  with

```ts
  expect([bad.code,bad.stderr]).toEqual([3,expect.stringContaining("answer_extra_paths")]);
  const outside=await main(["plan","--report",report,"--target","prompt.task-spec","--answers",await file("outside.json",{[ask.id]:{path:"policy:/etc/hosts"}})],time);
  expect([outside.code,outside.stderr]).toEqual([3,expect.stringContaining("answer_path")]);
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the new `toEqual([3,...])` fails because the plan command accepts `policy:/etc/hosts` and exits 0.

```sh
bun test tests/e2e/flow-extra-paths.test.ts
```

- [ ] 3. Implement. In `src/plan/index.ts`, replace

```ts
&&!p.startsWith("/")&&!p.split("/").includes("..")&&
```

  with

```ts
&&!p.startsWith("/")&&!p.startsWith("policy:")&&!p.split("/").includes("..")&&
```

- [ ] 4. Run the focused test; expect exit 0 and `1 pass`. Then run the whole suite; expect `114 pass`, `0 fail`.

```sh
bun test tests/e2e/flow-extra-paths.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the spec. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
絕對路徑或含 `..` 的路徑
```

  with

```text
絕對路徑、含 `..` 或以 `policy:` 開頭的路徑
```

- [ ] 7. Run the whole suite again; expect `114 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/flow-extra-paths.test.ts src/plan/index.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-plan-scope/02-policy-prefix.md
git commit -m '🔒 fix(plan): reject answered paths that start with policy:'
```
