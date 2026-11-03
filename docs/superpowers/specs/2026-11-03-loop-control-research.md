# Loop 運作方式研究：迴圈該由誰控制

**狀態：** 已透過 Herdr 與既有 Codex 完成兩輪討論、一輪忠實度審查與一輪選項整理；修正版建議見第 12 節。使用者已決定 12.9 的 P-C 與 I-B，並於 2026-11-03 核准 12.3 的 L-D1–L-D6 修正版
**日期：** 2026-11-03
**前置文件：**
[五層工具研究](./2026-11-03-five-layer-tool-research.md)、
[五層檢查表檢視](./2026-11-03-five-layer-checklist-review.md)
**正式實作依據：** [五層工具正式 spec](./2026-11-03-five-layer-tool-spec.md)

使用者於 2026-11-03 核准 12.3 的 L-D1–L-D6 修正版；第 2–10 節的原始提案（「決定者」欄位、Loop 通過條件、hook 範本）已被取代，不是現行政策。SDK、IDE 與雲端能力的研究也不代表三家 CLI 已支援相同行為；核准只定案文件方向，不代表已實作，v1 仍為唯讀。

**閱讀順序：** 第 2–10 節保留首次研究與提案，供比對。第 12 節是與 Codex 討論後的修正版，已於 2026-11-03 由使用者核准；它修正「程式型即較成熟」「模型評估一律不算驗證」「hook 放行等於成功」及永久排除 runner 的推論，前文原始提案不是現行政策。

## 1. 問題

使用者的假設：

> loop 的方式應該不是靠提示詞 + agent 自己去判斷，應該要有個機械規則（程式碼）去控制。

這份文件回答三件事：

1. 現在實際的 loop 怎麼運作？
2. 哪些部分應該由程式控制，哪些不行？
3. 現在討論 Loop 的實際做法是否適合？

## 2. 結論摘要

1. **假設大致正確，但要分開問兩件事。**
   - 「誰推動迴圈」：再跑一圈或停下。實務上幾乎都是程式，例如 shell 的 `while`、Stop hook、SDK、CI 排程。
   - 「誰判斷完成」：可能是做事的 agent 自己、另一個模型、程式（測試）或人。弱點通常在這裡。
   - 例如官方 ralph-loop plugin：迴圈由 Stop hook 腳本推動，但「完成」是 agent 自己輸出 `<promise>…</promise>`，唯一的防線是提示詞「do not lie to exit」。
2. **建議原則：程式控制流程，模型產生內容，驗證放在做事的 agent 之外。**
3. **內層的工具呼叫迴圈本來就由模型決定。**
   - 呼叫哪個工具、何時回覆，是 agent 的本質，不需要也無法用程式取代。
   - harness 用權限、`max_turns`、花費上限框住它。
   - Loop engineering 談的是外層：觸發、驗收、重試、停止、改進。
4. **只有程式控制還不夠。**
   - 驗證器只是人類意圖的代理。
   - agent 會刪除或修改測試來通過檢查（ImpossibleBench）。
   - 所以驗證器本身要受保護；模糊的標準交給另一個模型或人，並標為較弱的證據。
5. **三家 agent 都能用程式擋住停止。**
   - Claude Code、Codex、Copilot 的 Stop hook 都能回傳 `decision: "block"`，讓 agent 繼續做。
   - 用 command 型 hook 跑測試，就是由程式判斷完成。
   - 各家的內建上限只防「連續阻擋卻沒有進展」，不限制總圈數。總圈數與花費要另外設定。
6. **現在適合討論，而且有必要。**
   - 它直接決定 Loop 層的題目怎麼問、detector 看什麼（第 9 節）。
   - 工具自己的修補流程（研究文件 7.2）也是一個 Loop，要照同樣原則設計。
   - 建議工具不做 loop runner，只檢查設定與產生範本（L-D4）。
   - Lulla et al. 指出 loop 的效益還沒有系統性證據，採用也少，所以 Loop 層仍然先問適用性。

## 3. 內層與外層迴圈

| 迴圈 | 誰推動 | 誰決定下一步 | 怎麼停 | 例子 |
|---|---|---|---|---|
| 內層：agent loop | harness 程式反覆呼叫模型 | 模型決定呼叫哪些工具 | 模型的回應不再呼叫工具；或達到 `max_turns`、`max_budget_usd` | Claude Agent SDK 的 agent loop |
| 外層：loop engineering | 觸發器加程式 | 停止條件與驗證結果 | 停止條件成立、達到上限、交給人 | Ralph、`/goal`、Stop hook、CI 排程 |

這也解釋了檢查表檢視 [5.5 來源之間的分歧](./2026-11-03-five-layer-checklist-review.md#55-來源之間的分歧) 中「Loop 在 Harness 之內或之上」的爭議：

- 「harness 擁有 `while`」講的是內層。
- 「one floor above the harness」（Osmani）講的是外層。

LangChain 把迴圈分成四級。下表加上「誰判斷」：

| 級 | 名稱 | 內容 | 誰判斷 |
|---|---|---|---|
| 1 | Agent loop | 模型呼叫工具，直到完成 | 模型 |
| 2 | Verification loop | grader 檢查結果，不通過就再做一次 | grader：「deterministic or agentic (LLM as a judge)」 |
| 3 | Event-driven loop | cron、webhook、Slack 訊息觸發 | 觸發由程式決定 |
| 4 | Hill-climbing loop | 分析 trace，「rewrite the harness with improved configuration」；LangChain 稱為「arguably most important」 | 分析 agent 提案，人把關 |

LangChain 也強調每一級都需要人：「An automated grader can check whether links resolve; it takes a human to notice the framing is wrong for the audience.」

## 4. 控制點：每個決定該由誰做

| # | 控制點 | 建議由誰決定 | 依據 |
|---|---|---|---|
| 1 | 觸發：何時開始一圈 | 程式（排程、repo 事件）或人 | Lulla et al. 整理的共識：「started on a schedule or by repository events」 |
| 2 | 選任務：這一圈做什麼 | 程式從結構化佇列取下一項；或 agent 從清單挑，清單格式由程式檢查 | Huntley 讓 agent 從 `fix_plan.md` 挑「the most important thing」；Anthropic 長任務用 JSON feature list，每次只做一項 |
| 3 | 做事 | agent | — |
| 4 | 驗證 | 優先用程式（測試、lint、型別檢查、build）；模糊的標準用另一個模型；品味與高風險交給人 | Anthropic：「The best form of feedback is providing clearly defined rules」，LLM as a judge「generally not a very robust method」；Huntley：「Anything can be wired in as back pressure to reject invalid code generation」 |
| 5 | 下一步：繼續、重試、交給人、停止 | 程式，依驗證結果與計數器 | 三家的 Stop hook 都能用 `decision: "block"` 擋住停止（第 6 節） |
| 6 | 上限：圈數、花費、時間、沒有進展 | 程式 | ralph-loop README：「Always rely on `--max-iterations` as your primary safety mechanism」；Agent SDK：「Setting a budget is a good default for production agents」 |
| 7 | 狀態：下一圈從哪裡接續 | 結構化檔案或 git，格式由程式檢查 | Anthropic 改用 JSON，因為模型比較不會亂改 JSON；Lulla et al.：幾乎沒有 repo commit 狀態檔 |
| 8 | 改進：從結果修改規則 | agent 提案，人核准；產物是規則、測試或 hook | LangChain 第 4 級 |

**重點：**

- 只有第 3 點一定要交給 agent。
- 第 8 點需要人核准。
- 第 2、4 點在標準模糊時可以交給模型，但要標為較弱的證據。
- 其餘控制點都能、也應該由程式決定。

## 5. 實作光譜：「完成」由誰判斷

| 等級 | 誰判斷完成 | 實例 | 已核對的事實 | 弱點 |
|---|---|---|---|---|
| A | 做事的 agent 自己 | agent 預設行為；ralph-loop 的 `<promise>`；Anthropic 長任務中，agent 自己測完後把 `passes` 改成 true | ralph-loop 只靠提示詞：「ONLY when statement is TRUE - do not lie to exit!」；Anthropic 記錄的失敗模式：agent 看到已有進展就「declare the job done」，或沒有做 end-to-end 測試就標為完成 | 完全靠提示詞 |
| B | 另一個模型讀對話 | Claude Code `/goal` | 每一圈結束後，由小型快速模型判斷條件；「It doesn't run commands or read files independently」 | 只看得到 agent 呈現的內容；圈數上限只能寫進條件文字，再由模型判斷 |
| C | 程式驗證 | command 型 Stop hook 跑測試，失敗就 block | 三家都支援（第 6 節） | 驗證器可能被 agent 修改；內建上限只防沒有進展 |
| D | 外部協調器 | shell `while` 加檢查指令；SDK 加 `max_turns` 與 `max_budget_usd`；CI 工作流程 | Agent SDK 達到 `max_turns` 時以 `error_max_turns` 結束 | 要寫程式；成本與延遲較高 |

**說明：**

- 「誰推動」與「誰判斷」是兩個軸。
  - ralph-loop 由程式推動，但由 agent 判斷，屬於 A。
  - Anthropic 長任務 harness 由多個 session 接力推動，但每個 feature 仍由 agent 判斷，防線是提示詞「It is unacceptable to remove or edit tests」與 JSON 格式。
- 等級可以組合。例如 C 先跑測試，通過後再用 B 判斷模糊標準；D 內部也可以使用 C。
- Huntley 原始的 Ralph 是 `while :; do cat PROMPT.md | claude-code ; done`。
  - 它沒有停止條件，由人在旁觀察並調整提示詞。
  - 他自己稱它「deterministically bad in an undeterministic world」。
  - 他也指出 Claude 有「minimal and placeholder implementations」的傾向。
- 使用者的假設，對應到這張表就是「至少要到 C」。

## 6. 三家 agent 的機械控制點

| 項目 | Claude Code | Codex | Copilot |
|---|---|---|---|
| 擋住停止 | Stop hook 回傳 `decision: "block"` 加 `reason`，或 exit code 2 | Stop hook 回傳 `decision: "block"`，`reason` 成為新的 continuation prompt；exit code 2 相同；任一 hook 回傳 `continue: false` 時優先 | `agentStop` 回傳 `decision: "block"`，以 `reason` 當作下一輪的提示 |
| subagent | `SubagentStop` | `SubagentStop` | `subagentStop` |
| 可用的 hook 類型 | command、HTTP、MCP tool、prompt、agent | command、`mcp_tool`；prompt 與 agent 會被解析但略過 | command、http；prompt 型只用於 `sessionStart`，作用是自動送出文字 |
| 是否已被 hook 強迫繼續 | 輸入有 `stop_hook_active` | 輸入有 `stop_hook_active` | 輸入有 `stop_hook_active` |
| 內建防失控上限 | 連續 8 次 block 後結束；agent 呼叫工具會重設計數；可用 `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` 調整 | 文件沒有提到 | 連續 8 次 block 後，CLI 結束這個 turn |
| 目標指令 | `/goal`：小型模型每圈判斷條件；條件最多 4,000 字 | `/goal`：設定、編輯、暫停、繼續、清除；最多 4,000 字；判斷方式文件沒有說明 | 未核對 |
| 圈數與花費上限 | Agent SDK `max_turns`、`max_budget_usd`；CLI `--max-budget-usd` | 未核對 | 未核對 |
| hook 設定位置 | `.claude/settings.json` | `hooks.json`、`config.toml` 的 `[hooks]` | `.github/hooks/*.json`、`.github/copilot/settings.json`；也讀 repo 的 `.claude/settings.json` |

**觀察：**

- 只有 Claude Code 能用 hook 讓模型判斷停止（prompt 型、agent 型或 `/goal`）。Codex 與 Copilot 的 Stop hook 只能跑程式或呼叫服務。
- 內建上限只防「連續阻擋卻沒有進展」，不是總圈數上限。在 Claude Code，只要 agent 在兩次 block 之間呼叫過工具，計數就重設。總圈數要靠 hook 自己計數（例如 ralph-loop 的狀態檔），或交給外部協調器。
- hook 腳本應該檢查 `stop_hook_active`，避免在條件永遠不會成立時無限阻擋。
- Codex 文件提醒：「Treat tool hooks as a useful guardrail, not a complete enforcement boundary.」PreToolUse 擋不住所有寫檔路徑，所以驗證器保護不能只靠 hook。

## 7. 為什麼只有程式控制還不夠

| 問題 | 證據 | 對策 |
|---|---|---|
| 驗證器只是代理 | Verification Horizon：「Every verifier we can build is only a proxy for human intent」 | 驗證要隨產出一起演進；重要的標準交給人 |
| agent 會鑽測試的漏洞 | ImpossibleBench：agent 會刪除失敗的測試、修改測試，甚至用 operator overloading；提示詞、能否存取測試、回饋迴圈都會影響作弊率 | 保護驗證器（見下方） |
| 沒有外部回饋時，自我修正效果差 | Huang et al.（ICLR 2024）：沒有外部回饋時，LLM 難以自我修正推理，有時反而變差 | 驗證放在 agent 之外 |
| 提示詞防線不可靠 | ralph-loop 與 Anthropic 長任務都只能用強烈措辭要求「不要說謊」「不要改測試」 | 改用程式檢查 |
| LLM 判斷不穩定 | Anthropic：LLM as a judge「generally not a very robust method」 | 只用於模糊標準，標為較弱證據，並用不同的模型或 subagent |

**保護驗證器的做法：**

- 用權限規則或 PreToolUse hook 禁止 agent 修改測試與驗證設定的路徑。
- 用 CODEOWNERS 要求測試與 CI 設定的變更由人審查。
- 用 diff 檢查：測試被刪除、加了 skip、assertion 數量下降、門檻被放寬時，判定失敗。
- 在 agent 無法寫入的環境重跑驗證，例如 CI。
- 做事與驗收分開。Osmani 稱為「keep the maker away from the checker」。

**偵測沒有進展：** 同樣的錯誤連續出現、diff 為空、測試結果沒有變化時，交給人，不要再跑一圈。

## 8. 建議的控制原則

1. 程式推動迴圈，程式決定停止；做事的 agent 不能單獨宣告完成。
2. 停止條件寫成可執行的檢查：指令加預期結果。
3. 驗證在做事的 agent 之外執行：另一個程序、另一個模型，或 CI。
4. 驗證器受保護；修改驗證器需要人核准。
5. 圈數、花費、時間都有上限，也偵測沒有進展。
6. 超過上限或無法判斷時交給人，並附上目前狀態。
7. 狀態用結構化檔案保存，格式由程式檢查。
8. 改進由 agent 提案、人核准，產物是規則、測試或 hook。

## 9. 對工具的影響

### 9.1 Loop 題目改成問「誰決定」

建議 Loop 題目加一個屬性「決定者」，取值為：

- 程式
- 另一個模型
- 做事的 agent
- 人
- 沒有

研究文件 4.2 的「作法形式」與「證據等級」照舊使用（L-D1）。

| 編號 | 題目（依檢查表檢視的提案） | 建議的目標決定者 | 對應第 4 節的控制點 |
|---|---|---|---|
| L1 | 目標有可以測試的停止條件 | 程式 | 4、5 |
| L2 | 每一圈都用檢查結果決定下一步（繼續、重試、交給人、停止） | 程式；模糊標準可用另一個模型 | 4、5 |
| L3 | 圈數與花費都有上限，超過交給人 | 程式 | 6 |
| L4 | 每一圈留下可接續的結構化紀錄 | 程式檢查格式 | 7 |
| L5 | 誰來啟動迴圈有定義 | 程式或人 | 1 |
| L6（新） | 驗證器不能被 agent 繞過 | 程式加人 | 4 |
| L7（新） | 從紀錄找出重複的錯，變成規則、測試或工具 | agent 提案，人核准 | 8 |

**報告呈現方式（示意）：**

```text
Loop     ready
  - L1 停止條件：有；決定者＝做事的 agent（ralph-loop <promise>）
           → 目標：程式。建議：加 command 型 Stop hook 跑 npm test（需要核准）
  - L3 上限：只有 --max-iterations，沒有花費上限
  - L6 驗證器保護：無；agent 可以修改 tests/
```

### 9.2 候選 detector

| detector | 看什麼 | 判定 |
|---|---|---|
| `loop.stop-gate.command` | Stop／agentStop hook 是 command 型，而且指令包含已記錄的驗證指令（`commands.verify-documented`） | 決定者＝程式 |
| `loop.stop-gate.model` | Claude Code 的 prompt 型或 agent 型 Stop hook | 決定者＝另一個模型 |
| `loop.self-declared` | ralph-loop 狀態檔、`--completion-promise` 這類只比對 agent 輸出字串的設定 | 決定者＝做事的 agent；列為風險 |
| `loop.bounds` | `--max-iterations`、`max_turns`、`max_budget_usd`／`--max-budget-usd`、CI 的 `timeout-minutes` | 有哪些上限 |
| `loop.stop-hook-active-checked` | Stop hook 腳本是否讀取 `stop_hook_active` | 靜態搜尋，只當弱訊號 |
| `verifier.protected` | 權限規則禁止修改測試路徑、PreToolUse hook、CODEOWNERS 涵蓋測試與 CI、CI 檢查測試是否被刪除 | 驗證器保護的程度 |
| `loop.state-structured` | 結構化的狀態檔（feature list、進度檔），而且已 commit 或明確 ignore | 狀態保存方式 |
| `loop.trigger` | CI 工作流程呼叫 agent CLI 或 action（例如 `anthropics/claude-code-action`、`codex exec`）；`schedule:` cron | 觸發方式 |

> 依 [12.9](#129-第四輪兩項新修正的選項) 使用者選擇的 P-C，上表 `verifier.protected` 一列不再是單一能力或保護等級。四種訊號改為分項觀察，各自記錄保護什麼、防什麼、邊界、證據與未知，不產生 `verifier.protected` 的能力結果。

**限制：**

- 靜態掃描最多到「已設定，未確認生效」。要到「已確認生效」，需要 CI 執行紀錄或使用者附依據的確認。
- ralph-loop 的狀態檔是 `.claude/ralph-loop.local.md`，通常不 commit，所以常常看不到，只能靠 plugin 設定或使用者回答。
- 這些 detector 只描述設定，不評估 loop 的效果。

### 9.3 必要條件的調整（提案）

研究文件 4.3 目前的 Loop 條件：

- 必要條件：`verifier.configured`、`recovery.available`
- 建議條件：`verifier.confirmed`

提案（L-D2）：

- 新增建議條件 `verifier.protected`。沒有保護時，等級 C 的驗證可以被 agent 改掉。因為靜態偵測不完整，暫不列為必要條件。（已被 12.9 的 P-C 取代：不新增此能力；L-D2 其餘部分仍待決。）
- 只有模型判斷的 Stop gate（prompt 型 hook 或 `/goal`）不滿足 `verifier.configured`，因為它不會執行驗證指令。

### 9.4 工具自己的修補流程

研究文件 7.2 的修補流程照這份原則設計：

| 控制點 | 修補流程中的做法 |
|---|---|
| 推動 | CLI 決定下一步；agent skill 只呼叫 CLI，不自行判斷 |
| 做事 | agent 依規則卡修改檔案 |
| 驗證 | CLI 獨立重跑 `verify` 欄位的 detector，不採信 agent 的回報 |
| 停止 | detector 結果達到目標，或用完每個缺口的圈數與花費上限，或遇到需要人決定的項目 |
| 驗證器保護 | 同一次修改不能放寬測試、lint、detector 或 CI（研究文件 7.2 已有） |
| 狀態 | patch manifest 與每一步的結果放在 CI artifact 或本機快取 |

- v1 只產生報告與計畫（D7），但報告格式要先帶好 `verify` 與停止資訊，之後開放修補時不必改格式。
- agent skill 本身是提示詞。要維持程式控制，完成與否由 CLI 的 exit code 決定。必要時可以搭配 Stop hook 呼叫 CLI 的 verify 指令，讓 agent 在 detector 通過前無法結束。

### 9.5 工具不做什麼（建議）

- 不做 loop runner 或協調器。工具檢查專案的 loop 設定、產生設定範本，不負責長時間執行 agent。
- 不判斷專案「該不該」有 loop。Loop 層仍由適用性問題決定，允許 `not_applicable`。

## 10. 待決問題

以下是首次研究的建議紀錄；[第 12 節](#12-herdr-與-codex-的共同討論) 列出兩輪討論與第三輪忠實度審查後的修正版，修正版已由使用者核准，首次建議已被取代。

| 編號 | 問題 | 選項 | 建議 |
|---|---|---|---|
| L-D1 | Loop 題目是否加「決定者」屬性 | 加／不加，只用作法形式與證據等級 | 加；報告顯示目前與目標的決定者 |
| L-D2 | 驗證器保護與模型判斷怎麼影響必要條件 | `verifier.protected` 列為必要條件、建議條件或只當題目；只有模型判斷的 Stop gate 是否滿足 `verifier.configured` | `verifier.protected` 先當建議條件；只有模型判斷時不滿足 `verifier.configured` |
| L-D3 | 修補內容是否提供 Stop hook 範本 | 依 vendor adapter 提供範本／只給文字說明 | 提供 command 型範本；預設檢查 `stop_hook_active`，並在 hook 內記錄圈數上限 |
| L-D4 | 工具是否做 loop runner | 做／不做 | 不做；只檢查設定與產生範本 |
| L-D5 | 「agent 自己宣告完成」的 loop 怎麼呈現 | 視為達標／視為沒有停止條件／有停止條件但未達目標 | 有停止條件，但決定者是「做事的 agent」，未達目標決定者「程式」；列為風險，建議改成程式判斷 |
| L-D6 | 修補流程的預設上限（之後的版本） | 每個缺口的圈數、花費、時間 | 開放修補功能時再決定 |

## 11. 來源核對狀態

| 來源 | 用到的內容 | 狀態 |
|---|---|---|
| [Claude Code：goal](https://code.claude.com/docs/en/goal) | `/goal` 由小型模型判斷；不執行指令也不讀檔；條件最多 4,000 字 | 已核對 |
| [Claude Code：hooks](https://code.claude.com/docs/en/hooks) | Stop `decision: "block"`；`stop_hook_active`；8 次上限與呼叫工具重設；`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`；hook 類型 | 已核對 |
| [Claude Agent SDK：agent loop](https://code.claude.com/docs/en/agent-sdk/agent-loop) | 內層迴圈；`max_turns`、`max_budget_usd`；`error_max_turns`；「Setting a budget is a good default」 | 已核對 |
| [Claude Code：headless](https://code.claude.com/docs/en/headless) | `--max-budget-usd` | 已核對 |
| [Codex：hooks](https://developers.openai.com/codex/hooks) | Stop block 產生 continuation prompt；`continue: false` 優先；`stop_hook_active`；只執行 command 與 `mcp_tool`；「not a complete enforcement boundary」；沒有提到連續阻擋上限 | 已核對 |
| [Codex：slash commands](https://developers.openai.com/codex/cli/slash-commands) | `/goal` 的操作與 4,000 字上限 | 已核對；判斷方式文件沒有說明，Osmani 的描述是二手 |
| [Copilot：hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration) | `agentStop` block；8 次上限；`stop_hook_active`；hook 類型；設定位置 | 已核對 |
| [ralph-loop plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-loop) | Stop hook 腳本；`<promise>` 完全比對；`--max-iterations` 預設無上限；提示詞防線 | 已核對 README 與 `hooks/stop-hook.sh` |
| [Huntley：Ralph](https://ghuntley.com/ralph/) | `while` 迴圈；一圈只做一件事；back pressure；「deterministically bad」 | 已核對 |
| [Anthropic：Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | initializer 與 coding agent；JSON feature list；提示詞防線；失敗模式 | 已核對 |
| [Anthropic：Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) | 規則型回饋最好；LLM as a judge 不穩定 | 已核對 |
| [LangChain：The Art of Loop Engineering](https://www.langchain.com/blog/the-art-of-loop-engineering) | 四級迴圈；grader；人的角色 | 已核對 |
| [Osmani：Loop Engineering](https://addyosmani.com/blog/loop-engineering/) | 「one floor above the harness」；maker 與 checker 分開 | 已核對 |
| [Lulla et al., arXiv:2608.21884](https://arxiv.org/abs/2608.21884) | 共識組成；沒有系統性證據；36,710 個 repo 中 217 個有 loop；幾乎沒有 commit 狀態檔 | 已核對摘要 |
| [Huang et al., arXiv:2310.01798](https://arxiv.org/abs/2310.01798) | 沒有外部回饋時難以自我修正 | 已核對摘要 |
| [Verification Horizon, arXiv:2606.26300](https://arxiv.org/abs/2606.26300) | 驗證器只是代理 | 已核對摘要 |
| [ImpossibleBench, arXiv:2510.20270](https://arxiv.org/abs/2510.20270) | agent 刪改測試、operator overloading；影響作弊率的因素 | 已核對摘要 |

## 12. Herdr 與 Codex 的共同討論

**日期：** 2026-11-03

**方式：** Copilot 透過 Herdr 與使用者現有的 Codex 進行兩輪討論，再請 Codex 審查本節是否忠實呈現其意見（第三輪）。沿用 Codex 的 FVG 研究脈絡，沒有另開替代 agent。

**狀態：** 12.3 的 L-D1–L-D6 修正版已由使用者核准（2026-11-03）。核准只定案文件方向；未實作 runner、未改動 FVG、未執行三家 CLI 的 hook 行為測試。

### 12.0 討論紀錄與證據

| 項目 | 內容 |
|---|---|
| Herdr 位置 | workspace `w1C`，tab `w1C:t1` |
| Codex | pane `w1C:p1`，terminal `term_65f59187db74810`，agent kind `codex`；即使用者原本已在研究 Loop 的 Codex |
| Copilot | pane `w1C:p2`，Copilot session `fae7ca1e-e204-4fcb-b2b4-7bfcad652e0b` |
| 傳遞方式 | `herdr agent prompt w1C:p1 … --wait`。Herdr 讀終端只取得部分回覆（alternate screen 限制），因此請 Codex 將完整回覆原樣寫入檔案 |

| 輪次 | 語言 | 內容 | 完成時間（+0800） | 完整回覆 | SHA-256 |
|---|---|---|---|---|---|
| 1 | 中文 | Codex 原有概念、FVG 經驗、L-D1–L-D6 逐項意見、共同契約 | 16:59 回覆；17:00:15 存檔 | `codex-loop-round1.md` | `2a641c97…5fe0272` |
| 2 | 中文 | Copilot 提出 A–F 修正與六個情境，Codex 反駁或收緊 | 17:01:59 存檔 | `codex-loop-round2.md` | `d4794d2e…f0bcf` |
| 3 | 英文 | 審查本節是否有錯誤歸屬、過強陳述或遺漏 | 17:07:47 送出；17:08:34 存檔 | `codex-loop-round3.md` | `6d25dba4…3ed5d` |
| 4 | 英文 | 為 12.8 的兩項新修正整理可選方案 | 17:16:20 送出；17:17:17 存檔 | `codex-loop-round4.md` | `d462ebe1…e95f4b7` |

- 四個檔案位於 `~/.copilot/session-state/fae7ca1e-e204-4fcb-b2b4-7bfcad652e0b/files/`，是本機暫存，不納入 repo。Codex 終端歷史可用 `herdr agent read w1C:p1 --source recent-unwrapped` 部分查看。
- 前兩輪在使用者表示可以用英文討論之前進行，所以使用中文。
- 第三輪後，Copilot 親自核對了 12.1 中 FVG 的 `drive.ts:11–35`、`stop-verify.sh:11–12` 與 `fvg-feature-delivery.md:44`。其餘 FVG 敘述仍是 Codex 的回報。
- 第三輪的修正已直接套用到 12.1–12.7；12.8 記錄審查結果與 Codex 的新修正；12.9 是第四輪整理的選項。

### 12.1 Codex 原有概念與 FVG 經驗

Codex 的持續系統概念是：**長期目標持續存在，模型按需執行有界工作，而不是永遠不停地產生下一輪。**

一次典型運作如下（第 1、3–5 步是 Codex 第一輪的概念；第 2 步的三分法由 Copilot 在第二輪提出，Codex 同意）：

1. 保存目標、政策與狀態，等待事件或排程。
2. 分開判斷事件是否重複、工作是否值得做、是否獲准執行。
3. 啟動有界 run，由 agent 產生候選成果。
4. 按驗收政策取得證據，接受、拒絕、等待人或有上限地重試。
5. 保存結果後休眠；run 結束不代表長期目標已完成。

第二輪共同補充：模型可以提出工作與優先順序，但提出本身不能擴張權限；額度提高另依 12.6 記錄授權。沒有新任務也可以是正常狀態，不必喚醒模型；事件來源失聯則是另一種健康問題。

**由 Codex 依其先前閱讀回報的 FVG 事實：**

| 觀察 | 位置 | 證據邊界 |
|---|---|---|
| Runtime 管理 graph transition、SQLite 狀態與**主要**外部操作；agent 執行 bounded visit | `fvg/docs/agents/fvg-feature-delivery.md:10` | Codex 依現況文件回報。不推論所有外部效果都只由 runner 執行 |
| Writer 提交 candidate，runner 執行 task gate；只有 `review: required` 時才由 Task Reviewer 審查；runner 接受特定 candidate SHA | `fvg/docs/agents/fvg-feature-delivery.md:44` | Copilot 已核對第 44 行。可借用「候選與接受分離」，不強制所有系統使用 Git SHA |
| `driveRun` 遇 `advanced` 繼續並重設本地重試旗標；遇 `active` 輪詢，但已標記 blocked 的 visit 立即返回；非 visit 的 blocked 先重試一次，仍 blocked 才返回 | `fvg/tools/fvg-feature-delivery/src/lib/runtime/drive.ts:11–35` | Copilot 已核對原始碼。這是單次 drive 的本地重試，不是持久的全域重試預算，也不代表已有常駐 scheduler |
| Observer 檢查單次 run 並引用證據；跨 run digest 由 runtime 在初始化時依重複類別計算，固定提供給後續 Planner，仍為 advisory | `fvg/.claude/agents/fvg-delivery-observer.md`、`fvg/tools/fvg-feature-delivery/README.md` | Codex 依文件回報，未提供行號，Copilot 未核對。不是已證實的每次 run 行為，也不是自動修改或部署機制 |
| 共用 Stop hook 在 `stop_hook_active` 為 true 時直接 `emit_success` 放行 | `fvg/tools/agent-harness/hooks/stop-verify.sh:11–12` | Copilot 已核對。這是靜態檢查，不證明每個 client 都會呼叫此 hook，也不代表放行等於驗收通過 |

值得借鑑的是權責、版本綁定與可恢復操作，不是固定角色、八階段、SQLite、MR 或某一家 agent。這些 FVG 觀察是案例，不是跨專案標準。

### 12.2 對首次研究的主要修正

**一、機械控制與證據品質是不同軸，不是 A–D 的成熟度階梯。**

Shell 用 `grep DONE` 決定停止，仍然只是將 worker 自我宣告交給程式解析。反過來，授權人審核文案可以是有效的唯一驗收，不必假裝程式可以判斷審美。

外部 orchestrator 可以提供持久控制，但不自動使內部驗證更可靠；另一個模型也不自動等於獨立驗證。兩者可能共用可被修改的測試、工作區或失真的對話紀錄。

**二、至少要分開三件事：**

- **Verifier result：** 實際取得什麼驗收結果，或遇到 error／timeout／unknown。
- **Session／process exit：** agent 或程序為何停止。
- **Task acceptance：** 哪個權責主體依哪個政策接受了哪個版本的成果。

Hook cap 放行、程序 exit 0、worker 說完成，都不能單獨證明 task accepted。`blocked` 通常是可恢復等待，不必是永久終止。

**三、不把「我們觀察不到」當成「不需要」。**

Verifier 保護的重要性來自任務風險，不取決於 scanner 是否容易偵測。CODEOWNERS 可提供審核治理訊號，但不能單獨證明本地 agent 無法修改測試。

**四、持續 runtime 與 audit 是不同職責。**

Audit 回答有哪些控制、缺什麼與證據不足之處；runtime 負責喚醒、授權、執行、驗收、恢復與休眠。兩者可以共用證據語意，但 v1 不因此變成 runner。

### 12.3 L-D1–L-D6 修正版建議

| 編號 | 共同建議 | 與首次提案的差異／邊界 | Codex 第三輪 |
|---|---|---|---|
| L-D1 | Loop 描述分開流程控制權、證據產生者／方法、接受權／政策，以及被驗收對象與版本。這些是候選描述維度，尚未決定 v1 必填欄位或完整 runtime schema；各維度分別標示已知或 unknown | 不再用單一「決定者」欄位；被驗收對象不存在或無法觀察時不得捏造 fingerprint | 同意，已修文 |
| L-D2 | `configured` 描述可辨認的評估配置；人、模型、程式皆可能是合法評估方式，充分性由該 check 的政策決定。辨認出評估者或單一設定，不代表政策、輸入、觸發與結果如何影響 acceptance 的整條路徑已配置，缺少者標示 unknown。保護描述對象、威脅與實際邊界 | 不再一律排除模型-only 評估；低風險可 recommended，高風險／無人監督可在另行核准的 profile 要求更強保護，尚不新增統一門檻 | 同意，已修文；另見 12.8 命名修正 |
| L-D3 | v1 改善計畫可描述 hook 契約；可執行範本需按產品介面、版本與失敗模式驗證後，再決定提供方式 | 不直接安裝。error／timeout 不得視為 pass；缺少政策要求的證據時維持未接受，授權例外須明示並記錄缺漏；可以停止並交人，不是永遠 block；hook 不是完整權限或驗收邊界 | 同意，已修文 |
| L-D4 | v1 不做 runner；長期可研究獨立 runtime 或選用模組，不在此永久排除，也不立即納入產品範圍 | 先共用證據語意，不預設通用 RPC、queue、資料庫或 orchestration API | 同意 |
| L-D5 | 自稱完成可提交 candidate 或結束一次 visit；是否 accepted 依政策、授權與證據判斷。audit 的 `verified` 僅限該 check 明定的證據範圍，不代表 runtime 任務已完成 | 不再一律要求「最終決定者＝程式」；低風險自我宣告若被政策允許，也須明示，不得偽裝成獨立驗證；blocked 通常可恢復，終止狀態依政策定義，不先固定所有 runtime 枚舉 | 同意，已修文 |
| L-D6 | 現在先定義額度作用範圍、持久計數、重試／重啟帳務、無進展、取消與外部操作不確定性的處理；並釐清誰有權取消或提高額度、限制涵蓋哪些啟動路徑與進行中的外部效果。數值待場景量測 | 不預設固定圈數／金額；hard limit 只在可證明的強制範圍內成立，與估算／soft limit 分開；不要求每個情境都有 attempt／time 上限或能精確量測所有資源 | 同意，已修文 |

核准的是方向：這些建議不改變 D7 的 v1 唯讀範圍，也不代表新增必填欄位、profile 門檻、可執行範本或 runner 已獲核准。

### 12.4 用六個情境檢驗設計

| 情境 | Audit 可以說什麼 | 未來 runtime 應處理什麼 |
|---|---|---|
| Shell 解析 worker 的 `DONE` | 可辨認時報告自我宣告被程式解析；不推論獨立驗證或實際載入 | 保存 candidate claim，依政策決定是否足以接受 |
| 品牌文案只有授權人驗收 | 報告人工政策與明確提供的確認，不能僅憑設定證明身分或核准 | 將審核人、政策與成果版本綁定；變更後依政策重新確認 |
| 測試通過的是 A，實際 apply 的是 B，或環境改變 | 有版本證據時指出不一致；資訊不足時報告不可比較 | 不直接沿用 A 的結果；重驗或證明政策允許的等價，發布前再比對以避免競態 |
| Verifier timeout，但 hook 因 cap 放行 | 分開記錄 timeout 與放行；兩者都不是 pass | 保持未接受，依政策與剩餘預算重試、等待或交人；例外核准不能把 timeout 改寫成 pass |
| API 成功但回應遺失，重啟又收到同一事件 | 可指出去重／reconciliation 設定訊號；不能從關鍵字宣稱 exactly-once | 用持久 operation identity 與服務支援的冪等或 readback 先查核；無法確認時保持 ambiguous／blocked，不盲目重試 |
| 一整天沒有新任務，但長期 goal 仍存在 | 不能據此斷言成功、失敗或 scheduler 健康 | goal 維持 active／監控，與單次 run 的結束分開。適用時區分健康閒置、事件來源失聯、授權過期、未履行的定期義務（第三輪 Codex 新增）；不要求每個 goal 都有 heartbeat |

這是設計推演，不是六項 runtime 功能已通過測試。

### 12.5 最小共同語意

不先設計可執行 protocol；只保留未來交換證據所需的候選概念：

| 概念 | 要表達的事情 |
|---|---|
| `subject` | 被檢查的目標、範圍、版本／fingerprint |
| `claim` | 誰聲稱設定存在、候選完成或驗證通過 |
| `evidence` | 可定位依據、來源、時間、範圍與不可得部分 |
| `decision` | 誰依哪個政策與證據作出接受、拒絕、等待等決定 |
| `result` | 評估結果與 error／timeout／cancel 等原因，不混同程序退出 |
| `provenance` | schema、catalog、detector／policy 版本與確認有效性 |

驗收證據除綁定成果外，也應適當記錄或綁定影響結論的必要驗證輸入與環境資訊，例如測試、verifier 版本、設定與依賴。這不表示一定能做出完整、不可變的單一 fingerprint；無法取得時明示限制，不宣稱完整可重現。

**長期目標的狀態詞彙（依 12.9 的 I-B）：** 描述長期運作的系統時，下列面向分開說明，不合併成單一的「健康／閒置」：

| 面向 | 要分辨的事情 |
|---|---|
| 目標生命週期 | 長期目標仍有效、暫停、已完成或已撤銷，與單次 run 的結束分開 |
| 事件來源健康 | 沒有事件，還是事件來源失聯或無法觀察 |
| 授權狀態 | 執行所需的授權或憑證仍有效、即將過期或已失效 |
| 定期義務 | 有定期要做的事時，是否按期完成或已逾期；沒有定期義務時不適用 |

這份詞彙是選用且不完整的。它不是 v1 的檢查、detector、必填報告欄位，也不是 runtime 狀態機；v1 報告只能在已核准檢查取得的證據範圍內使用這些字眼，不能據此斷言實際運作狀態。也不要求每個長期目標都有 heartbeat。

這些語意延續 D8：observation、assessment、attestation 分開。未來 runtime 提供的 claim 也不自動成為本工具獨立驗證的事實。

### 12.6 上限與恢復的補充

- 對自主執行，attempt／run／goal／全域額度的作用範圍須明確；重開 session、呼叫工具或重試不能偷偷重置應累計的上限。
- 能否稱為硬上限，取決於計數是否持久且具權威，以及所有啟動路徑是否受控。經政策授權者提高額度時，記錄其授權、範圍與依據（第二輪 Copilot 提案，Codex 同意；授權者不一定是使用者本人）。
- 誰能下達取消或 kill-switch、取消時如何處置進行中的操作，列為研究問題，不是 v1 要求。
- 花費若只能估算或延後回報，就只能報告估算／soft limit，不能承諾精確美元硬上限。
- 無進展要看任務：調查、讀取日誌、等待 CI 可能沒有 diff，不能因此一律判失敗。
- 停止本地程序不代表取消已送出的外部請求；取消後恢復仍可能需要 reconciliation。
- 外部事件去重不等於外部副作用只會發生一次。服務不支援可靠冪等／readback 時，要保留不確定結果並交人。
- 純人工流程不應無條件套用自主 runtime 的所有預算要求。

### 12.7 共識、未決與證據限制

第二輪後沒有核心概念分歧；Codex 特別補強三點：辨識配置不等於整條 acceptance path 已配置、驗收證據應適當記錄或綁定必要輸入且缺失須明示、硬上限受實際 enforcement 範圍限制。

仍需使用者決定各 check／profile 的適用性、證據充分性、例外核准、runtime 是否另立範圍，以及哪些額度真正可強制。

三家 CLI 的 hook timeout、取消、cap、重入、設定載入失敗與多 hook 互動，尚未做指定版本的實機測試。Codex 第一輪另查閱了官方 Stop 文件，但本次不因此提升其行為保證。**概念共識不等於 vendor enforcement 已證實，agent 共識也不等於使用者已核准。**

### 12.8 第三輪：忠實度審查

Copilot 用英文請 Codex 比對本節與它前兩輪的原始回覆。Codex 的結論是：

> "Overall, it is a faithful synthesis, clearly labels the proposals as awaiting the user's decision, and preserves D7. The items below are precision edits, not a claim that the whole account is misleading."

| 類別 | Codex 指出的問題 | 處理 |
|---|---|---|
| 歸屬 | admission 三分法、「提出優先順序不能擴權」、記錄額度提高，原是 Copilot 第二輪提案，Codex 只是同意 | 12.1、12.6 已標明出處 |
| 過強陳述 | 「error／timeout 不接受成果」與 12.4 的授權例外互相矛盾 | L-D3 改為「不得視為 pass；授權例外須明示並記錄缺漏」 |
| 過強陳述 | 「fingerprint 應涵蓋必要輸入」可能被讀成要求單一完整雜湊 | 12.5、12.7 改為「適當記錄或綁定，缺失須明示」 |
| 過強陳述 | 「使用者核准提高額度」：授權者應依政策，不一定是使用者 | 12.6 已修正 |
| 遺漏 | L-D1 未說明是候選維度；L-D2 未提整條 acceptance path；L-D5 未說明 `verified` 的範圍；L-D6 未提取消／提高額度的授權者 | 12.3 已補 |
| FVG 精確度 | `drive.ts` 的 blocked 行為被過度壓縮；Task Reviewer 只在 `review: required` 時執行；Stop hook 應引用第 11–12 行 | 12.1 已修正，Copilot 已核對原始碼 |

**Codex 看過全文後的新修正（不是先前的共識）：**

1. 「沒有新任務就是正常休眠」不宜當成固定的 runtime 狀態。適用時應區分健康閒置、事件來源失聯、授權過期與未履行的定期義務；這不表示每個 goal 都需要 heartbeat。已反映於 12.4；使用者選擇 12.9 的 I-B。
2. `verifier.protected` 這個名稱在定義保護對象、威脅與強制邊界之前可能誤導。Catalog 應先保留底層觀察，日後才把它當成依政策算出的結果，而不是一個通用的保護屬性。這與 Codex 先前立場相容，命名偏好是新的；使用者選擇 12.9 的 P-C。

Codex 也強調：第三輪只是比對文件與來源，不是執行測試或新的 vendor 研究；概念共識仍不等於 enforcement 已被證實，也不等於使用者已核准。

### 12.9 第四輪：兩項新修正的選項

**狀態：** 使用者於 2026-11-03 決定採用 **P-C** 與 **I-B**。已反映於 9.2、9.3 的註記與 12.5 的詞彙表。使用者隨後也核准了 12.3 的 L-D1–L-D6 修正版。

兩項決定的範圍：P 只決定「怎麼呈現」驗證器保護，不決定 L-D2 的必要或建議條件。I 的選項都不改變 D7 的 v1 唯讀範圍。所有選項中，`verified` 只代表符合該檢查定義的證據要求；設定存在、使用者確認與實際執行仍分開記錄，unknown 不會被改成 missing 或通過。

#### P：驗證器保護怎麼呈現

比較用的例子：repo 的 CODEOWNERS 涵蓋 `tests/`，CI 有「測試被刪除」檢查；沒看到本機禁止修改測試的規則；分支保護與實際執行狀況看不到。

| 選項 | 做法 | 例子會怎麼報告 | 好處 | 風險 |
|---|---|---|---|---|
| P-A 單一能力 | 保留一個 `verifier.protected`，先定義保護對象、威脅與可接受的證據 | 取得實際強制的證據前都是 unknown；不能因為有其中一個檔案就說「已保護」 | 一個標題，容易理解 | 不同保護混在一起：任一訊號成立就算，會把審核治理誤當執行隔離；要求全部成立，又會懲罰其他合理作法 |
| P-B 單一能力分級 | 分成「無／只有指示／審核治理／執行時強制」等級 | 簡化版會標「審核治理」，暗示審核真的有效；嚴謹版只能列出各項觀察，給不出等級 | 方便比較 | 這些等級不是線性的：有執行時阻擋不代表審核嚴格；刪除檢查擋不住把測試改弱 |
| P-C 先列觀察 | 不定義保護能力，也不分級。逐項記錄看到的措施、保護什麼、防什麼、邊界與未知；等有 profile 與威脅模型再決定怎麼歸納 | 「CODEOWNERS 涵蓋 `tests/`；已設定刪除測試檢查；審核是否真的強制、本機防護皆未知；搜尋範圍內沒找到本機禁止規則」 | 不誤導，保留事實，也不預先決定 L-D2 | 沒有一句話的結論；正式檢查仍需九項欄位與另行核准 |
| P-D 拆成幾個能力 | 依防護邊界拆成「本機防寫」「變更審核」「CI 測試完整性」等獨立能力，各自另行決定是否適用、必要或建議 | 「審核規則已設定」「刪除檢查已設定」可為 verified，但只表示設定存在；審核是否生效為 unknown；本機防寫只有在搜尋範圍完整時才算 missing | 比單一標題更容易採取行動 | 固定分類可能不符專案實際威脅，增加 catalog 負擔；容易被誤讀成「已設定＝有效」 |

Codex 建議 P-C；如果之後反覆出現穩定、具體的保護問題，再逐步演進到 P-D。Copilot 同意。

#### I：長期目標一段時間沒有新工作

比較用的例子：repo 設定每小時執行一次的 agent，看不到漏跑告警或憑證處理；實際執行紀錄與外部憑證系統看不到。

| 選項 | v1 的改變 | 例子會怎麼報告 | 好處 | 風險 |
|---|---|---|---|---|
| I-A 只留在研究文件 | 不新增 catalog 項目、報告欄位、detector 或共同語意 | 不新增報告內容；既有觸發檢查仍可列出每小時排程 | v1 最精簡 | 工具不會提醒長期流程可能靜默失敗；概念可能被遺忘 |
| I-B 加入共同語意詞彙 | 在 12.5 的共同語意加入選用、非完整的詞彙：目標生命週期、事件來源健康、授權狀態、定期義務狀態分開描述。不新增檢查、detector 或必填欄位 | 同 I-A，不新增檢查；說明文字最多指出執行與來源健康「未觀察到」 | 為未來 runtime 保留共同語言，不做新判斷 | 詞彙可能被誤以為已實作監控或完整狀態機；短期對使用者幫助有限 |
| I-C 新增 v1 條件式檢查 | 新增候選檢查（九項欄位齊全），只在確認有長期或排程工作時適用；問專案如何察覺「該發生卻沒發生」的工作與觸發失敗。頻率、告警、憑證過期各自只在相關時才問 | 適用性未確認時為 unknown，並詢問對漏跑的期待；監控若在外部，要求提供證據而不是判為缺少 | 對長期流程有實際提醒 | 擴大 v1 的 catalog、detector 與測試範圍；只憑偵測到排程就推論適用會造成誤報 |

Codex 不把「所有長期目標都必須有 heartbeat」列為選項：它把單一機制強加給不需要固定頻率的情況，等於新增強制政策，而且有 heartbeat 設定也不代表服務健康。

Codex 建議 I-B；希望 v1 更精簡時，I-A 也合理。只有使用者明確要 v1 檢查這件事，並同意擴大 catalog 範圍時才選 I-C。Copilot 同意 I-B。
