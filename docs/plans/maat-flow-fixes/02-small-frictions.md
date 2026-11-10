# F01 — Explain --quiet and flow list, refuse flow list outside a project, and say how to evaluate attestation-only items

Run 5 of the improve skill on a copy of fvg (2026-11-10) was accepted end to end; the host noted three small frictions. (1) `maat plan ... --quiet > plan.md` produced a 0-byte file: `--quiet` prints nothing to stdout by design, but `maat help` lists it without saying so. (2) `maat flow list --ledger <dir>` run from a directory that is not inside any project took that directory as the repository and failed with `output_inside_repository`, because the ledger sat below it; run from another place it silently listed `[]`. (3) The improve skill did not say what an action's first evaluation is when the item can pass only on an attestation confirmed after the change, or whether a new attestation should replace one the change invalidated. Owner decision (2026-11-10): fix these. The fix adds two lines to `maat help`, makes `flow list` fail with `repository_not_found` (exit 3) when no `.git` or `.maat/policy.yaml` is found above the current directory, and adds two sentences to the improve skill. The existing ledger test now runs `flow list` once from a non-project directory (refused) and once from a directory with `.git` (listed).

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: None.
- Modify: `tests/flow/ledger.test.ts`, `tests/cli/main.test.ts`, `src/cli/args.ts`, `src/cli/flow.ts`, `skills/maat-improve/SKILL.md` (anchored edits).
- Test paths: `tests/flow/ledger.test.ts`, `tests/cli/main.test.ts`.

## Interfaces

Consumes:

```ts
export declare function usage(): string;
export declare function main(argv:string[],now?:string,cwd?:string):Promise<{code:number;stdout:string;stderr:string}>;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing tests. Make three edits.

  a. In `tests/flow/ledger.test.ts`, replace

```ts
import { mkdtemp,writeFile,readFile,readdir,realpath,rm,unlink } from "node:fs/promises";
```

  with

```ts
import { mkdtemp,mkdir,writeFile,readFile,readdir,realpath,rm,unlink } from "node:fs/promises";
```

  b. In `tests/flow/ledger.test.ts`, replace

```ts
 const cwd=await mkdtemp(join(tmpdir(),"maat-cwd-"));
 const cli=await main(["flow","list","--ledger",dir,"--json"],"2026-11-04",cwd).finally(()=>rm(cwd,{recursive:true,force:true}));
```

  with

```ts
 const cwd=await mkdtemp(join(tmpdir(),"maat-cwd-"));
 const outside=await main(["flow","list","--ledger",dir,"--json"],"2026-11-04",cwd);
 expect([outside.code,outside.stderr]).toEqual([3,expect.stringContaining("repository_not_found: run maat flow list inside the project")]);
 await mkdir(join(cwd,".git"));
 const cli=await main(["flow","list","--ledger",dir,"--json"],"2026-11-04",cwd).finally(()=>rm(cwd,{recursive:true,force:true}));
```

  c. In `tests/cli/main.test.ts`, replace

```ts
expect(r.stdout).toContain("Global flags: [--json]");
```

  with

```ts
expect(r.stdout).toContain("Global flags: [--json]");
 expect(r.stdout).toContain("--quiet prints nothing to stdout, so use it only with --out.");
```

- [ ] 2. Run the two focused test files; expect exit 1 with `12 pass`, `2 fail`. The failures: `flow list` from a non-project directory still succeeds (or fails with `output_inside_repository`) instead of `repository_not_found`; `maat help` has no `--quiet` sentence.

```sh
bun test tests/flow/ledger.test.ts tests/cli/main.test.ts
```

- [ ] 3. Implement. Make these 2 edits. Each "replace" text occurs exactly once in its file.

  a. In `src/cli/args.ts`, replace

```ts
    + "\nGlobal flags:" + global.map(k => flag(k, false)).join("") + "\n";
```

  with

```ts
    + "\nGlobal flags:" + global.map(k => flag(k, false)).join("") + "\n"
    + "--out <dir> writes <kind>.json and <kind>.md outside the repository; --quiet prints nothing to stdout, so use it only with --out.\n"
    + "maat flow list lists the flows of the repository that contains the current directory.\n";
```

  b. In `src/cli/flow.ts`, replace

```ts
  const parent=dirname(path);if(parent===path)return realpath(resolve(cwd));path=parent;
```

  with

```ts
  const parent=dirname(path);if(parent===path)throw new MaatError(3,"repository_not_found: run maat flow list inside the project (no .git or .maat/policy.yaml above the current directory)");path=parent;
```

- [ ] 4. Run the focused tests; expect exit 0 and `14 pass`, `0 fail`. Then run the whole suite; expect `117 pass`, `0 fail`.

```sh
bun test tests/flow/ledger.test.ts tests/cli/main.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill. The anchor text occurs exactly once in the file and stays as it is.

  In `skills/maat-improve/SKILL.md`, directly after the sentence

```text
so after attestations change, record a new evaluation for every action with a fresh report.
```

  insert this text on the same line (it begins with the space shown):

```text
 When an item can pass only on an attestation the user confirms after the change, record that action's first evaluation as unknown, draft the attestation, and after the user confirms it record a new evaluation. In the new policy version, replace each attestation the change invalidated instead of keeping both, because any invalid attestation makes the report's policy invalid and blocks accept; keep the ones that are still valid.
```

- [ ] 7. Run the whole suite again; expect `117 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/flow/ledger.test.ts tests/cli/main.test.ts src/cli/args.ts src/cli/flow.ts skills/maat-improve/SKILL.md docs/plans/maat-flow-fixes/02-small-frictions.md
git commit -m '💬 fix(cli): explain quiet and flow list, refuse flow list outside a project'
```
