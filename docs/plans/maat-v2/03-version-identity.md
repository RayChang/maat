# V03 — Bump the tool version for changed observations

V01 and V02 change machine observations for the same repository and policy. Spec §11.1 requires that the same repository, policy and versions give the same observations, so `tool_version` moves from 0.1.0 to 0.2.0, and `package.json` follows. Adapter versions stay 1.0.0 because no adapter output changed. The controller fixtures embed the tool version in their plans, snapshots and reports, so they are regenerated with the existing v1 script; the regeneration changes only the eight flow JSON files below. Default VD04 applies.

## Files

- Create: None.
- Modify: `src/versions.ts`, `package.json`, `tests/cli/version.test.ts`, `tests/cli/main.test.ts` (one anchored line each); regenerated: `tests/fixtures/flow/approval.json`, `tests/fixtures/flow/base.plan.json`, `tests/fixtures/flow/base.snapshot.json`, `tests/fixtures/flow/candidate.report.json`, `tests/fixtures/flow/candidate.snapshot.json`, `tests/fixtures/flow/evaluation.json`, `tests/fixtures/flow/expired-approval.json`, `tests/fixtures/flow/unauthorized-command.json`.
- Test paths: `tests/cli/version.test.ts`, `tests/cli/main.test.ts`.

## Interfaces

Consumes:

```ts
// T01
export interface Versions {
  tool_version: string; report_schema: string; policy_schema: string;
  ledger_schema: string;
  catalog_version: string;
  adapters: { name: string; adapter_version: string; verified_cli_range: string; checked_at: string }[];
}
// T01
export declare const versions: Versions;
// T40/T41 (script, not an export): scripts/materialize-fixtures.ts writes every fixture from tests/helpers/fixtures.ts
```

Produces:

```ts
// Value change only.
// versions.tool_version === "0.2.0"
```

## Steps

- [ ] 1. Write the failing assertions with two anchored edits. Change only these lines; the `catalog_version` assertion on the next line of `tests/cli/version.test.ts` stays `"0.1.0"`.

  a. In `tests/cli/version.test.ts`, replace

```ts
  expect(versions.tool_version).toBe("0.1.0");
```

  with

```ts
  expect(versions.tool_version).toBe("0.2.0");
```

  b. In `tests/cli/main.test.ts`, replace

```ts
 expect(JSON.parse(v.stdout).tool_version).toBe("0.1.0");
```

  with

```ts
 expect(JSON.parse(v.stdout).tool_version).toBe("0.2.0");
```

- [ ] 2. Run the two focused tests; expect exit 1 with both tests failing on `Expected: "0.2.0"`, `Received: "0.1.0"`.

```sh
bun test tests/cli/version.test.ts tests/cli/main.test.ts
```

- [ ] 3. Make two anchored edits, then regenerate the fixtures.

  a. In `src/versions.ts`, replace `tool_version: "0.1.0",` with `tool_version: "0.2.0",` (the line also holds `report_schema` and `policy_schema`; leave them unchanged).

  b. In `package.json`, replace `"version": "0.1.0",` with `"version": "0.2.0",`.

  c. Regenerate the fixtures with the existing v1 script. It rewrites every fixture from `tests/helpers/fixtures.ts`; all but the eight flow files come out byte-identical. Then confirm the changed set.

```sh
bun scripts/materialize-fixtures.ts
git status --short tests/fixtures
# Expected: exactly these eight modified files
#  M tests/fixtures/flow/approval.json
#  M tests/fixtures/flow/base.plan.json
#  M tests/fixtures/flow/base.snapshot.json
#  M tests/fixtures/flow/candidate.report.json
#  M tests/fixtures/flow/candidate.snapshot.json
#  M tests/fixtures/flow/evaluation.json
#  M tests/fixtures/flow/expired-approval.json
#  M tests/fixtures/flow/unauthorized-command.json
```

- [ ] 4. Run the two focused tests; expect exit 0 and 2 passing tests. Then run the whole suite; expect 0 failures (82 tests after V02).

```sh
bun test tests/cli/version.test.ts tests/cli/main.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
# Runs tsc --noEmit; expected exit 0.
```

- [ ] 6. Commit this task using the exact message below. This is an instruction for a future implementation run; the planning run does not commit.

```sh
git add -- src/versions.ts package.json tests/cli/version.test.ts tests/cli/main.test.ts tests/fixtures/flow/approval.json tests/fixtures/flow/base.plan.json tests/fixtures/flow/base.snapshot.json tests/fixtures/flow/candidate.report.json tests/fixtures/flow/candidate.snapshot.json tests/fixtures/flow/evaluation.json tests/fixtures/flow/expired-approval.json tests/fixtures/flow/unauthorized-command.json
git commit -m '🔖 chore(version): bump tool version to 0.2.0 for changed observations'
```
