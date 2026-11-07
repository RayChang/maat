# X01 — Let policy validate check fingerprints against a saved snapshot

Owner decision 2026-11-07: the third clean skill run on fvg and the W01 reviewer both saw `maat policy validate <file>` fail with `policy_invalid: fingerprint_mismatch` while `maat evaluate` accepted the same attestations. Cause: `policy validate` compares attestation and exemption fingerprints with files discovered under the current working directory (`src/cli/inspect.ts`), and the diagnose skill keeps the draft policy outside the target repository, so it is never run from the repository root. The fix adds `--snapshot <file>` to `policy validate`: with it, fingerprints are compared with the saved snapshot (materials and versions, as `evaluate` does) and the repository is not read; without it, behaviour is unchanged. The skill and the CLI contract say so. Measured on the run-3 fvg projection policy: without `--snapshot`, `policy_invalid: fingerprint_mismatch`; with the run-3 snapshot, `{"policy_schema":"1.0.0","valid":true}`.

Owner rule: over-design is forbidden. Change only what the steps show.

## Files

- Create: None.
- Modify: `tests/cli/inspect.test.ts` (complete file), `tests/skills/contracts.test.ts`, `src/cli/args.ts`, `src/cli/inspect.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/cli/inspect.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
// src/cli/inspect.ts
export declare function runInspectCommand(a: Args, now: string, cwd?: string): Promise<CommandResult>;
// src/cli/audit.ts
export declare function runAuditCommand(a: Args, now: string): Promise<CommandResult>; // CommandResult.snapshot is set by scan
// src/snapshot.ts
export declare function parseSnapshot(text: string): Snapshot; // Snapshot.materials, Snapshot.versions
// src/canonical.ts
export declare function sha256(text: string): string;
```

Produces: CLI flag `--snapshot <file>` on `maat policy validate`.

## Steps

- [ ] 1. Write the failing tests.

  a. Replace the whole content of `tests/cli/inspect.test.ts` with exactly the block below. It contains the escape sequence backslash-n inside a string literal; keep it byte-exact (check with `od -c` that the file has a backslash followed by `n`, not a line break, inside `const text=...`).

````ts
import { test, expect } from "bun:test";
import { runInspectCommand } from "../../src/cli/inspect";
import { parseArgs } from "../../src/cli/args";
import { runAuditCommand } from "../../src/cli/audit";
import { sha256 } from "../../src/canonical";
import { mkdtemp,writeFile,rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("focused explain and skeleton preserve manual requirements",async()=>{
 const time="2026-11-04T00:00:00Z";
 const e=await runInspectCommand(parseArgs(["explain","prompt.task-spec"]),time);
 expect((e.value as {id:string}).id).toBe("prompt.task-spec");
 const a=await runInspectCommand(parseArgs(["attest","template","--check","prompt.task-spec"]),time);
 expect((a.value as {claims:string[]}).claims).toEqual(["goal","scope","constraints","acceptance"]);
 const list=await runInspectCommand(parseArgs(["catalog","list","--layer","prompt","--tier","baseline"]),time);
 expect((list.value as unknown[]).length).toBe(2);
 await expect(runInspectCommand(parseArgs(["explain","unknown"]),time)).rejects.toThrow("unknown_id");
});
test("policy validate checks attestations against a saved snapshot, not the working directory",async()=>{
 const root=await mkdtemp(join(tmpdir(),"maat-validate-")),input=await mkdtemp(join(tmpdir(),"maat-validate-in-"));
 try{
  const text="Goal: fix login feedback.\nScope: only the login view.\n";
  await writeFile(join(root,"task.md"),text);
  const scan=await runAuditCommand(parseArgs(["scan",root]),"2026-11-04T00:00:00Z");
  const snapshot=join(input,"snapshot.json");await writeFile(snapshot,JSON.stringify(scan.snapshot));
  const policy=join(input,"policy.yaml");
  await writeFile(policy,JSON.stringify({policy_schema:"1.0.0",catalog_version:"0.1.0",attestations:[{check:"prompt.task-spec",claims:["goal"],
   answer:"The task names the goal and the scope.",materials:[{path:"task.md",sha256:sha256(text),lines:"1-2",quote:text.trimEnd()}],
   scope:{},attested_by:"ray",attested_at:"2026-11-04T00:00:00Z",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}}]}));
  const time="2026-11-05T00:00:00Z";
  await expect(runInspectCommand(parseArgs(["policy","validate",policy]),time,input)).rejects.toThrow("fingerprint_mismatch");
  const checked=await runInspectCommand(parseArgs(["policy","validate",policy,"--snapshot",snapshot]),time,input);
  expect(checked.value).toEqual({valid:true,policy_schema:"1.0.0"});
 }finally{await rm(root,{recursive:true,force:true});await rm(input,{recursive:true,force:true});}
});
````

  b. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("add its claim name to claims");
```

  with

```ts
 expect(diagnose).toContain("add its claim name to claims");
 expect(diagnose).toContain("maat policy validate <file> --snapshot <saved snapshot>");
```

- [ ] 2. Run the focused tests; expect exit 1 with `1 pass`, `2 fail`: the new inspect test fails with `usage_error: unknown flag --snapshot (run maat help)` (its first assertion, the `fingerprint_mismatch` rejection without `--snapshot`, already passes), and the contracts test fails on the new `toContain`.

```sh
bun test tests/cli/inspect.test.ts tests/skills/contracts.test.ts
```

- [ ] 3. Implement.

  a. In `src/cli/args.ts`, replace

```ts
"policy validate": { flags: [], max: 1 },
```

  with

```ts
"policy validate": { flags: ["snapshot"], max: 1 },
```

  b. In `src/cli/inspect.ts`, replace

```ts
import { resolve } from "node:path";
```

  with

```ts
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { parseSnapshot } from "../snapshot";
```

  c. In `src/cli/inspect.ts`, replace

```ts
  const inventory=await discover(cwd,p.scope);
  const issues=p.attestations.flatMap(x=>attestationIssues(x,inventory.materials,versions,x.scope,now));
  for(const e of p.exemptions)if(!decisionValid(e,now)||!e.fingerprints.length||!e.fingerprints.every(f=>inventory.materials.some(m=>m.path===f.path&&m.sha256===f.sha256)))issues.push("invalid_exemption");
```

  with

```ts
  const file=one(a,"snapshot");
  let text="";if(file)try{text=await readFile(file,"utf8");}catch{throw new MaatError(3,"input_read: "+file);}
  const s=file?parseSnapshot(text):undefined;
  const materials=s?s.materials:(await discover(cwd,p.scope)).materials;
  const issues=p.attestations.flatMap(x=>attestationIssues(x,materials,s?s.versions:versions,x.scope,now));
  for(const e of p.exemptions)if(!decisionValid(e,now)||!e.fingerprints.length||!e.fingerprints.every(f=>materials.some(m=>m.path===f.path&&m.sha256===f.sha256)))issues.push("invalid_exemption");
```

  d. In `skills/maat-diagnose/SKILL.md`, replace

```text
Use maat evaluate with the saved snapshot; it must not reread repository files.
```

  with

```text
Use maat evaluate with the saved snapshot; it must not reread repository files. Check a draft policy with maat policy validate <file> --snapshot <saved snapshot>; without --snapshot it compares fingerprints with the current directory.
```

  e. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.6, replace

```text
`policy validate [file]` 檢查 schema、catalog 版本相容、attestation 必填欄位與到期。
```

  with

```text
`policy validate [file] [--snapshot <file>]` 檢查 schema、catalog 版本相容、attestation 必填欄位與到期；確認與豁免的檔案指紋，有 `--snapshot` 時與快照比對、不讀專案，沒有時與目前目錄比對。
```

- [ ] 4. Run the focused tests; expect exit 0 and 3 passing tests. Then run the whole suite; expect `108 pass`, `0 fail`.

```sh
bun test tests/cli/inspect.test.ts tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/cli/inspect.test.ts tests/skills/contracts.test.ts src/cli/args.ts src/cli/inspect.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-policy-validate/01-validate-snapshot.md
git commit -m '🐛 fix(cli): let policy validate check fingerprints against a saved snapshot'
```
