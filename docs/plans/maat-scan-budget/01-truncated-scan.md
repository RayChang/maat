# K01 — A scan cut short by the size budget is not authoritative

A clean run of the diagnose skill on fvg hit the 32 MiB scan budget: 652 `scan_limit:` diagnostics, including root `package.json` and `nx.json`, yet the report said `Authoritative: true` and the layers showed `ready`. Tool spec §11 item 4: an incomplete scan cannot count as passing. Owner decision 2026-11-06: when any `scan_limit:` diagnostic exists, every layer is non-authoritative and the report carries a `scan_truncated` diagnostic. Other incompleteness (an unread symlink or binary file) does not change authority, because those files are skipped by design. The diagnose skill gets one line telling the agent to narrow the scope and rescan.

Also from the PR #43 review: say in CLI contract §3.2 that snapshots made before `line_hashes` existed turn every attestation into `citation_mismatch` and need a fresh scan.

Owner rule: over-design is forbidden. Two code lines, one test file, one skill line, one assertion, two contract sentences.

## Files

- Create: `tests/report/truncated.test.ts`.
- Modify: `tests/skills/contracts.test.ts`, `src/report/index.ts`, `skills/maat-diagnose/SKILL.md`, `docs/specs/2026-11-04-maat-cli-interface.md` (anchored edits).
- Test paths: `tests/report/truncated.test.ts`, `tests/skills/contracts.test.ts`.

## Interfaces

Consumes:

```ts
export declare function buildReport(s: Snapshot, p: Policy, c: Catalog, now: string, ...rest: unknown[]): Report;
// Snapshot.scope.diagnostics: string[]; Report.layers[].authoritative: boolean; Report.diagnostics: string[]
```

Produces: None (behavior change only).

## Steps

- [ ] 1. Write the failing tests.

  a. Create `tests/report/truncated.test.ts` with exactly:

```ts
import { test,expect } from "bun:test";
import { buildReport } from "../../src/report";
import { loadCatalog } from "../../src/catalog/load";
import { emptyPolicy } from "../../src/policy/load";
import { makeSnapshot } from "../../src/snapshot";
test("a scan cut short by the size budget is never authoritative",async()=>{
 const c=await loadCatalog("catalog"),p=emptyPolicy();
 const full=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:true,include:["."],exclude:[],limits:[],diagnostics:[],materials:[]},p);
 expect(buildReport(full,p,c,"2026-11-04T00:00:00Z").layers.every(l=>l.authoritative)).toBe(true);
 const cut=makeSnapshot({root:"/r",repo_id:"0".repeat(16),complete:false,include:["."],exclude:[],limits:[],diagnostics:["scan_limit: package.json"],materials:[]},p);
 const r=buildReport(cut,p,c,"2026-11-04T00:00:00Z");
 expect(r.layers.some(l=>l.authoritative)).toBe(false);
 expect(r.diagnostics).toContain("scan_truncated");
});
```

  b. In `tests/skills/contracts.test.ts`, replace

```ts
 expect(diagnose).toContain("Each attestation quote must be whole lines copied from its cited range");
```

  with

```ts
 expect(diagnose).toContain("Each attestation quote must be whole lines copied from its cited range");
 expect(diagnose).toContain("If the report lists scan_limit diagnostics");
```

- [ ] 2. Run the focused tests; expect exit 1: in `truncated.test.ts` the `toBe(false)` assertion fails (the cut scan is still authoritative), and the new `toContain` in `contracts.test.ts` fails.

```sh
bun test tests/report/truncated.test.ts tests/skills/contracts.test.ts
```

- [ ] 3. Implement with these anchored edits. Change nothing else.

  a. In `src/report/index.ts`, replace

```ts
 const authoritative=c.approved&&!overridden&&s.versions.catalog_version===c.catalog_version;
```

  with

```ts
 const truncated=s.scope.diagnostics.some(d=>d.startsWith("scan_limit:"));
 const authoritative=c.approved&&!overridden&&s.versions.catalog_version===c.catalog_version&&!truncated;
```

  b. In `src/report/index.ts`, replace

```ts
 if(overridden)diagnostics.push("catalog_overridden");
```

  with

```ts
 if(overridden)diagnostics.push("catalog_overridden");
 if(truncated)diagnostics.push("scan_truncated");
```

  c. In `skills/maat-diagnose/SKILL.md`, replace the line

```text
Use maat scan, selecting --cli claude-code, --cli codex, or --cli copilot only when selected by the user.
```

  with these two lines

```text
Use maat scan, selecting --cli claude-code, --cli codex, or --cli copilot only when selected by the user.
If the report lists scan_limit diagnostics, the scan was cut short and is not authoritative: exclude bulky paths that are not evidence (generated data, media, vendored copies) in the draft policy and rescan before reviewing items.
```

  d. In `docs/specs/2026-11-04-maat-cli-interface.md` §5.1, replace

```text
`authoritative` 為 false 時整份報告不得稱為正式符合性聲明。
```

  with

```text
`authoritative` 為 false 時整份報告不得稱為正式符合性聲明。掃描因容量上限截斷（有 `scan_limit` 診斷）時，每一層的 `authoritative` 都為 false，報告附 `scan_truncated` 診斷；未讀的 symlink 或二進位檔是刻意略過，不影響這個欄位（2026-11-06 補充）。
```

  e. In `docs/specs/2026-11-04-maat-cli-interface.md` §3.2, replace

```text
否則為 `citation_mismatch`（2026-11-06 補充）。
```

  with

```text
否則為 `citation_mismatch`（2026-11-06 補充）。在此之前產生的舊快照沒有 `line_hashes`，其中每份確認都會判為 `citation_mismatch`，需重新掃描。
```

- [ ] 4. Run the focused tests; expect exit 0. Then run the whole suite; expect 0 failures (97 tests).

```sh
bun test tests/report/truncated.test.ts tests/skills/contracts.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/report/truncated.test.ts tests/skills/contracts.test.ts src/report/index.ts skills/maat-diagnose/SKILL.md docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-scan-budget/01-truncated-scan.md
git commit -m '🐛 fix(report): a scan cut short by the size budget is not authoritative'
```
