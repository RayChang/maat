# E01 — Count an evaluation as new input per action

Run 4 of the improve skill on a copy of fvg (2026-11-09) could not be accepted. Both actions changed only documentation and were evaluated against the same fresh report of the same files, so their pass evaluations were identical except for `action`. `evaluationFingerprint` in `src/flow/reducer.ts` leaves `action` out, so after A's pass was recorded, B's pass had the same key, was refused `no_new_input`, and `accept` then failed `target_not_verified` for B. The same cause explains run 3's "one report cannot be used for two actions". The no-new-input guard exists to stop repeating the same evaluation of the same action; it should not merge two actions. The fix adds `action` to the key. A ledger that already holds such a cross-action `no_new_input` rejection no longer replays (its recorded reason differs), which is acceptable before release.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Create: None.
- Modify: `tests/flow/checkpoints.test.ts`, `src/flow/reducer.ts` (anchored edits).
- Test paths: `tests/flow/checkpoints.test.ts`.

## Interfaces

Consumes:

```ts
export declare function evaluationFingerprint(r:EvaluationRecord):string;
```

Produces: None (behavior only).

## Steps

- [ ] 1. Write the failing test. In `tests/flow/checkpoints.test.ts`, replace

```ts
  expect(evaluationFingerprint(record)).toBe(evaluationFingerprint({...record,by:"rewritten agent"}));
```

  with

```ts
  expect(evaluationFingerprint(record)).toBe(evaluationFingerprint({...record,by:"rewritten agent"}));
  expect(evaluationFingerprint(record)).not.toBe(evaluationFingerprint({...record,action:"b"}));
```

- [ ] 2. Run the focused test; expect exit 1 with `7 pass`, `1 fail`: the new `not.toBe` fails because two records that differ only in `action` get the same key.

```sh
bun test tests/flow/checkpoints.test.ts
```

- [ ] 3. Implement. In `src/flow/reducer.ts`, replace

```ts
 return sha256(canonical({candidate:r.candidate_fingerprint,method:r.method,
```

  with

```ts
 return sha256(canonical({action:r.action,candidate:r.candidate_fingerprint,method:r.method,
```

- [ ] 4. Run the focused test; expect exit 0 and `8 pass`. Then run the whole suite; expect `117 pass`, `0 fail`.

```sh
bun test tests/flow/checkpoints.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/flow/checkpoints.test.ts src/flow/reducer.ts docs/plans/maat-flow-fixes/01-evaluation-key-action.md
git commit -m '🐛 fix(flow): count an evaluation as new input per action'
```
