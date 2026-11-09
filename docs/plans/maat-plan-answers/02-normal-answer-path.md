# A02 — Reject an answered path that is not in normal form

Cloud review of PR #73 (develop to main), must-fix: `maat plan --answers` accepted paths such as `./docs/task.md`, `docs//task.md`, `docs/./task.md`, `.`, `docs/` and ` docs/task.md` as `target_path`. The flow compares paths as exact strings: the before checkpoint must equal the snapshot's normalized repo-relative paths, so the after checkpoint reports `docs/task.md`, which never equals `./docs/task.md`, and maat answers `checkpoint_scope_violation` only after the host has already edited the file. Owner rule (2026-11-08): fix review must-fix items directly. The fix rejects any answered path that is not in normal form instead of rewriting it, because the spec asks for a repo-relative path.

Owner rule: over-design is forbidden. Change only the one path check, its test, and the spec sentence.

## Files

- Create: None.
- Modify: `tests/plan/build.test.ts`, `src/plan/index.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/plan/build.test.ts`.

## Interfaces

Consumes:

```ts
// A01
export declare function buildPlan(r:Report,targets:string[],c:Catalog,answers?:unknown):Plan;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. In `tests/plan/build.test.ts`, replace

```ts
 expect(()=>buildPlan(report,["prompt.task-spec"],c,{[ask.id]:{path:"../a.md"}})).toThrow("answer_path: "+ask.id);
```

  with

```ts
 expect(()=>buildPlan(report,["prompt.task-spec"],c,{[ask.id]:{path:"../a.md"}})).toThrow("answer_path: "+ask.id);
 for(const path of ["./a.md","docs//a.md","docs/./a.md",".","docs/"," a.md"])
  expect(()=>buildPlan(report,["prompt.task-spec"],c,{[ask.id]:{path}})).toThrow("answer_path: "+ask.id);
```

- [ ] 2. Run the focused test; expect exit 1 with `3 pass`, `1 fail`: the test "user answers give an ask action its location and template values" fails because `buildPlan` with `{path:"./a.md"}` does not throw.

```sh
bun test tests/plan/build.test.ts
```

- [ ] 3. Implement.

  a. In `src/plan/index.ts`, replace

```ts
import { reportFingerprints,reportVersionBinding } from "../report";
```

  with

```ts
import { posix } from "node:path";
import { reportFingerprints,reportVersionBinding } from "../report";
```

  b. In `src/plan/index.ts`, replace

```ts
   if(answer.path!==undefined&&(typeof answer.path!=="string"||!answer.path.trim()||answer.path.startsWith("/")||answer.path.split("/").includes("..")))
```

  with

```ts
   if(answer.path!==undefined&&(typeof answer.path!=="string"||!answer.path.trim()||answer.path.trim()!==answer.path||answer.path.startsWith("/")||
    answer.path.split("/").includes("..")||answer.path==="."||answer.path.endsWith("/")||posix.normalize(answer.path)!==answer.path))
```

  c. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.3, replace

```text
對不上任何動作的 id、絕對路徑或含 `..` 的路徑、範本沒有的替換詞都直接報錯（使用者 2026-11-08 決定）。
```

  with

```text
對不上任何動作的 id、絕對路徑或含 `..` 的路徑、範本沒有的替換詞都直接報錯（使用者 2026-11-08 決定）。路徑必須是正規形式，與掃描列出的路徑寫法相同（例如 `docs/a.md`）；`./docs/a.md`、`docs//a.md`、`docs/./a.md`、`.`、結尾是 `/` 或前後有空白的路徑都直接報錯，不代為改寫，因為流程逐字比對路徑。
```

- [ ] 4. Run the focused test; expect exit 0 and `4 pass`. Then run the whole suite; expect `112 pass`, `0 fail`.

```sh
bun test tests/plan/build.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/plan/build.test.ts src/plan/index.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-plan-answers/02-normal-answer-path.md
git commit -m '🐛 fix(plan): reject answered paths that are not in normal form'
```
