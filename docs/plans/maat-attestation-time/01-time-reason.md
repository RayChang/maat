# W01 — Say which time rule an attestation fails

alibi run 1 (2026-11-12): the agent wrote `attested_at: 2026-11-12T02:00:00Z` at 01:54Z. `maat policy validate` printed only `policy_invalid: attestations[0] ... invalid_time`, and it took three tries to guess that the time was later than the clock. `invalid_time` in `src/evidence/validate.ts` covers four different rules with one word.

Rules of the change:
- Each failing time rule gets its own reason, in the same `<code> (<detail>)` form as `adapter_incompatible`:
  - `invalid_time (attested_at is not a date)`
  - `invalid_time (attested_at <value> is later than now <now>)`
  - `invalid_time (expires_at is not a date)`
  - `invalid_time (expires_at must be later than attested_at)`
- No reason contains a comma, because callers join reasons with commas.
- `expired` is unchanged. An attestation that was valid before is still valid, and an invalid one is still invalid.
- The diagnose skill tells the host agent to keep `attested_at` as `maat attest template` prints it.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/evidence/validity.test.ts` (append), `src/evidence/validate.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evidence/validity.test.ts`.

## Interfaces

Consumes:

```ts
export declare function attestationIssues(a:Attestation,m:Fingerprint[],v:Versions,scope:Scope,now:string):string[]; // src/evidence/validate.ts
```

Produces: None (the reason strings change; the signature does not).

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/evidence/validity.test.ts` (the file ends with a newline; add nothing else):

```ts
test("invalid_time names the time rule that failed",()=>{
 const text="Fix login feedback.\n";
 const m={path:"task.md",text,sha256:sha256(text)};
 const a:Attestation={check:"prompt.task-spec",claims:["goal"],answer:"The task explicitly requires fixing login feedback.",
 materials:[{path:m.path,sha256:m.sha256,lines:"1-1",quote:"Fix login feedback."}],
 scope:{},attested_by:"ray",attested_at:"2026-11-12T02:00:00Z",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}};
 const now="2026-11-12T01:54:00Z";
 expect(attestationIssues(a,[m],versions,{},now)).toEqual(["invalid_time (attested_at 2026-11-12T02:00:00Z is later than now 2026-11-12T01:54:00Z)"]);
 expect(attestationIssues({...a,attested_at:"soon"},[m],versions,{},now)).toEqual(["invalid_time (attested_at is not a date)"]);
 expect(attestationIssues({...a,expires_at:"never"},[m],versions,{},now)).toEqual(["invalid_time (attested_at 2026-11-12T02:00:00Z is later than now 2026-11-12T01:54:00Z)","invalid_time (expires_at is not a date)"]);
 expect(attestationIssues({...a,attested_at:"2026-11-01",expires_at:"2026-10-01"},[m],versions,{},now)).toEqual(["invalid_time (expires_at must be later than attested_at)","expired"]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with `2 pass`, `1 fail`: the reason is still the bare `invalid_time`.

```sh
bun test tests/evidence/validity.test.ts
```

- [ ] 3. Implement. Make this 1 edit; the "replace" text occurs exactly once in its file.

  a. In `src/evidence/validate.ts`, replace

```ts
 if(!Number.isFinite(at)||!Number.isFinite(end)||at>time||end<=at) out.push("invalid_time");
```

  with

```ts
 if(!Number.isFinite(at)) out.push("invalid_time (attested_at is not a date)");
 else if(at>time) out.push("invalid_time (attested_at "+a.attested_at+" is later than now "+now+")");
 if(!Number.isFinite(end)) out.push("invalid_time (expires_at is not a date)");
 else if(end<=at) out.push("invalid_time (expires_at must be later than attested_at)");
```

- [ ] 4. Run the focused test; expect exit 0 and `3 pass`. Then run the whole suite; expect `131 pass`, `0 fail`.

```sh
bun test tests/evidence/validity.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Update the skill and the spec. Make these 2 edits; each "replace" text occurs exactly once in its file. Both edits add text after an existing sentence on the same line.

  a. In `skills/maat-diagnose/SKILL.md`, replace

```text
without --snapshot it compares fingerprints with the current directory.
```

  with

```text
without --snapshot it compares fingerprints with the current directory. Keep attested_at as maat attest template prints it; a time later than now fails with invalid_time, and the message names the time rule that failed.
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md`, replace

```text
不符時原因寫成 `adapter_incompatible (adapter_version.<cli> must be <版本>)`（2026-11-11 補充）。
```

  with

```text
不符時原因寫成 `adapter_incompatible (adapter_version.<cli> must be <版本>)`（2026-11-11 補充）。確認的時間不合時，原因寫成 `invalid_time (<哪一條>)`：`attested_at` 或 `expires_at` 不是日期、`attested_at` 晚於現在（訊息附上現在時間），或 `expires_at` 不晚於 `attested_at`（2026-11-17 補充）。
```

- [ ] 7. Run the whole suite again; expect `131 pass`, `0 fail`.

```sh
bun test
```

- [ ] 8. Commit this task using the exact message below.

```sh
git add -- tests/evidence/validity.test.ts src/evidence/validate.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-attestation-time/01-time-reason.md
git commit -m '🐛 fix(evidence): say which time rule an attestation fails'
```
