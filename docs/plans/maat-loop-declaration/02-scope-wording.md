# L02 — Align the loop-scope wording with L01's behavior

Owner decision 2026-11-08, from the cloud review of L01 (PR #68), minor points 2 and 4:

- The skill sentence lists two kinds of scope where loop items appear: the loop scopes and the CLI scopes with a loop signal. `itemScopes` in `src/evaluate/items.ts` also lists an item at any narrower scope named by an attestation or exemption for it.
- The spec §5.1 sentence says the layer drops its `{}` row whenever loops are declared for "the item or its layer". `evaluateLayers` in `src/evaluate/layers.ts` drops that row only when the layer's own decision (`p.applicability[layer].loops`) declares loops.

The owner chose to fix the wording only. The code stays unchanged.

Owner rule: over-design is forbidden. Change only the one skill sentence, the one spec sentence, and one contract-test assertion.

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
 expect(diagnose).toContain("Each loop scope is one path or glob string");
```

  with

```ts
 expect(diagnose).toContain("Each loop scope is one path or glob string");
 expect(diagnose).toContain("and at a narrower scope an attestation or exemption names");
```

- [ ] 2. Run the focused test; expect exit 1 with `0 pass`, `1 fail`: the new `toContain("and at a narrower scope an attestation or exemption names")` fails.

```sh
bun test tests/skills/contracts.test.ts
```

- [ ] 3. Implement.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
listed only at each loop scope and at CLI scopes where maat observes a loop signal, not at the project scope {}; each listed scope needs its own attestation.
```

  with

```text
listed only at each loop scope, at CLI scopes where maat observes a loop signal, and at a narrower scope an attestation or exemption names, not at the project scope {}; each listed scope needs its own attestation.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace

```text
不列在 `{}`，該層也不列 `{}` 那一列（使用者 2026-11-08 決定）；
```

  with

```text
不列在 `{}`；迴圈宣告在所屬層時，該層也不列 `{}` 那一列（使用者 2026-11-08 決定）；
```

- [ ] 4. Run the focused test; expect exit 0 and 1 passing test. Then run the whole suite; expect `110 pass`, `0 fail`.

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
git add -- tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-loop-declaration/02-scope-wording.md
git commit -m '📝 docs(skill): name every scope where declared loop items appear'
```
