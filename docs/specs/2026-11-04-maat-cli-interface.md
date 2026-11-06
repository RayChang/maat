# maat：CLI 與資料介面契約（階段 2 提案）

**日期：** 2026-11-04
**狀態：** 已定稿供實作。語言（TypeScript＋Bun）、指令名稱（`maat`）、平台（Q-A）、發布方式（Q-B）、Skill 交付（Q-C）皆由使用者於 2026-11-04 決定；其餘為實作預設，使用者可逐項否決。第 10 節保留決定紀錄。
**設計依據：** [正式 spec](./2026-11-03-five-layer-tool-spec.md)、[運作架構](./2026-11-04-toolkit-operation-architecture.md)、[Catalog 0.1.0](./2026-11-03-five-layer-catalog.md)
**實作計畫：** [新版實作計畫](../plans/2026-11-03-five-layer-tool-implementation.md) 階段 2

## 1. 文件權責

本文件把正式 spec 第 7–9 節與運作架構第 5 節的邏輯契約，定成可實作的命令、旗標、檔案格式、版本與結束代碼。不改變產品邊界：診斷 CLI 唯讀、不呼叫模型、不執行專案程式、不寫入目標 repository；改善由既有 agent 在核准範圍內執行；流程控制核心依已核准的 A（reducer／guards／ledger）。

## 2. 名稱、語言、平台與版本

| 項目 | 決定 | 依據 |
|---|---|---|
| 指令名稱 | `maat` | 使用者 2026-11-04 選定，典故為古埃及審判中與真理之羽比重的天秤：拿證據對標準，不打分數 |
| 套件名稱與安裝 | `package.json` 名稱 `maat`、`private: true`、`bin` 為 `maat`；從 GitHub 倉庫安裝：`bunx github:RayChang/maat` | 使用者 Q-B 選擇先不發布；`npm` 上 `maat` 已被占用，日後若發布改掛 scope。遠端倉庫定為 `github.com/RayChang/maat`（私有，2026-11-05 使用者決定），建立前先確認 |
| 語言與執行環境 | TypeScript，Bun ≥ 1.4.0 | 使用者選 B。Bun 1.4.4 為 2026-10-22 最新版；`Bun.YAML.parse`、`Bun.TOML.parse`、`JSON.parse` 皆內建，執行期零依賴 |
| 開發依賴 | `typescript`、`@types/bun` | 僅用於 `tsc --noEmit` 型別檢查；`bun test` 為測試執行器 |
| 支援平台 | macOS、Linux 列入測試矩陣；Windows 標 `unknown`，不保證 | 使用者 Q-A 決定 |
| 版本欄位 | `tool_version`（semver）、`report_schema`、`policy_schema`、`ledger_schema`、`catalog_version`、每個 adapter 的 `adapter_version`／`verified_cli_range`／`checked_at` | spec 8.3、運作架構 3.2 |

相容規則：schema 的主版號改變代表舊檔案不再保證可讀；catalog 主版號改變代表既有 attestation 全部失效、需重確認；adapter 版本改變只影響該 CLI 的觀察，不使其他結果失效。報告永遠寫出全部版本。

## 3. 命令總覽

```text
maat scan [path]                  掃描 repository，產生審核報告（唯讀）
maat evaluate                     不重掃檔案，用既有快照＋新證據重評
maat plan                         依報告與目標產生改善計畫（不修改任何檔案）
maat explain <id>                 印出題目／能力／規則卡／範本的契約
maat catalog list|validate        瀏覽與驗證 catalog
maat policy init|validate         印出政策檔骨架、驗證政策檔（不寫檔）
maat attest template              印出單題確認紀錄的骨架（不寫檔）
maat flow <subcommand>            流程控制核心：核准、授權、checkpoint、紀錄、轉移、恢復
maat version                      印出工具、schema、catalog、adapter 版本
maat update                       從 GitHub 重新安裝最新版（唯一會連網的命令）
```

通用旗標：`--json`（stdout 改輸出 JSON）、`--out <dir>`（同時寫 JSON 與 Markdown 檔）、`--quiet`、`--catalog <dir>`（覆寫 catalog 來源，報告記錄為非預設）、`--ledger <dir>`（流程紀錄位置）。

所有命令預設輸出到 stdout；診斷訊息到 stderr。沒有任何命令會寫入目標 repository，包含 `.maat/` 下的政策檔。

### 3.1 `maat scan [path]`

| 旗標 | 說明 |
|---|---|
| `--cli <name>` | 目標 CLI，可重複：`claude-code`、`codex`、`copilot`。未指定時依政策檔；都沒有時只列發現，CLI 專屬判定為 `unknown` |
| `--policy <file>` | 預設 `<path>/.maat/policy.yaml`；不存在時照常掃描，未決選擇列為待確認 |
| `--evidence <file>` | 可重複；使用者明確提供的去敏感外部材料或確認紀錄（格式見 4.3），不自動讀 repository 外的任何東西 |
| `--snapshot <file>` | 另存審核範圍與材料指紋快照，供 `evaluate` 與 `flow` 使用 |
| `--format markdown\|json\|both` | 預設 `markdown` 到 stdout；`--out` 時一律兩種都寫 |

行為：有範圍的 discovery（不追蹤越出 `<path>` 的 symlink、不讀 `.git` 以外的隱藏憑證目錄、不聯網、不執行任何東西）→ adapter 辨識設定面 → deterministic detectors → 合併政策與證據 → 依 catalog 判定單題結果、能力、逐層狀態 → 報告。讀取或解析失敗寫入 `diagnostics`，對應主張為 `unknown`，不是 `missing`。

CI 設定支援三種格式（2026-11-06 補充）：GitHub Actions 的 `.github/workflows/*.yml`、GitLab CI 的 `.gitlab-ci.yml`（discovery 另讀 `.gitlab/` 目錄，供引用）、Bitbucket Pipelines 的 `bitbucket-pipelines.yml`。每個步驟的指令與失敗後果逐一記錄；`include`、`extends`、`rules`、遠端 action 與包裝指令（例如 `dagger call`）不追蹤，對應主張為 `unknown`。

### 3.2 `maat evaluate`

輸入 `--snapshot <file>`、`--policy`、`--evidence`。不碰檔案系統中的 repository；只用快照裡的觀察重新評估。快照指紋與政策引用的材料指紋不符時，受影響主張為 `unknown` 並附診斷。用途：診斷 Skill 收到新確認後重評，以及改善後比對。

### 3.3 `maat plan`

輸入 `--report <file>`，`--target <layer|check-id>` 可重複。輸出改善計畫（JSON／Markdown），每項含 check、item／rule card／template 版本、目前結果與目標、動作、目標路徑或「位置待確認」、`depends_on`、必要／建議、風險、`needs_approval`、驗收（detector 或人工）、產生時的證據指紋。遇到未知指令、路徑或格式，輸出「先詢問」步驟而不是猜測。計畫是文字與資料，不套用。沒有 `--target` 時，計畫涵蓋報告裡政策列為必備（baseline 題、條件成立且適用）但尚未成立的每一題；沒有這類題目時，用新專案起點三題 `foundation.verify-entrypoints`、`prompt.task-spec`、`context.instruction-authority`（2026-11-06 補充）。適用性或必備條件仍未知的 baseline 題會列在報告的缺口清單，但不納入預設計畫；要先在政策檔決定該層是否適用、該題是否必備（`targets.<id>.baseline`）。

### 3.4 `maat explain <id>`

接受 check ID、能力 ID（含 `@version`）、規則卡 ID、範本 ID。印出九項契約或登錄表內容；`--json` 給結構化。給診斷 Skill 用，避免一次載入整份 catalog。

### 3.5 `maat catalog`

`list [--layer <l>] [--tier baseline|advanced] [--json]`；`validate` 檢查：ID 唯一、九項齊備、能力引用存在、`prerequisites` 無循環、detector／rule card／template 引用都在登錄表、版本欄位齊全。`validate` 失敗結束代碼 3。

### 3.6 `maat policy`、`maat attest`

`policy init` 印出骨架到 stdout（含註解），使用者或改善 Skill 自行存成 `.maat/policy.yaml`；`policy validate [file]` 檢查 schema、catalog 版本相容、attestation 必填欄位與到期。`attest template --check <id>` 印出該題 `verification.attestation` 要求的欄位骨架。兩者都不寫檔。

### 3.7 `maat flow`

依運作架構第 5、8、9 節。所有子命令都是「記錄事件並由 reducer 檢查轉移」，不執行任何外部動作。

| 子命令 | 事件與守門 |
|---|---|
| `open --plan <file> --snapshot <file>` | 建立 flow，記錄計畫與材料指紋；回傳 `flow_id` |
| `approve --flow <id> --scope <file> --by <who>` | 記錄修改核准：綁定計畫指紋、允許動作、修改邊界、修正條件、有效條件 |
| `authorize --flow <id> --command <file> --by <who>` | 記錄執行授權：具體命令／script 版本、輸入、工作目錄、權限與外部效果。與 `approve` 分開，互不替代 |
| `checkpoint --flow <id> --action <aid> --phase before\|after --fingerprints <file>` | 記錄動作前後材料指紋；`before` 與上一個 `after` 或 base 不符 → 拒絕並標示漂移 |
| `record --flow <id> --kind change\|evaluation --file <json>` | 保存候選成果、修改範圍、執行來源、方法與結果／錯誤；error／timeout／cancel 不是 pass |
| `decide --flow <id> --event <name> [--by <who>]` | 觸發狀態轉移：`accept`、`continue-fix`、`stop`、`handoff`、`resume`。guard 不滿足時拒絕，結束代碼 4 |
| `status --flow <id>` | 目前狀態、剩餘修正條件、未完成 checkpoint、未知效果 |
| `list` | 列出此 repository 的 flows 與狀態 |

Ledger：append-only JSONL，一個 flow 一個檔案，寫入採「寫暫存檔再 rename」與 lock 檔；每筆事件有序號、時間、前後狀態、事件、拒絕原因。位置預設 `$XDG_STATE_HOME/maat/<repo-id>/`（macOS 回退 `~/Library/Application Support/maat/`），`repo-id` 為 repository 絕對路徑的雜湊；可用 `--ledger` 或 `MAAT_STATE_DIR` 覆寫。預設不在目標 repository 內，也不建立 ignore 規則。

Guards 至少涵蓋運作架構 8.3 的七條守門：政策／版本已核准、引用與指紋一致、核准涵蓋動作、授權涵蓋命令、checkpoint 匹配、修正在條件內、有新輸入或明確恢復事件。重啟不重置計數；重複或過期事件拒絕。

### 3.8 `maat version`

印出所有版本欄位；`--json` 供 Skill 與報告引用。

### 3.9 `maat update`

執行 `bun add -g github:RayChang/maat`，用執行 `maat` 的同一個 Bun 重新安裝最新版。這是唯一會連網、也唯一會執行外部命令的命令；只更新 `maat` 自己，不碰任何 repository。安裝輸出原樣轉到 stdout／stderr；安裝失敗時結束代碼為 1，stderr 最後加一行 `update_failed: github:RayChang/maat`。不接受位置參數；通用旗標對這個命令沒有作用。Skill 的更新仍用 `npx skills add`（7.1）。

## 4. 輸入契約

### 4.1 政策檔 `.maat/policy.yaml`

YAML，使用者可讀可註解；由使用者或改善 Skill 在核准下維護，隨專案 commit。CLI 只讀。

```yaml
policy_schema: 1.0.0
catalog_version: 0.1.0
target_clis: [claude-code, codex]
scope:
  include: ["."]
  exclude: ["vendor/**", "**/*.generated.*"]
applicability:
  graph:
    status: not_applicable
    reason: 單一 agent，沒有多節點流程
    owner: ray
    expires_at: 2027-05-01
  loop:
    status: applicable
    loops:
      - id: ci-fix-loop
        kind: execution-feedback
        scope: ".github/workflows/agent-fix.yml"
targets:
  foundation.automated-tests:
    baseline: true           # 本專案選定自動化回歸為基本驗證
exemptions:
  - check: context.index-to-details
    reason: 單一短指引已涵蓋
    owner: ray
    expires_at: 2027-02-01
    fingerprints: [{ path: AGENTS.md, sha256: "…" }]
attestations:
  - check: prompt.task-spec
    claims: [goal, scope, constraints, acceptance]
    answer: 代表任務見 docs/tasks/2026-10-login-fix.md 第 1–40 行…
    materials: [{ path: docs/tasks/2026-10-login-fix.md, lines: "1-40", sha256: "…" }]
    scope: { cli: claude-code, workflow: feature-delivery }
    attested_by: ray
    attested_at: 2026-11-04T10:00:00+08:00
    expires_at: 2027-02-01
    catalog_version: 0.1.0
    adapter_version: { claude-code: 1.0.0 }
```

`policy validate` 在缺必填欄位、指紋不符、到期、catalog 主版號不符時回報；對應 attestation 在評估時失效為 `unknown`，不是刪除。

### 4.2 快照 `*.snapshot.json`

搜尋邊界、排除、讀取診斷、每個被讀材料的路徑與 `sha256`、adapter 與版本、原始觀察（detector、scope、證據、限制）。供 `evaluate` 與 `flow checkpoint` 比對。

### 4.3 外部證據 `*.evidence.yaml`

與 attestation 同結構，外加 `source`（組織規範、CI 紀錄、成本紀錄等）與 `provided_by`。只接受明確以 `--evidence` 傳入的檔案。

## 5. 輸出契約

### 5.1 審核報告 JSON

```text
report_schema, tool_version, catalog_version, adapters[]{name, adapter_version, verified_cli_range, checked_at, surfaces[]{surface, support, reason}}
generated_at, repository{path, repo_id}, scope{include, exclude, limits[], diagnostics[]}
target_clis[], policy{path|null, policy_schema, valid, diagnostics[]}
items[]{id, item_version, layer, applicability{status, reason, questions[]},
        result (verified|partial|missing|not_applicable|unknown),
        claims[]{name, status, basis},
        observations[]{detector, version, scope, evidence[]{path, lines, sha256}, limits},
        assessments[]{claim, stance, citations[], uncertainty, by},
        attestations[]{ref, valid, invalid_reason},
        prerequisites{required[]{capability, status}, recommended[]...},
        baseline{tier, when_status}, diagnostics[]}
capabilities[]{id, status (holds|fails|unknown), scope, basis[]}
layers[]{layer, status (adopted|ready|blocked|not_applicable|in_use_unsupported|pending),
         authoritative, missing_required[], unknown_required[], baseline_gaps[], usage_signals[]}
protection_observations[]{measure, protects, threat, boundary, evidence[], unknown[]}
diagnostics[] (例如 policy_unapproved、catalog_overridden、read_error)
```

`layers[].status` 在適用性未知時用 `pending`，這是「待確認」的呈現值，不是新的 D2 枚舉；`authoritative` 為 false 時整份報告不得稱為正式符合性聲明。沒有總分、百分比或等級欄位。
`items[].observations` 只列同一範圍內、由該題 `inspection.detectors` 或 `verification.rerun` 所列 detector 產生的觀察，以及含有以該題為主體之事實的觀察（2026-11-06 補充）。
`items[]` 在專案範圍 `{}` 列出每一題；較窄的範圍（代理工具、CI 步驟、迴圈或確認所用的範圍）只列與該範圍有關的題目：該題的觀察出現在那個範圍、該題的確認使用那個範圍，或政策在該題或其所屬層宣告了那個迴圈範圍。`layers[]` 只在該層於某範圍有題目時列出那個範圍（2026-11-06 補充）。選了目標 CLI，但沒有該 CLI 的觀察或確認時，不另列該 CLI 的範圍，題目只出現在 `{}`。題目的豁免所用的範圍也算與該題有關；代理評估只顯示在該題已列出的範圍。

### 5.2 審核報告 Markdown

順序：摘要（逐層狀態、必要能力缺口、待確認數）→ 每層的基本項缺口與進階發現 → 逐題明細（結果、三類證據分欄）→ 保護觀察 → 範圍與限制 → 版本。摘要先顯示（U-1）。

### 5.3 改善計畫 JSON／Markdown

依 spec 8.3 欄位；另含 `source_report_fingerprint`、`plan_fingerprint`、每個動作的 `fix_conditions` 與 `stop_conditions`，供 `flow open` 綁定。

## 6. 結束代碼

| 代碼 | 意義 |
|---|---|
| 0 | 命令完成；報告可能含缺口、`unknown` 或 `blocked`，這不是失敗 |
| 1 | 工具內部錯誤（bug、未預期例外） |
| 2 | 用法錯誤：未知旗標、缺參數、互斥旗標 |
| 3 | 輸入資料錯誤：路徑不存在、政策檔／catalog／快照不可解析或 schema 不相容 |
| 4 | `flow` 守門拒絕：非法轉移、核准／授權不涵蓋、checkpoint 漂移、重複或過期事件 |

v1 不提供 `--fail-on` 之類把缺口變成非零結束代碼的旗標；spec 第 9 節的 `diff` 退步判定不在 v1。

## 7. 倉庫布局與工具鏈

```text
package.json            name @<scope>/maat, bin { maat }, engines { bun >= 1.4.0 }
src/cli/                命令解析與輸出
src/discovery/          有範圍的檔案清點
src/adapters/<cli>/     三家 CLI 的設定面辨識，各自版本與核對日期
src/detectors/          有版本的 deterministic detectors
src/evaluate/           能力判斷式、單題結果、逐層狀態
src/flow/               reducer、guards、ledger
src/report/             JSON schema 與 Markdown 渲染
catalog/items/*.yaml    41 題契約（機器真實來源）
catalog/capabilities.yaml  能力登錄表
catalog/rule-cards/*.yaml  規則卡
templates/<layer>/      範本資源庫：文字、設定、script 範本（不含 skill）
skills/maat-diagnose/SKILL.md   診斷 Skill（單一來源，三家共用）
skills/maat-diagnose/standard-policy.yaml  擁有者的標準政策，診斷 Skill 起草專案政策檔的起點（7.1）
skills/maat-improve/SKILL.md    改善 Skill（單一來源，三家共用）
skills/<name>/SKILL.md          給專案用的通用 skill（規則卡的 skill 形式），同樣用 npx skills add 安裝
tests/                  bun test；正反 fixtures、unknown、不適用、衝突、設定存在但未生效
```

工具鏈：`bun test`、`tsc --noEmit`、`bun run build`（打包 `dist/cli.js`）；`bun build --compile` 可產生單檔執行檔，v1 選用而非必需。catalog 的 YAML 從 catalog 文件第 8 節抽出成檔案後，檔案是機器真實來源；文件保留敘述與審查紀錄，測試檢查兩者的 ID、版本與分級一致，直到文件改為只連結檔案。

### 7.1 Skill 與範本的交付（Q-C 決定）

兩種 `maat` Skill 以 Agent Skills 標準格式放在 `skills/<name>/SKILL.md`，由使用者在專案內執行

```text
npx skills add RayChang/maat -a claude-code|codex|github-copilot
```

安裝到各 CLI 的 skill 目錄（Claude Code `.claude/skills/`、Codex 與 Copilot `.agents/skills/`）。一份來源服務三家；CLI 差異寫在 Skill 內文，不分三份維護。`skills` 工具需 Node 22.20 以上，這是使用者環境的前提，不是 `maat` 的執行依賴。

**所有 skill 都用 `npx skills add` 安裝**（使用者 2026-11-04 補充決定）。規則卡裡「skill 形式」的作法，不做成帶替換詞的範本，而是寫成通用 skill 放在本倉庫 `skills/<name>/`。專案專屬的值（驗證指令、路徑、目標 CLI）不寫死在 skill 裡，skill 執行時從該專案的 `.maat/policy.yaml` 或既有指引讀取；讀不到就先問，不猜。改善 Skill 只維護一版，不分五層；層與題目的差異由規則卡和範本資料承擔。

`maat plan` 遇到 skill 形式的改善動作時，輸出的是安裝指令，例如 `npx skills add RayChang/maat --skill verify-before-done -a claude-code`，並標示這是命令執行，需另取得執行授權或由使用者自己執行；不由 `maat` 代跑。

範本資源庫只剩文字、設定、script 三種形式（例如指引段落、hook 設定、CI 步驟）。流程是：`maat plan` 依報告與政策把替換詞填好，填不出來的列「先詢問」；改善 Skill 展示後取得核准，由既有 agent（host）寫入專案。`maat` 本身不寫入專案。

**標準政策檔**（使用者 2026-11-06 補充決定）：`skills/maat-diagnose/standard-policy.yaml` 存放各專案共用的選擇：基礎、提示詞、情境、執行框架四層適用，這四層的 11 題 baseline 題列為必備，預設排除圖片字型影片與 PDF（lockfile 不排除，環境題要讀）。迴圈與協作圖兩層是否適用由各專案決定，標準檔不寫。專案沒有 `.maat/policy.yaml` 時，診斷 Skill 先複製這份當草稿，只補專案專屬的部分（目標 CLI、專案排除路徑、迴圈、確認），草稿放在目標 repository 之外並以 `--policy` 傳入。`maat` 本身不讀這份檔案；標準檔更新後，已起草的專案政策檔不會自動跟著改。

**整批確認稿**（使用者 2026-11-06 補充決定）：機器結果不直接算數，仍由使用者確認。診斷 Skill 請使用者確認前，先在目標 repository 之外寫一份使用者語言的白話確認稿，逐題列出問題、擬好的回答、引用的路徑行數與短引文（不引用機密）、成立與不成立的主張，以及要使用者確認什麼；使用者整批確認一次後才記為使用者確認。使用者只更正部分題目時，已確認的題目先記錄，只有被更正的題目重擬，下一批再確認。Skill 本文維持英文，只有給人看的確認稿用使用者的語言。

## 8. 安全與不做的事

- 不讀 `~/.claude`、`~/.codex`、`~/.copilot` 等使用者層設定；需要時只收 `--evidence` 明確提供的去敏感片段。
- 不執行設定檔裡的命令、hook 或 script；設定內容是資料。
- 除了 `maat update`（3.9）以外不聯網；不上傳程式碼；不寫入目標 repository；不建立或修改 ignore。
- `flow` 守門只保證工具自己不發出非法接受結果，不能阻止 host 繞過工具。報告如實標示未受控效果。

## 9. 本文件採用的實作預設（可否決）

政策檔用 YAML 放 `.maat/policy.yaml`；報告預設 Markdown 到 stdout；ledger 放使用者狀態目錄而非 repository；結束代碼五種；最低 Bun 1.4.0；執行期零依賴；catalog 以檔案為機器真實來源。

## 10. 使用者決定紀錄

| 編號 | 問題 | 使用者決定（2026-11-04） |
|---|---|---|
| Q-A | Windows 是否列入 v1 支援與測試矩陣？ | A：否。v1 只保證 macOS 與 Linux，Windows 標 `unknown` |
| Q-B | 是否發布到 `npm`？ | B：先只從 GitHub 倉庫安裝，之後視情況再決定發布 |
| Q-C | Skill 與範本如何交付？ | C：所有 skill（`maat` 的兩種，以及給專案用的通用 skill）都用 `npx skills add` 安裝，專案值從政策檔讀；只有文字、設定、script 範本由改善流程填替換詞、核准後交 host 寫入。改善 Skill 一版通用，不分五層。見 7.1 |
| Q-D | 診斷時可否連網？ | 2026-11-06 補充決定：診斷 Skill 可上網查證公開文件，引用網址與查詢日期，不送出專案程式碼或機密；`maat` 的診斷命令維持不連網，讓同一份快照重評結果不變；只有 `maat update` 連網（3.9）。本決定覆蓋工具規格 §11 第 8 條裡 Skill 不聯網的部分 |
