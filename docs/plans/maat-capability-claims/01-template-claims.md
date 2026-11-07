# W01 — Say how to assert an optional capability claim

Owner decision 2026-11-07, after the second and third clean skill runs on fvg: both agents copied the `optional_capability_claims` entries of `maat attest template --check harness.verification-wiring` into their attestations, saw nothing change, and only found by trial that the claim name (`evaluation_config`) must go into `claims`. That claim decides whether the harness and loop layers are `blocked` or `ready`. The code is right: `src/evaluate/truth.ts` grants a capability field when an attestation lists the field name or the capability's claim name in `claims`, and attestation objects ignore unknown keys. The template field is a description that nothing explains. The owner chose to explain it in the skill and the CLI contract; no code or output change.

Owner rule: over-design is forbidden. Change only the one skill line, the one spec sentence, and one contract-test assertion.

## Files

- Create: None.
- Modify: `tests/skills/contracts.test.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/skills/contracts.test.ts`.

## Interfaces

Consumes: None.

Produces: None (text only).

## Steps

- [ ] 1. Write the failing test. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("plus source and provided_by");
```

  with

```ts
 expect(diagnose).toContain("plus source and provided_by");
 expect(diagnose).toContain("add its claim name to claims");
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the new `toContain("add its claim name to claims")` fails.

```sh
bun test tests/skills/contracts.test.ts
```

- [ ] 3. Implement.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
Use maat attest template --check prompt.task-spec as the concrete format example.
```

  with

```text
Use maat attest template --check prompt.task-spec as the concrete format example. Its optional_capability_claims field only lists capabilities the same attestation can also grant; maat does not read that field. To assert one, add its claim name to claims (for example evaluation_config) and cover each field it requires in the answer.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.6, replace

```text
`attest template --check <id>` 印出該題 `verification.attestation` 要求的欄位骨架。
```

  with

```text
`attest template --check <id>` 印出該題 `verification.attestation` 要求的欄位骨架；其中 `optional_capability_claims` 只是說明，列出同一份確認還能一併成立的能力，maat 不讀這個欄位。要主張某項能力，把它的 claim 名稱加進 `claims`，回答要涵蓋它列出的欄位。
```

- [ ] 4. Run the focused test; expect exit 0 and 1 passing test. Then run the whole suite; expect `107 pass`, `0 fail`.

```sh
bun test tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-capability-claims/01-template-claims.md
git commit -m '📝 docs(skill): explain how to assert an optional capability claim'
```
