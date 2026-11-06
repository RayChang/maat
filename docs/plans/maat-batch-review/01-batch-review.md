# H01 — Diagnose skill writes one batch review document in the user's language

Owner decision 2026-11-06, after the alibi runs: machine results do not count on their own; the owner keeps confirming. Measured on alibi, the owner confirmed 10 drafted attestations with two short replies, after receiving a plain-language document per round (question, drafted answer, cited lines, what holds and what does not). That document was hand-made by the orchestrator. The diagnose skill should produce it itself. The skill text stays in English (agent-facing); only the document it writes for the user is in the user's language.

Owner rule: over-design is forbidden. Two skill lines and one contract assertion. No new command, no template file.

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
 expect(diagnose).toContain("start the draft policy from standard-policy.yaml next to this skill");
```

  with

```ts
 expect(diagnose).toContain("start the draft policy from standard-policy.yaml next to this skill");
 expect(diagnose).toContain("write one batch review document in the user's language");
```

- [ ] 2. Run the focused test; expect exit 1 with the new `toContain` failing.

```sh
bun test tests/skills/contracts.test.ts
```

- [ ] 3. In `skills/maat-diagnose/SKILL.md`, replace the line

```text
Collect the substantive human answer, quoted line ranges, exact material digests, scope, versions, owner, and expiry.
```

  with these three lines

```text
Collect the substantive human answer, quoted line ranges, exact material digests, scope, versions, owner, and expiry.
Before asking for confirmation, write one batch review document in the user's language, in plain words, outside the target repository: per item the question, the drafted answer, each citation as path, line range and a short quote, the claims it supports and those it does not, and what the user must confirm.
Ask for one confirmation of the whole batch. Record drafts as the user's attestations only after that confirmation; a correction makes a new draft for the next batch.
```

- [ ] 4. Run the focused test; expect exit 0. Then run the whole suite; expect 0 failures (93 tests).

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
git add -- tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/plans/maat-batch-review/01-batch-review.md
git commit -m '✨ feat(skill): diagnose writes one batch review document for the user'
```
