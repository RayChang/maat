# X01 — Explain listed claims, the remaining-work count, and other diagnostics in the diagnose skill

alibi run 1 (2026-11-12) ranked three skill gaps after the time message:
- `maat attest template --check foundation.verify-entrypoints` prints `claims: [declared, documented]` and also lists both claims under `optional_capability_claims`. The skill says that field lists capabilities the attestation "can also grant" and to add them to `claims`, so the agent could not tell whether the listed claims were already asserted, or what makes an answer "cover" a field. maat does not check the answer text against those fields (`src/cli/inspect.ts` only prints them).
- The skill names no count to report. The summary line `Items without a result: N (baseline B, advanced A)` (`src/report/index.ts`) is the one that tracks remaining work.
- stderr lines such as `detector_unsupported: 8 entries` are not explained; only `scan_limit` is. `detector_unsupported` means a detector found no input it can read (`src/detectors/index.ts`); the scan is still complete.

Rules of the change: three sentences added to `skills/maat-diagnose/SKILL.md` and one contract test. No code changes.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/skills/contracts.test.ts` (append), `skills/maat-diagnose/SKILL.md` (anchored edits).
- Test paths: `tests/skills/contracts.test.ts`.

## Interfaces

Consumes: `skills/maat-diagnose/SKILL.md` (text only).

Produces: None.

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/skills/contracts.test.ts` (the file ends with a newline; add nothing else):

```ts
test("diagnose skill explains claims already listed, the remaining-work count, and other diagnostics",async()=>{
 const diagnose=await Bun.file("skills/maat-diagnose/SKILL.md").text();
 expect(diagnose).toContain("A claim the template already lists in claims needs no adding");
 expect(diagnose).toContain("is the number to report as remaining work");
 expect(diagnose).toContain("Other diagnostics, such as detector_unsupported");
});
```

- [ ] 2. Run the focused test; expect exit 1 with `1 pass`, `1 fail`: the skill does not have the new sentences yet.

```sh
bun test tests/skills/contracts.test.ts
```

- [ ] 3. Implement. Make these 3 edits, all in `skills/maat-diagnose/SKILL.md`. Each "replace" text occurs exactly once in the file, and each edit changes text inside one existing line.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
in the draft policy and rescan before reviewing items.
```

  with

```text
in the draft policy and rescan before reviewing items. Other diagnostics, such as detector_unsupported, name detectors that found no input they can read; they do not make the scan incomplete, and the items they would inform need an attestation instead.
```

  b. In `skills/maat-diagnose/SKILL.md`, replace

```text
Read the summary first, then use maat explain for the specific check, capability, rule card, or template;
```

  with

```text
Read the summary first; its line Items without a result (with baseline and advanced counts) is the number to report as remaining work. Then use maat explain for the specific check, capability, rule card, or template;
```

  c. In `skills/maat-diagnose/SKILL.md`, replace

```text
To assert one, add its claim name to claims (for example evaluation_config) and cover each field it requires in the answer.
```

  with

```text
To assert one, add its claim name to claims (for example evaluation_config) and cover each field it requires in the answer. A claim the template already lists in claims needs no adding; remove any claim the user's answer does not support. maat does not check the answer text against these fields, so write each one out plainly for the user to confirm, for example: bun run test runs the unit tests (package.json line 11), and AGENTS.md lines 85-87 tell agents to run it before finishing.
```

- [ ] 4. Run the focused test; expect exit 0 and `2 pass`. Then run the whole suite; expect `132 pass`, `0 fail`.

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
git add -- tests/skills/contracts.test.ts skills/maat-diagnose/SKILL.md docs/plans/maat-diagnose-wording/01-claims-count-diagnostics.md
git commit -m '📝 docs(skills): explain listed claims, the remaining-work count, and other diagnostics'
```
