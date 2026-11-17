# W02 — Show attested_at in ISO form in the invalid_time reason

Cloud review of W01 (PR #113, 2026-11-17): the reason `invalid_time (attested_at <value> is later than now <now>)` copies the user's text. `Date.parse` accepts a value with a comma, such as `Nov 12, 2026 02:00 UTC`, and callers join reasons with commas, so the reason must not carry one.

Rules of the change:
- The reason prints the parsed `attested_at` as `new Date(at).toISOString()`, for example `2026-11-12T02:00:00.000Z`. It also shows how maat read a value written without a time zone.
- The W01 test expectations change from `2026-11-12T02:00:00Z` to `2026-11-12T02:00:00.000Z`. Nothing else changes.

Owner rule: over-design is forbidden. Change only the lines below.

## Files

- Modify: `tests/evidence/validity.test.ts` (append, then anchored edits), `src/evidence/validate.ts` (anchored edit).
- Test paths: `tests/evidence/validity.test.ts`.

## Interfaces

Consumes:

```ts
export declare function attestationIssues(a:Attestation,m:Fingerprint[],v:Versions,scope:Scope,now:string):string[]; // src/evidence/validate.ts
```

Produces: None (one reason string changes; the signature does not).

## Steps

- [ ] 1. Write the failing test. Append this text to the end of `tests/evidence/validity.test.ts` (the file ends with a newline; add nothing else):

```ts
test("invalid_time shows attested_at in ISO form, so the reason has no comma",()=>{
 const text="Fix login feedback.\n";
 const m={path:"task.md",text,sha256:sha256(text)};
 const a:Attestation={check:"prompt.task-spec",claims:["goal"],answer:"The task explicitly requires fixing login feedback.",
 materials:[{path:m.path,sha256:m.sha256,lines:"1-1",quote:"Fix login feedback."}],
 scope:{},attested_by:"ray",attested_at:"Nov 12, 2026 02:00 UTC",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}};
 expect(attestationIssues(a,[m],versions,{},"2026-11-12T01:54:00Z")).toEqual(["invalid_time (attested_at 2026-11-12T02:00:00.000Z is later than now 2026-11-12T01:54:00Z)"]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with `3 pass`, `1 fail`: the reason still copies `Nov 12, 2026 02:00 UTC`.

```sh
bun test tests/evidence/validity.test.ts
```

- [ ] 3. Implement. Make these 3 edits. Each "replace" text occurs exactly once in its file. Edit a is in `src/evidence/validate.ts`; edits b and c are in the W01 test inside `tests/evidence/validity.test.ts`.

  a. In `src/evidence/validate.ts`, replace

```ts
 else if(at>time) out.push("invalid_time (attested_at "+a.attested_at+" is later than now "+now+")");
```

  with

```ts
 else if(at>time) out.push("invalid_time (attested_at "+new Date(at).toISOString()+" is later than now "+now+")");
```

  b. In `tests/evidence/validity.test.ts`, replace

```ts
 expect(attestationIssues(a,[m],versions,{},now)).toEqual(["invalid_time (attested_at 2026-11-12T02:00:00Z is later than now 2026-11-12T01:54:00Z)"]);
```

  with

```ts
 expect(attestationIssues(a,[m],versions,{},now)).toEqual(["invalid_time (attested_at 2026-11-12T02:00:00.000Z is later than now 2026-11-12T01:54:00Z)"]);
```

  c. In `tests/evidence/validity.test.ts`, replace

```ts
 expect(attestationIssues({...a,expires_at:"never"},[m],versions,{},now)).toEqual(["invalid_time (attested_at 2026-11-12T02:00:00Z is later than now 2026-11-12T01:54:00Z)","invalid_time (expires_at is not a date)"]);
```

  with

```ts
 expect(attestationIssues({...a,expires_at:"never"},[m],versions,{},now)).toEqual(["invalid_time (attested_at 2026-11-12T02:00:00.000Z is later than now 2026-11-12T01:54:00Z)","invalid_time (expires_at is not a date)"]);
```

- [ ] 4. Run the focused test; expect exit 0 and `4 pass`. Then run the whole suite; expect `132 pass`, `0 fail`.

```sh
bun test tests/evidence/validity.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evidence/validity.test.ts src/evidence/validate.ts docs/plans/maat-attestation-time/02-iso-time.md
git commit -m '🐛 fix(evidence): print attested_at in ISO form in invalid_time'
```
