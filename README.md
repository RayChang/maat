# maat

`maat` 是一個唯讀的診斷命令列工具，用來檢查一個 repository 為 coding agent（Claude Code、Codex、GitHub Copilot CLI）做了多少準備。它依五個層面逐題檢查，產出把證據分開記錄的審核報告與改善計畫，並提供流程控制（`maat flow`）：以守門規則與外部的只增不改紀錄檔，管控改善過程的核准、授權與狀態轉移。

`maat` 不會做的事：不呼叫模型、不執行專案裡的程式、不寫入被檢查的 repository、不讀 `~/.claude`、`~/.codex`、`~/.copilot`。除了 `maat update` 以外的命令都不連網。報告不給總分、百分比或等級。

## 需求

- Bun >= 1.4.0
- macOS 或 Linux（Windows 不保證）
- 執行期沒有第三方依賴

## 安裝

此 repository 是私有的，安裝的人需要有存取權限。

```sh
# 命令列工具：全域安裝，之後用 maat update 更新
bun add -g github:RayChang/maat

# 或不安裝，直接執行一次
bunx github:RayChang/maat

# Skill（maat-diagnose、maat-improve、verify-before-done）
npx skills add RayChang/maat
```

## 快速開始

以下範例在本 repository 內以 `bun src/cli/index.ts` 執行過；安裝後把它換成 `maat` 即可。`<輸出資料夾>` 請放在被檢查的 repository 之外。

```sh
# 1. 掃描 repository，報告以 Markdown 印到 stdout
maat scan tests/fixtures/positive --cli claude-code

# 2. 同時寫出 JSON 與 Markdown 報告（report.json、report.md）和快照
maat scan <repo> --cli claude-code --out <輸出資料夾> --snapshot <輸出資料夾>/s.snapshot.json

# 3. 不重掃檔案，用快照重新評估（可加 --policy、--evidence）
maat evaluate --snapshot <輸出資料夾>/s.snapshot.json

# 4. 依報告產生改善計畫（只輸出計畫，不修改任何檔案）
maat plan --report <輸出資料夾>/report.json --target context --out <輸出資料夾>/plan
```

所有命令都可加 `--json` 讓 stdout 輸出 JSON。診斷訊息輸出到 stderr。

## 命令一覽

| 命令 | 用途 |
|---|---|
| `maat scan [path]` | 掃描 repository，產生審核報告 |
| `maat evaluate` | 不重掃檔案，用既有快照加新證據重新評估 |
| `maat plan` | 依報告與目標產生改善計畫，不修改任何檔案 |
| `maat explain <id>` | 印出題目、能力、規則卡或範本的契約 |
| `maat catalog list` | 列出 catalog（可用 `--layer`、`--tier` 篩選） |
| `maat catalog validate` | 驗證 catalog |
| `maat policy init` | 印出政策檔骨架（不寫檔） |
| `maat policy validate [file]` | 驗證政策檔 |
| `maat attest template --check <id>` | 印出單題確認紀錄的欄位骨架（不寫檔） |
| `maat flow open` | 建立 flow，記錄計畫與材料指紋 |
| `maat flow approve` | 記錄修改核准 |
| `maat flow authorize` | 記錄執行授權，與核准分開 |
| `maat flow checkpoint` | 記錄動作前後的材料指紋 |
| `maat flow record` | 保存修改或評估的成果 |
| `maat flow decide` | 觸發狀態轉移：`accept`、`continue-fix`、`stop`、`handoff`、`resume` |
| `maat flow status` | 顯示 flow 目前狀態 |
| `maat flow list` | 列出 flows 與狀態 |
| `maat version` | 印出工具、schema、catalog、adapter 版本 |
| `maat update` | 從 GitHub 重新安裝最新版（唯一會連網的命令） |
| `maat help` | 列出每個命令與旗標 |

通用旗標：`--json`、`--out <dir>`、`--quiet`、`--catalog <dir>`、`--ledger <dir>`。`flow` 的紀錄預設放在使用者狀態目錄，不在被檢查的 repository 內，可用 `--ledger` 或 `MAAT_STATE_DIR` 改位置。各命令完整旗標見 `docs/specs/2026-11-04-maat-cli-interface.md`。

## 結束代碼

| 代碼 | 意義 |
|---|---|
| 0 | 命令完成。報告含缺口、`unknown` 或 `blocked` 也是 0，不算失敗 |
| 1 | 工具內部錯誤 |
| 2 | 用法錯誤：未知旗標、缺參數、互斥旗標 |
| 3 | 輸入資料錯誤：路徑不存在，或政策檔、catalog、快照無法解析、schema 不相容 |
| 4 | `flow` 守門拒絕：非法轉移、核准或授權未涵蓋、checkpoint 漂移、重複或過期事件 |

## 開發

```sh
bun install
bun test
bun run typecheck
bun run build   # 輸出 dist/cli.js
```

`catalog/`、`templates/`、`tests/fixtures/` 由腳本產生，不要手動編輯：

- `scripts/extract-catalog.ts`
- `scripts/materialize-templates.ts`
- `scripts/materialize-fixtures.ts`

實作計畫在 `docs/plans/maat-impl/`，規格在 `docs/specs/`。

## PR 流程

- 每個 PR 都會由 Claude 自動審查。
- 目標是 `develop` 的 PR：當 Claude 審查（由 `github-actions[bot]` 留言）核准目前的 head commit 時自動合併；若 PR 修改了 `.github/`，不會自動合併。
- 擁有者也可以留言 `/merge <commit sha>` 來合併。
- 目標是 `main` 的 PR 由人工合併。
