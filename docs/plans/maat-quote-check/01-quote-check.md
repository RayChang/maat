# J01 — Check that attestation quotes are really in the cited lines

A clean run of the diagnose skill on fvg found that `attestationIssues` never checks the quote text: `quote: "THIS TEXT DOES NOT EXIST"` with any line range still made `prompt.task-spec` verified. The check could not exist, because a snapshot keeps only `{path, sha256}` per material and `maat evaluate` must not reread the repository. Owner decision 2026-11-06: the snapshot also keeps, per material, the first 8 hex characters of the SHA-256 of every line with surrounding whitespace removed (`line_hashes`, one fixed-width string, no source text). An attestation quote must then be whole lines, each found inside its cited range (leading and trailing spaces may be dropped; lines may be skipped). Otherwise the citation is `citation_mismatch`. A range past the end of the file, a fragment of a line, or a material without line hashes is also a mismatch. When a caller passes materials that still carry `text` (scan-time checks and unit tests), the hashes are computed from the text.

Measured: alibi results unchanged (all owner attestations stay valid); fvg snapshot 3.1 MB to 8.6 MB; all 95 existing tests pass.

Owner rule: over-design is forbidden. No change to the attestation format, no quote normalization beyond trimming each line.

## Files

- Create: None.
- Modify: `tests/evidence/validity.test.ts`, `tests/skills/contracts.test.ts`, `src/canonical.ts`, `src/models.ts`, `src/snapshot.ts`, `src/evidence/validate.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/evidence/validity.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
export declare function sha256(value: string | Uint8Array): string;           // src/canonical.ts
export declare function attestationIssues(a: Attestation, m: Fingerprint[], v: Versions, scope: Scope, now: string): string[];
export declare function makeSnapshot(i: Inventory, p: Policy, adapters?: AdapterResult[], observations?: Observation[]): Snapshot;
```

Produces:

```ts
// src/canonical.ts
export function lineHashes(text: string): string;   // 8 hex chars per line of text.split("\n"), each line trimmed
// src/models.ts
export interface Fingerprint { path: string; sha256: string; line_hashes?: string; }
```

## Steps

- [ ] 1. Write the failing tests.

  a. In `tests/evidence/validity.test.ts`, replace

```ts
import { sha256 } from "../../src/canonical";
```

  with

```ts
import { sha256,lineHashes } from "../../src/canonical";
```

  b. Append exactly this to the end of `tests/evidence/validity.test.ts` (it contains `\n` inside strings; copy it byte-exact):

```ts
test("a quote must be whole lines found inside the cited range",()=>{
 const text="Goal: fix login feedback.\n  Scope: only the login view.\nDone when the error shows.\n";
 const m={path:"task.md",sha256:sha256(text),line_hashes:lineHashes(text)};
 const base:Attestation={check:"prompt.task-spec",claims:["goal"],answer:"The task names the goal and the scope.",
 materials:[{path:m.path,sha256:m.sha256,lines:"1-2",quote:"Goal: fix login feedback.\nScope: only the login view."}],
 scope:{},attested_by:"ray",attested_at:"2026-11-04T00:00:00Z",expires_at:"2027-01-01",catalog_version:"0.1.0",adapter_version:{}};
 const quote=(lines:string,q:string)=>attestationIssues({...base,materials:[{...base.materials[0]!,lines,quote:q}]},[m],versions,{},"2026-11-05");
 expect(attestationIssues(base,[m],versions,{},"2026-11-05")).toEqual([]);
 expect(quote("1-2","THIS TEXT DOES NOT EXIST")).toContain("citation_mismatch");
 expect(quote("1-1","Done when the error shows.")).toContain("citation_mismatch");
 expect(quote("1-1","fix login")).toContain("citation_mismatch");
 expect(quote("3-9","Done when the error shows.")).toContain("citation_mismatch");
 expect(attestationIssues(base,[{path:m.path,sha256:m.sha256}],versions,{},"2026-11-05")).toContain("citation_mismatch");
});
```

  c. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("never quote secrets");
```

  with

```ts
 expect(diagnose).toContain("never quote secrets");
 expect(diagnose).toContain("Each attestation quote must be whole lines copied from its cited range");
```

- [ ] 2. Run the focused tests; expect exit 1: `validity.test.ts` fails to load because `lineHashes` is not exported from `src/canonical.ts` yet, and the new `toContain` in `contracts.test.ts` fails.

```sh
bun test tests/evidence/validity.test.ts tests/skills/contracts.test.ts
```

- [ ] 3. Implement with these anchored edits. Change nothing else. Several blocks contain backslashes (`"\n"`, `\\.`); copy them byte-exact.

  a. In `src/canonical.ts`, replace

```ts
export function sameScope(
```

  with

```ts
export function lineHashes(text:string):string { return text.split("\n").map(l=>sha256(l.trim()).slice(0,8)).join(""); }
export function sameScope(
```

  b. In `src/models.ts`, replace

```ts
export interface Fingerprint { path: string; sha256: string; }
```

  with

```ts
export interface Fingerprint { path: string; sha256: string; line_hashes?: string; }
```

  c. In `src/snapshot.ts`, three edits. Replace

```ts
import { sha256 } from "./canonical";
```

  with

```ts
import { sha256,lineHashes } from "./canonical";
```

  replace

```ts
materials:s.materials.map(({path,sha256})=>({path,sha256}))
```

  with

```ts
materials:s.materials.map(({path,sha256,text})=>({path,sha256,line_hashes:lineHashes(text)}))
```

  and replace (inside the `parseSnapshot` schema; this exact text occurs once)

```ts
"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"}}}},"adapters"
```

  with

```ts
"sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},"line_hashes":{"type":"string","pattern":"^([a-f0-9]{8})*$"}}}},"adapters"
```

  d. In `src/evidence/validate.ts`, two edits. Replace

```ts
import { sameScope } from "../canonical";
```

  with

```ts
import { sameScope,sha256,lineHashes } from "../canonical";
```

  and replace

```ts
  if(stop<start || typeof e.quote!=="string" || !e.quote.trim())
```

  with

```ts
  const text=(found as {text?:unknown}).text,hashes=found.line_hashes??(typeof text==="string"?lineHashes(text):""),lines=new Set(Array.from({length:Math.max(0,stop-start+1)},(_,k)=>hashes.slice((start-1+k)*8,(start+k)*8)));
  const quoted=typeof e.quote==="string"?e.quote.split("\n").map(l=>l.trim()).filter(Boolean).map(l=>sha256(l).slice(0,8)):[];
  if(stop<start || stop*8>hashes.length || !quoted.length || !quoted.every(h=>lines.has(h)))
```

  e. In `skills/maat-diagnose/SKILL.md`, replace the line

```text
Collect the substantive human answer, quoted line ranges, exact material digests, scope, versions, owner, and expiry.
```

  with

```text
Collect the substantive human answer, quoted line ranges, exact material digests, scope, versions, owner, and expiry. Each attestation quote must be whole lines copied from its cited range; maat rejects any other quote.
```

  f. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.2, replace

```text
用途：診斷 Skill 收到新確認後重評，以及改善後比對。
```

  with

```text
用途：診斷 Skill 收到新確認後重評，以及改善後比對。快照為每個材料另存每一行（去掉前後空白）的 SHA-256 前 8 碼 `line_hashes`，不存原文；確認的每段引文必須是引用行數範圍內的整行（可省略前後空白、可跳行），否則為 `citation_mismatch`（2026-11-06 補充）。
```

- [ ] 4. Run the focused tests; expect exit 0. Then run the whole suite; expect 0 failures (96 tests).

```sh
bun test tests/evidence/validity.test.ts tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/evidence/validity.test.ts tests/skills/contracts.test.ts src/canonical.ts src/models.ts src/snapshot.ts src/evidence/validate.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-quote-check/01-quote-check.md
git commit -m '🐛 fix(evidence): check that attestation quotes are in the cited lines'
```
