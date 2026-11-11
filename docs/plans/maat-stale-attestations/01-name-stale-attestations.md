# N01 — Name stale attestations on stderr

Lottery run 3 (2026-11-11): the confirmed policy from an older develop no longer matched the project (19 of 21 attestations cited files that were deleted or changed). `maat evaluate` and `maat scan` exited 0 and printed nothing about it; only `report.json` had `policy.valid: false` and 19 bare `fingerprint_mismatch` strings, which name neither the attestation nor the file. The host had to diff every material by hand. Owner decision (2026-11-11): keep exit code 0, but print a warning on stderr that names each attestation, its check, the file, and whether the file is missing or changed.

The fix has three parts:
- `attestationIssues` reports `fingerprint_mismatch <path> missing` or `fingerprint_mismatch <path> changed` instead of a bare `fingerprint_mismatch`.
- The report's `policy.diagnostics` lists each invalid attestation as `attestations[<index>] <check> <reasons>` (the same form as `maat policy validate`).
- For scan and evaluate, when the report's policy is invalid, stderr starts with `policy_invalid: <n> policy issues; affected claims are unknown`, followed by one line per `policy.diagnostics` entry.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: `tests/e2e/evaluate-stale-policy.test.ts`.
- Modify: `tests/evidence/validity.test.ts`, `src/evidence/validate.ts`, `src/report/index.ts`, `src/cli/main.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/e2e/evaluate-stale-policy.test.ts`, `tests/evidence/validity.test.ts`.

## Interfaces

Consumes:

```ts
export declare function main(argv:string[],now?:string,cwd?:string):Promise<{code:number;stdout:string;stderr:string}>;
export declare function sha256(text:string):string; // src/canonical.ts
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing tests.

  a. Create `tests/e2e/evaluate-stale-policy.test.ts` with exactly this content:

```ts
import { test, expect } from "bun:test";
import { mkdtemp,mkdir,writeFile,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../../src/cli/main";
import { sha256 } from "../../src/canonical";
test("a stale policy is named on stderr: which attestation, which file, missing or changed",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-stale-")),repo=join(root,"repo"),policy=join(root,"policy.json");
 try {
  await mkdir(join(repo,".git"),{recursive:true});await writeFile(join(repo,"README.md"),"Fix login feedback.\n");
  const attest=(path:string)=>({check:"prompt.task-spec",claims:["goal"],answer:"The task explicitly requires fixing login feedback.",
   materials:[{path,sha256:sha256("Old text.\n"),lines:"1-1",quote:"Old text."}],scope:{},attested_by:"ray",
   attested_at:"2026-11-01T00:00:00Z",expires_at:"2027-01-01T00:00:00Z",catalog_version:"0.1.0",adapter_version:{}});
  await writeFile(policy,JSON.stringify({policy_schema:"1.0.0",catalog_version:"0.1.0",target_clis:["claude-code"],scope:{include:["."],exclude:[]},
   applicability:{},targets:{},exemptions:[],attestations:[attest("README.md"),attest("docs/gone.md")]}));
  const r=await main(["scan",repo,"--policy",policy,"--json"],"2026-11-04T12:00:00Z");
  const named=["attestations[0] prompt.task-spec fingerprint_mismatch README.md changed","attestations[1] prompt.task-spec fingerprint_mismatch docs/gone.md missing"];
  expect(r.code).toBe(0);
  expect(r.stderr.split("\n").slice(0,3)).toEqual(["policy_invalid: 2 policy issues; affected claims are unknown",...named]);
  expect(JSON.parse(r.stdout).policy).toMatchObject({valid:false,diagnostics:named});
 } finally {await rm(root,{recursive:true,force:true});}
});
```

  b. In `tests/evidence/validity.test.ts`, replace

```ts
 expect(attestationIssues(a,[{...m,sha256:sha256("changed")}],versions,a.scope,"2026-11-05")).toContain("fingerprint_mismatch");
```

  with

```ts
 expect(attestationIssues(a,[{...m,sha256:sha256("changed")}],versions,a.scope,"2026-11-05")).toContain("fingerprint_mismatch task.md changed");
 expect(attestationIssues(a,[],versions,a.scope,"2026-11-05")).toContain("fingerprint_mismatch task.md missing");
```

- [ ] 2. Run the focused tests; expect exit 1 with `1 pass`, `2 fail`: the new e2e test fails because stderr has no `policy_invalid` line, and the first test in `tests/evidence/validity.test.ts` fails because the reason is still a bare `fingerprint_mismatch`.

```sh
bun test tests/e2e/evaluate-stale-policy.test.ts tests/evidence/validity.test.ts
```

- [ ] 3. Implement. Make these 3 edits in order. Each "replace" text occurs exactly once in its file.

  a. In `src/evidence/validate.ts`, replace

```ts
  if(!found || found.sha256!==e.sha256) {out.push("fingerprint_mismatch");continue;}
```

  with

```ts
  if(!found || found.sha256!==e.sha256) {out.push("fingerprint_mismatch "+e.path+(found?" changed":" missing"));continue;}
```

  b. In `src/report/index.ts`, replace

```ts
 const invalid=items.flatMap(i=>i.attestations.filter(a=>!a.valid).map(a=>a.invalid_reason!));
```

  with

```ts
 const invalid=[...new Set(items.flatMap(i=>i.attestations.filter(a=>!a.valid).map(a=>"attestations["+a.ref+"] "+i.id+" "+a.invalid_reason)))];
```

  c. In `src/cli/main.ts`, replace

```ts
  const stderr=Array.isArray(diagnostics)?(own?diagnostics.map(String):summarize(diagnostics.map(String))).join("\n"):"";
```

  with

```ts
  const policy=result.kind==="report"?(result.value as {policy?:{valid?:boolean;diagnostics?:string[]}}).policy:undefined;
  const warning=policy&&policy.valid===false?["policy_invalid: "+(policy.diagnostics??[]).length+" policy issues; affected claims are unknown",...(policy.diagnostics??[])]:[];
  const stderr=[...warning,...(Array.isArray(diagnostics)?(own?diagnostics.map(String):summarize(diagnostics.map(String))):[])].join("\n");
```

- [ ] 4. Run the focused tests; expect exit 0 and `3 pass`. Then run the whole suite; expect `122 pass`, `0 fail`.

```sh
bun test tests/e2e/evaluate-stale-policy.test.ts tests/evidence/validity.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
without --snapshot it compares fingerprints with the current directory.
```

  with

```text
without --snapshot it compares fingerprints with the current directory. When maat scan or maat evaluate prints policy_invalid on stderr, each following line names an attestation that no longer applies (its index, check, and the file that is missing or changed); redraft only those attestations from the current files and ask the user to confirm them again.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
快照指紋與政策引用的材料指紋不符時，受影響主張為 `unknown` 並附診斷。
```

  with

```text
快照指紋與政策引用的材料指紋不符時，受影響主張為 `unknown` 並附診斷。診斷寫成 `fingerprint_mismatch <路徑> missing|changed`，報告 `policy.diagnostics` 每筆寫成 `attestations[<序號>] <check> <原因>`；政策無效時 scan／evaluate 結束碼仍為 0，但 stderr 第一行印 `policy_invalid: <n> policy issues; affected claims are unknown`，其後逐行列出這些診斷（2026-11-11 補充）。
```

- [ ] 7. Run the whole suite again; expect `122 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/e2e/evaluate-stale-policy.test.ts tests/evidence/validity.test.ts src/evidence/validate.ts src/report/index.ts src/cli/main.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-stale-attestations/01-name-stale-attestations.md
git commit -m '🥅 fix(evaluate): name stale attestations on stderr'
```
