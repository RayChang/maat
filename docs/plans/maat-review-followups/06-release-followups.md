# E06 — Follow-ups from the PR #48 review

The cloud review of PR #48 (develop to main) asked for three small follow-ups; a fourth (`maat help --json` prints plain text) was marked acceptable and is not changed.

1. `line_hashes` are 32-bit prefixes of per-line hashes. A short, guessable line (for example `PORT=3000`) can be confirmed by dictionary comparison. Say in CLI contract §3.2 that snapshots stay sensitive material.
2. The quote check has two paths: stored `line_hashes` (snapshot) and hashes computed from `text` (scan time). The J01 test covers only the first. Pin the second with one assertion. The behavior already exists, so this assertion passes immediately.
3. `countsFor` in `src/canonical.ts` relies on `evaluator:"command"`, which only the CI detector produces. Add a one-line comment where the CI detector builds that scope.

Owner rule: over-design is forbidden. One sentence, one assertion, one comment.

## Files

- Create: None.
- Modify: `tests/evidence/validity.test.ts`, `src/detectors/ci.ts`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evidence/validity.test.ts`.

## Interfaces

Consumes:

```ts
export declare function attestationIssues(a: Attestation, m: Fingerprint[], v: Versions, scope: Scope, now: string): string[];
```

Produces: None.

## Steps

- [ ] 1. In `tests/evidence/validity.test.ts`, replace

```text
 expect(attestationIssues(base,[{path:m.path,sha256:m.sha256}],versions,{},"2026-11-05")).toContain("citation_mismatch");
```

  with

```text
 expect(attestationIssues(base,[{path:m.path,sha256:m.sha256}],versions,{},"2026-11-05")).toContain("citation_mismatch");
 const scanned={path:m.path,sha256:m.sha256,text};
 expect(attestationIssues(base,[scanned],versions,{},"2026-11-05")).toEqual([]);
```

- [ ] 2. Run the focused test; expect exit 0 (this assertion pins existing behavior, so there is no red run; if it fails, stop and report).

```sh
bun test tests/evidence/validity.test.ts
```

- [ ] 3. Make two anchored edits. Change nothing else.

  a. In `src/detectors/ci.ts`, replace

```text
   const scope={workflow:m.path,boundary:step.boundary,evaluator:"command"};
```

  with

```text
   // evaluator "command" marks a CI step scope; countsFor() in src/canonical.ts counts it for the project scope {}.
   const scope={workflow:m.path,boundary:step.boundary,evaluator:"command"};
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.2, replace

```text
其中每份確認都會判為 `citation_mismatch`，需重新掃描。
```

  with

```text
其中每份確認都會判為 `citation_mismatch`，需重新掃描。`line_hashes` 只是每行雜湊的前 8 碼，短而好猜的行（例如 `PORT=3000`）可以被比對出來，所以快照仍屬敏感材料，和報告一樣存放在目標 repository 之外並由使用者保管。
```

- [ ] 4. Run the whole suite; expect 0 failures (99 tests).

```sh
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evidence/validity.test.ts src/detectors/ci.ts docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-review-followups/06-release-followups.md
git commit -m '📝 docs(evidence): note snapshot sensitivity and pin the scan-time quote path'
```
