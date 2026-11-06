# L02 — The skill shows the full loop declaration, including status

The cloud review of PR #45 (L01) found that the new skill hint "loops (declared under applicability.loop.loops as id, kind, scope)" leaves out `status`. `src/policy/load.ts` requires `status` on every applicability decision, and `standard-policy.yaml` has no `loop` key, so an agent that writes only `applicability.loop.loops` gets `schema_error`. Fix the wording and list the three allowed `kind` values.

Owner rule: over-design is forbidden. One skill phrase and its contract assertion.

## Files

- Create: None.
- Modify: `tests/skills/contracts.test.ts`, `skills/maat-diagnose/SKILL.md` (anchored edits).
- Test paths: `tests/skills/contracts.test.ts`.

## Interfaces

Consumes: None.

Produces: None (text only).

## Steps

- [ ] 1. Write the failing assertion. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("declared under applicability.loop.loops");
```

  with

```ts
 expect(diagnose).toContain("declared under applicability.loop as status: applicable plus loops");
```

- [ ] 2. Run the focused test; expect exit 1 with that `toContain` failing.

```sh
bun test tests/skills/contracts.test.ts
```

- [ ] 3. In `skills/maat-diagnose/SKILL.md`, replace

```text
loops (declared under applicability.loop.loops as id, kind, scope)
```

  with

```text
loops (declared under applicability.loop as status: applicable plus loops, each with id, kind (execution-feedback, event-driven or cross-run-improvement) and scope)
```

- [ ] 4. Run the focused test; expect exit 0. Then run the whole suite; expect 0 failures (98 tests).

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
git add -- tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/plans/maat-discoverability/02-loop-status.md
git commit -m '📝 docs(skill): show the full loop declaration with status'
```
