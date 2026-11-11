# P01 — Name the expected adapter version

Lottery run 3 (2026-11-11): attestations scoped to a CLI were rejected with a bare `adapter_incompatible`. `maat attest template` prints `adapter_version: {}`, and nothing told the host that the field must map the CLI to its adapter version (`{"claude-code": "1.0.0"}` worked after guessing). Owner decision (2026-11-11): name the expected value in the reason. The fix changes the reason to `adapter_incompatible (adapter_version.<cli> must be <version>)`; whether an attestation is valid does not change.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/evidence/validity.test.ts`, `src/evidence/validate.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evidence/validity.test.ts`.

## Interfaces

Consumes:

```ts
export declare function attestationIssues(a:Attestation,m:Fingerprint[],v:Versions,scope:Scope,now:string):string[]; // src/evidence/validate.ts
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. In `tests/evidence/validity.test.ts`, replace

```ts
 expect(attestationIssues(a,[m],versions,{workflow:"other"},"2026-11-05")).toContain("scope_mismatch");
```

  with

```ts
 expect(attestationIssues(a,[m],versions,{workflow:"other"},"2026-11-05")).toContain("scope_mismatch");
 expect(attestationIssues({...a,adapter_version:{}},[m],versions,a.scope,"2026-11-05")).toContain("adapter_incompatible (adapter_version.codex must be 1.0.0)");
```

- [ ] 2. Run the focused test; expect exit 1 with `1 pass`, `1 fail`: the first test receives a bare `adapter_incompatible`.

```sh
bun test tests/evidence/validity.test.ts
```

- [ ] 3. Implement. Make this 1 edit. The "replace" text occurs exactly once in its file.

  a. In `src/evidence/validate.ts`, replace

```ts
 if(scope.cli && a.adapter_version[scope.cli]!==v.adapters.find(x=>x.name===scope.cli)?.adapter_version)
  out.push("adapter_incompatible");
```

  with

```ts
 const adapter=scope.cli?v.adapters.find(x=>x.name===scope.cli)?.adapter_version:undefined;
 if(scope.cli && a.adapter_version[scope.cli]!==adapter)
  out.push("adapter_incompatible (adapter_version."+scope.cli+" must be "+(adapter??"a supported adapter")+")");
```

- [ ] 4. Run the focused test; expect exit 0 and `2 pass`. Then run the whole suite; expect `122 pass`, `0 fail`.

```sh
bun test tests/evidence/validity.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
Use maat attest template --check prompt.task-spec as the concrete format example.
```

  with

```text
Use maat attest template --check prompt.task-spec as the concrete format example. For an attestation whose scope names a CLI, set adapter_version to that CLI's adapter version (for example {"claude-code": "1.0.0"}); when it does not match, maat names the expected value.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
要主張某項能力，把它的 claim 名稱加進 `claims`，回答要涵蓋它列出的欄位。兩者都不寫檔。
```

  with

```text
要主張某項能力，把它的 claim 名稱加進 `claims`，回答要涵蓋它列出的欄位。兩者都不寫檔。範圍指定某個 CLI 的確認，`adapter_version` 要寫該 CLI 目前的 adapter 版本；不符時原因寫成 `adapter_incompatible (adapter_version.<cli> must be <版本>)`（2026-11-11 補充）。
```

- [ ] 7. Run the whole suite again; expect `122 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/evidence/validity.test.ts src/evidence/validate.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-adapter-version/01-name-adapter-version.md
git commit -m '🥅 fix(evidence): name the expected adapter version'
```
