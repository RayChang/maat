# P02 — Extend the standard policy to the prompt, context and harness layers

Owner decision 2026-11-06, after comparing fvg and alibi item by item: both projects delegate work to agents, so the prompt, context and harness layers apply by default, and every catalog `baseline` item of those layers is required. That adds seven targets: `prompt.task-spec`, `prompt.output-contract`, `context.index-to-details`, `context.instruction-authority`, `harness.permission-boundaries`, `harness.recovery`, `harness.verification-wiring`. Loop and graph stay out of the standard because whether a project runs a loop or a multi-node graph differs per project. Advanced items in the applicable layers (including `harness.outcome-measurement`, which the owner wants evaluated) are evaluated through layer applicability and need no target.

Owner rule: over-design is forbidden. Change only the standard file, its test, and the one spec paragraph.

## Files

- Create: None.
- Modify: `tests/skills/standard-policy.test.ts`, `skills/maat-diagnose/standard-policy.yaml` (complete files), `docs/specs/2026-11-04-maat-cli-interface.md` (one anchored line).
- Test paths: `tests/skills/standard-policy.test.ts`.

## Interfaces

Consumes:

```ts
// T08
export declare function parsePolicy(text: string, catalogVersion: string): Policy;
// T09
export declare function loadCatalog(root?: string): Promise<Catalog>;
// CatalogItem.layer.primary: string; CatalogItem.baseline.proposed_tier: "baseline" | "advanced"
```

Produces: None (data file and text only).

## Steps

- [ ] 1. Write the failing test. Replace the whole content of `tests/skills/standard-policy.test.ts` with exactly:

```ts
import { test, expect } from "bun:test";
import { parsePolicy } from "../../src/policy/load";
import { loadCatalog } from "../../src/catalog/load";
test("the standard policy requires exactly the baseline items of its applicable layers",async()=>{
 const c=await loadCatalog("catalog");
 const p=parsePolicy(await Bun.file("skills/maat-diagnose/standard-policy.yaml").text(),c.catalog_version);
 expect(p.catalog_version).toBe(c.catalog_version);
 const layers=["foundation","prompt","context","harness"];
 expect(p.applicability).toEqual(Object.fromEntries(layers.map(l=>[l,{status:"applicable"}])));
 const baseline=c.items.filter(i=>layers.includes(i.layer.primary)&&i.baseline.proposed_tier==="baseline").map(i=>i.id).sort();
 expect(baseline.length).toBe(11);
 expect(Object.keys(p.targets).sort()).toEqual(baseline);
 for(const id of baseline)expect(p.targets[id]).toEqual({baseline:true});
 expect(p.target_clis).toEqual([]);
 expect(p.scope.include).toEqual(["."]);
 for(const glob of p.scope.exclude)expect(glob).toMatch(/^\*\*\/\*\.[a-z0-9]+$/);
 expect(p.exemptions).toEqual([]);
 expect(p.attestations).toEqual([]);
});
```

- [ ] 2. Run the focused test; expect exit 1 with the `applicability` `toEqual` failing (the file still lists only `foundation`).

```sh
bun test tests/skills/standard-policy.test.ts
```

- [ ] 3. Implement.

  a. Replace the whole content of `skills/maat-diagnose/standard-policy.yaml` with exactly:

```yaml
# Owner standard policy (2026-11-06). The maat-diagnose skill copies this file
# as the draft for a project without .maat/policy.yaml, then fills only the
# project parts: target_clis, project exclusions, loops, and attestations.
# Loop and graph applicability is decided per project.
policy_schema: 1.0.0
catalog_version: 0.1.0
target_clis: []
scope:
  include: ["."]
  exclude:
    - "**/*.png"
    - "**/*.jpg"
    - "**/*.jpeg"
    - "**/*.gif"
    - "**/*.webp"
    - "**/*.ico"
    - "**/*.woff"
    - "**/*.woff2"
    - "**/*.mp4"
    - "**/*.mov"
    - "**/*.webm"
    - "**/*.pdf"
applicability:
  foundation:
    status: applicable
  prompt:
    status: applicable
  context:
    status: applicable
  harness:
    status: applicable
targets:
  foundation.verify-entrypoints: { baseline: true }
  foundation.automated-tests: { baseline: true }
  foundation.static-analysis: { baseline: true }
  foundation.ci-verification: { baseline: true }
  prompt.task-spec: { baseline: true }
  prompt.output-contract: { baseline: true }
  context.index-to-details: { baseline: true }
  context.instruction-authority: { baseline: true }
  harness.permission-boundaries: { baseline: true }
  harness.recovery: { baseline: true }
  harness.verification-wiring: { baseline: true }
exemptions: []
attestations: []
```

  b. In `docs/specs/2026-11-04-maat-cli-interface.md` §7.1, replace the line

```text
**標準政策檔**（使用者 2026-11-06 補充決定）：`skills/maat-diagnose/standard-policy.yaml` 存放各專案共用的選擇：基礎層適用、基礎層四題 baseline 題列為必備、預設排除圖片字型影片與 PDF（lockfile 不排除，環境題要讀）。專案沒有 `.maat/policy.yaml` 時，診斷 Skill 先複製這份當草稿，只補專案專屬的部分（目標 CLI、專案排除路徑、迴圈、確認），草稿放在目標 repository 之外並以 `--policy` 傳入。`maat` 本身不讀這份檔案；標準檔更新後，已起草的專案政策檔不會自動跟著改。
```

  with

```text
**標準政策檔**（使用者 2026-11-06 補充決定）：`skills/maat-diagnose/standard-policy.yaml` 存放各專案共用的選擇：基礎、提示詞、情境、執行框架四層適用，這四層的 11 題 baseline 題列為必備，預設排除圖片字型影片與 PDF（lockfile 不排除，環境題要讀）。迴圈與協作圖兩層是否適用由各專案決定，標準檔不寫。專案沒有 `.maat/policy.yaml` 時，診斷 Skill 先複製這份當草稿，只補專案專屬的部分（目標 CLI、專案排除路徑、迴圈、確認），草稿放在目標 repository 之外並以 `--policy` 傳入。`maat` 本身不讀這份檔案；標準檔更新後，已起草的專案政策檔不會自動跟著改。
```

- [ ] 4. Run the focused test; expect exit 0 and 1 passing test. Then run the whole suite; expect 0 failures (86 tests).

```sh
bun test tests/skills/standard-policy.test.ts
bun test
```

- [ ] 5. Run the type checker; expect exit 0.

```sh
bun run typecheck
```

- [ ] 6. Commit this task using the exact message below.

```sh
git add -- tests/skills/standard-policy.test.ts skills/maat-diagnose/standard-policy.yaml docs/specs/2026-11-04-maat-cli-interface.md docs/plans/maat-standard-policy/02-agent-layers.md
git commit -m '✨ feat(skill): extend the standard policy to the agent layers'
```
