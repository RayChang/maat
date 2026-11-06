# H02 — Batch review follow-ups: partial corrections, secrets, contract record

The cloud review of PR #39 (H01) left four suggestions; the owner chose to apply all of them (2026-11-06):

1. Record the decision in CLI contract §7.1, like the other 2026-11-06 decisions.
2. Partial corrections. Owner decision: when the user corrects only some items of a batch, the items the user confirmed are recorded now; only the corrected items are redrafted for the next batch.
3. The review document quotes project text; it must never quote secrets.
4. Pin the "only after that confirmation" rule with a contract assertion.

Owner rule: over-design is forbidden. Two skill lines rewritten, two assertions, one contract paragraph.

## Files

- Create: None.
- Modify: `tests/skills/contracts.test.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/skills/contracts.test.ts`.

## Interfaces

Consumes: None.

Produces: None (text only).

## Steps

- [ ] 1. Write the failing assertions. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("write one batch review document in the user's language");
```

  with

```ts
 expect(diagnose).toContain("write one batch review document in the user's language");
 expect(diagnose).toContain("Record drafts as the user's attestations only after that confirmation");
 expect(diagnose).toContain("record the confirmed items now and redraft only the corrected ones");
 expect(diagnose).toContain("never quote secrets");
```

- [ ] 2. Run the focused test; expect exit 1 with the `toContain` for "record the confirmed items now" failing.

```sh
bun test tests/skills/contracts.test.ts
```

- [ ] 3. Implement with three anchored edits. Change nothing else.

  a. In `skills/maat-diagnose/SKILL.md`, replace the line

```text
Before asking for confirmation, write one batch review document in the user's language, in plain words, outside the target repository: per item the question, the drafted answer, each citation as path, line range and a short quote, the claims it supports and those it does not, and what the user must confirm.
```

  with

```text
Before asking for confirmation, write one batch review document in the user's language, in plain words, outside the target repository: per item the question, the drafted answer, each citation as path, line range and a short quote (never quote secrets), the claims it supports and those it does not, and what the user must confirm.
```

  b. In `skills/maat-diagnose/SKILL.md`, replace the line

```text
Ask for one confirmation of the whole batch. Record drafts as the user's attestations only after that confirmation; a correction makes a new draft for the next batch.
```

  with

```text
Ask for one confirmation of the whole batch. Record drafts as the user's attestations only after that confirmation. When the user corrects some items, record the confirmed items now and redraft only the corrected ones for the next batch.
```

  c. In `docs/specs/2026-11-04-maat-cli-interface.md` §7.1, replace

```text
已起草的專案政策檔不會自動跟著改。
```

  with

```text
已起草的專案政策檔不會自動跟著改。

**整批確認稿**（使用者 2026-11-06 補充決定）：機器結果不直接算數，仍由使用者確認。診斷 Skill 請使用者確認前，先在目標 repository 之外寫一份使用者語言的白話確認稿，逐題列出問題、擬好的回答、引用的路徑行數與短引文（不引用機密）、成立與不成立的主張，以及要使用者確認什麼；使用者整批確認一次後才記為使用者確認。使用者只更正部分題目時，已確認的題目先記錄，只有被更正的題目重擬，下一批再確認。Skill 本文維持英文，只有給人看的確認稿用使用者的語言。
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
git add -- tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-batch-review/02-batch-followups.md
git commit -m '📝 docs(skill): record batch review decision and handle partial corrections'
```
