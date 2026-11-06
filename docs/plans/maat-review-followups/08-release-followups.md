# E08 — Follow-ups from the PR #54 review

The cloud review of PR #54 (develop to main) approved it and suggested follow-ups. Two are applied here; the others were marked acceptable without change (a `#` comment inside a code block taken as a heading, a later `project.json` with the same `name` replacing an earlier one, detector ids kept at `@1`).

1. `foundation.ci-verification` now needs a literal CI step for every declared verification entrypoint, while the catalog speaks of designated CI obligations. A project whose declared checks include some that run only locally (for example end-to-end tests) stays `unknown`. Tell the diagnose skill to ask the user which commands are CI obligations and to attest the CI invocation for those.
2. `tests/evaluate/capability-inherit.test.ts` checks inheritance only for `verify.entrypoint-declared@1`. Also pin `verify.entrypoint-documented@1`, so a changed prefix in `capabilities.ts` cannot silently drop it. The behavior already exists, so this assertion passes immediately.

Owner rule: over-design is forbidden. One skill sentence, one contract assertion, one test assertion.

## Files

- Create: None.
- Modify: `tests/skills/contracts.test.ts`, `tests/evaluate/capability-inherit.test.ts`, `skills/maat-diagnose/SKILL.md` (anchored edits).
- Test paths: `tests/skills/contracts.test.ts`, `tests/evaluate/capability-inherit.test.ts`.

## Interfaces

Consumes: None.

Produces: None.

## Steps

- [ ] 1. Write the assertions.

  a. In `tests/skills/contracts.test.ts`, replace

```text
 expect(diagnose).toContain("maat finds verification entrypoints in two forms");
```

  with

```text
 expect(diagnose).toContain("maat finds verification entrypoints in two forms");
 expect(diagnose).toContain("ask the user which commands are CI obligations");
```

  b. In `tests/evaluate/capability-inherit.test.ts`, replace

```text
 expect(declared.basis).toContain("inherited_from_project_scope");
```

  with

```text
 expect(declared.basis).toContain("inherited_from_project_scope");
 expect(r.capabilities.find(x=>x.id==="verify.entrypoint-documented@1"&&x.scope.cli==="claude-code")!.basis).toContain("inherited_from_project_scope");
```

- [ ] 2. Run the focused tests; expect exit 1 with only the new `toContain` in `contracts.test.ts` failing (the capability assertion pins existing behavior and passes).

```sh
bun test tests/skills/contracts.test.ts tests/evaluate/capability-inherit.test.ts
```

- [ ] 3. In `skills/maat-diagnose/SKILL.md`, replace

```text
If the project declares its checks another way, attest them.
```

  with

```text
If the project declares its checks another way, attest them. foundation.ci-verification needs a literal CI step for every declared verification entrypoint; when some declared checks run only locally (for example end-to-end tests), ask the user which commands are CI obligations and attest the CI invocation for those.
```

- [ ] 4. Run the focused tests; expect exit 0. Then run the whole suite; expect 0 failures (106 tests).

```sh
bun test tests/skills/contracts.test.ts tests/evaluate/capability-inherit.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/skills/contracts.test.ts tests/evaluate/capability-inherit.test.ts skills/maat-diagnose/SKILL.md docs/plans/maat-review-followups/08-release-followups.md
git commit -m '📝 docs(skill): ask which checks are CI obligations and pin documented inheritance'
```
