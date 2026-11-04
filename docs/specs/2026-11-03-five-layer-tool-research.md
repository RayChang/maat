# 五層 Agent 工程工具：研究報告

**狀態：** 研究與決策紀錄。41 題 catalog 0.1.0 已於 2026-11-04 核准凍結；R-D3 修訂 D7 的 v1 改善範圍。已被取代的提案章節（報告欄位草案、修補流程、init 步驟、成長觸發、與舊設計的衝突對照、初稿審查紀錄）於 2026-11-04 移除
**日期：** 2026-11-03
**前置文件：**
[五層檢查表檢視](./2026-11-03-five-layer-checklist-review.md)（舊設計 spec 與舊實作計畫已於 2026-11-04 移除）
**後續文件：** [Loop 運作方式研究](./2026-11-03-loop-control-research.md)
**正式實作依據：** [五層工具正式 spec](./2026-11-03-five-layer-tool-spec.md)、
[新版實作計畫](../plans/2026-11-03-five-layer-tool-implementation.md)

本文保留研究過程與範例；實作範圍以新版正式 spec 為準。D9 已收斂為三家 CLI 優先，研究中提到的 IDE、雲端與 SDK 能力不等於 v1 支援承諾。

**2026-11-04 更新：** [運作架構與契約](./2026-11-04-toolkit-operation-architecture.md)拆分診斷／改善 Skill。使用者已選定 v1 改善 Skill 經核准可修改，scripts／測試另依授權；診斷 CLI 保持唯讀。本文原先「v1 只到計畫」與「CLI 決定修補流程」的章節已移除。R-D5 已核准機械控制 A：工具內程式化狀態機／守門／紀錄，host 執行核准動作，未啟用完整 runner。

## 1. 意圖整理

使用者的痛點：不確定專案目前缺少哪些 Agent 開發需要的規範、內容與驗證機制。

| 編號 | 需求 | 說明 |
|---|---|---|
| R1 | 檢查現況 | 對專案目前狀態做檢查 |
| R2 | 找出缺口 | 列出缺少的項目與可改善的範圍 |
| R3 | 報告可交給 agent | 報告能讓 agent 直接據以修改 |
| R4 | 漸進擴充 | 例如「目前做到第 3 層，要做到第 4 層需要哪些調整」 |
| R5 | 起步陪伴 | 專案剛開始時就能使用，並隨專案成長 |
| R6 | 整合 gist | 把 [doggy8088 的 AI Coding Agent Guidelines](https://gist.github.com/doggy8088/736457fa63e0aaeb152a0b2d30b73d82) 納入工具 |

## 2. 結論摘要

1. **已有同類工具，但沒有一個以五層為軸。**
   - Factory、Kodus、agentready 檢查的是一般工程體質（lint、測試、文件、CI）。
   - 五層檢查的是 agent 專屬的關注點。
   - 兩者互補，見第 3 節。
2. **R4 可以做到，但不建議用「勾滿內層才能往外」或「80% 晉級」。**
   - 建議改用四個概念：
     - 每題的「作法形式」與「證據等級」
     - 層與層之間的必要條件，寫成可判定的能力判斷式
     - 適用性
     - 逐層狀態（adopted、ready、blocked、不適用），不用單一數字
   - 這樣就能回答「第 3 層到第 4 層缺什麼」，又不必宣稱五層是驗證過的成熟度階梯。見第 4 節。
3. **gist 不適合整份放進 AGENTS.md。**
   - 它有 645 行，超過 Anthropic 建議的 200 行，也符合 Context Bloat 與 Skill Leakage 兩種 smell。
   - 建議拆成「規則卡」，每張卡對應一層，並分別提供「寫成文字／做成 skill 或範本／設定強制」三種做法。
   - 工具用規則卡當作檢查項目與修補內容的來源。見第 5 節。
4. **gist 可以直接使用。**
   - gist 本身沒有授權聲明。
   - 使用者確認可以直接使用：保哥在自己的課程中分享給學員（D4）。
   - 規則卡可沿用 gist 原文或精簡改寫，並標示出處段落。
5. **靜態掃描只能回答一小部分問題。**
   - 上一份檢視中，27 題只有約 7 題有 v1 靜態訊號。
   - 工具必須能記錄「使用者或 agent 確認過、附證據」的答案，並與機器觀察到的結果分開。
   - 專案需要一份會 commit 的政策檔，記錄適用性、目標與豁免；掃描結果則不寫回 repo。這是「陪伴成長」的基礎。見第 7 節與 8.1。
6. **報告要給 agent 用，每個缺口都要附上四樣東西：**
   - 要動哪些檔案
   - 採用哪張規則卡
   - 修完怎麼驗收（重跑哪個 check）
   - 是否需要人核准
   - 先例：Factory `/readiness-fix`、napetrov/agentready 的 MCP server、SARIF `fix` 物件。欄位定義以正式 spec 6.1 與 catalog 第 8 節為準。
   - CLI 唯讀不代表改善 Skill 沒有寫檔風險。R-D3 已開放 v1 核准後由既有 agent 修改；命令另依授權，保留計畫預覽、範圍、復原與重新驗收，而且不能在同一次修改中放寬測試或檢查來宣稱修好。
7. **既有設計 spec 已被正式 spec 取代（D10）。** 舊設計文件與衝突對照已於 2026-11-04 移除。v1 唯讀與「不是成熟度階梯」仍保留，但要補上修補計畫、逐層狀態與整合題庫，不再只限六個檔案存在檢查。
8. **本文初稿經過一次獨立審查，修正了 10 處設計問題。** 修正已全部反映在本文，審查紀錄已於 2026-11-04 移除。
9. **Loop 的控制方式另有研究。** 結論是流程由程式控制，內容由模型產生，驗證放在執行任務的 agent 之外。Loop 層的題目會依此改寫，見 [Loop 運作方式研究](./2026-11-03-loop-control-research.md)。

## 3. 既有工具調查

以下資料由研究子代理收集。標「已核對」的項目，我已親自對照原始來源。

| 工具 | 檢查範圍 | 分級方式 | 修補 | 起步／漸進 | 形態與授權 | 核對 |
|---|---|---|---|---|---|---|
| [Factory Agent Readiness](https://docs.factory.ai/agent-readiness/overview) | 9 個技術支柱 | 5 級：Functional → Documented → Standardized → Optimized → Autonomous；前一級通過 80% 才解鎖下一級 | `/readiness-fix` 讓 agent 直接修 | 以逐級晉升為核心 | 商用（Droid CLI、儀表板、API） | 已核對 |
| [Kodus agent-readiness](https://github.com/kodustech/agent-readiness) | 39 項、7 個支柱 | 5 級；某級通過 80% 才能往上 | 只有文字建議 | `--ci --min-level N` | CLI、儀表板；MIT；最後更新 2026-10-30 | 已核對 |
| [ambient-code/agentready](https://github.com/ambient-code/agentready) | 25 個屬性，附研究出處 | 4 個 tier 加權（55/27/14/4%），白金到銅牌 | 文字建議 | 可排除不適用的屬性 | Python CLI、容器；MIT | 已核對 |
| [napetrov/agentready](https://github.com/napetrov/agentready) | 指令檔、驗證指令、agent 能力面（MCP、skills、hooks）、安全訊號、context 效率 | 實驗性 0–100 分加分維度彙總；policy packs | `explain`；選用的 LLM `analyze` 不改動確定性分數；MCP server 讓宿主 agent 用自己的模型 | `init --agents` 產生 AGENTS.md；`diff` 只擋新的退步 | Node CLI、GitHub Action、SARIF；MIT；1 星、尚未發布 | 已核對 |
| [agent-sh/agnix](https://github.com/agent-sh/agnix) | CLAUDE.md、AGENTS.md、SKILL.md、hooks、MCP 的 linter | 逐條規則 | 有 autofix | 無分級 | CLI、LSP；Apache-2.0；467 星 | 已核對（repo 描述） |
| [OpenSSF Scorecard](https://github.com/ossf/scorecard) | 開源專案供應鏈安全 | probes → checks → conformance | 每個 check 附 remediation 文字 | 對應 OSPS Baseline 的 Level 1–3 | Apache-2.0 | 已核對 COVERED／PARTIAL／GAP／NOT_OBSERVABLE 四種狀態 |

**值得借用的做法：**

- **證據與評分分開：**
  - napetrov 分成 detector → check → score 三段，OpenSSF 分成 probe → check → conformance 三段。
  - 好處是換評分政策時不必重新掃描。
- **無法觀察的項目獨立成一種狀態：** 兩個不相關的專案都各自設計了這種狀態，與設計 spec 的 `unknown` 一致。
- **LLM 判斷不能改動確定性結果：** napetrov 的 `analyze` 把 LLM 的判斷另外列出，不改動確定性分數。
- **重複評估要以前一次為基準：**
  - Factory 宣稱以前一次報告為基準重新評估後，分數波動從平均約 7% 降到 0.6%。
  - 這個數字由子代理轉述，我沒有親自核對。
- **CI 擋退步，而不是擋門檻：** napetrov 的 `diff` 只擋新出現的退步，適合漸進導入。

**空白處：**

- 沒有工具以 Prompt／Context／Harness／Loop／Graph 為軸。
- 沒有工具把同一條規範依「文字 → 可重用 → 強制」分級。
- 沒有工具在報告中附上可直接套用的 SARIF `fix` 內容。這一點由子代理推論，未逐一確認。

**Factory 的支柱與五層的關係：** Factory 的 9 個支柱是：

- Style & Validation
- Build System
- Testing
- Documentation
- Development Environment
- Debugging & Observability
- Security
- Task Discovery
- Product & Experimentation

這些多屬一般工程體質。五層中的 Harness 依賴這些基礎，例如沒有測試就無法自動驗證。這帶出 D3：工程基礎要放在哪裡。

## 4. 漸進模型：怎麼回答「第 3 層到第 4 層」

### 4.1 現有分級框架的軸各不相同

| 框架 | 分級的軸 | 能否直接拿來用 |
|---|---|---|
| Factory、Kodus | repo 的工程屬性，前一級 80% 才晉級 | 晉級門檻是產品政策，沒有成效驗證 |
| ambient-code | 加權總分與徽章 | 沒有順序，只有總分 |
| Dan Shapiro 的 Five Levels（2026-01） | 開發者的角色 | 描述人，不是描述 repo（子代理轉述） |
| Steve Yegge 的 8 stages | 同時管理幾個 agent | 描述工作方式（子代理轉述） |
| Feng et al.，[arXiv:2506.12469](https://arxiv.org/abs/2506.12469) | 使用者角色（operator → observer），明確與 agent 能力分開 | 可以用來描述高風險操作要不要人核准（已核對摘要） |
| OWASP SAMM | 每個實務各自設定目標等級，不要求全部拉到最高 | 支持「每層各自進展」（子代理轉述） |
| DORA | 能力加成果，刻意不做成熟度階梯 | 警示：把指標當排名會誘導人去鑽門檻（子代理轉述） |

**結論：**

- 「專案在第幾層」必須明確說是哪一種軸。
- 這個工具的軸應該是「repo 為 agent 準備了什麼，以及有多硬」，而不是團隊的自主程度。

### 4.2 建議：每題記錄「作法形式」與「證據等級」兩個屬性

同一條規範可以做得很軟，也可以做得很硬。gist 幾乎全部停在「寫成文字」。

初稿曾用單一的 S0–S4 強度表示這件事。初稿審查指出，這把三個不同的軸混在一起：

- 檔案形式
- 是否強制
- 是否有回饋

結果同一個控制可能同時落在好幾級。因此改成兩個屬性；回饋則移到 Loop 層，成為獨立的題目。

**作法形式：** 規範用什麼形式存在。一題可以同時有多種形式。

| 形式 | 例子：「完成前要驗證」 |
|---|---|
| 無 | — |
| 文字 | AGENTS.md 寫了測試指令與「完成前要跑」 |
| 可重用 | 驗證 skill、PR 範本的 DoD 清單、驗證腳本 |
| 設定 | Stop／agentStop hook 自動跑測試、CI 測試步驟、權限規則、lint 規則 |

**證據等級：** 工具對這件事知道多少。

| 證據等級 | 意義 | 對應設計 spec 的證據強度 |
|---|---|---|
| 看到檔案 | 靜態看到文字或範本 | artifact presence |
| 已設定，未確認生效 | 看到 hook、CI、權限設定，但無法確認它會執行或不能被繞過 | artifact presence（設定類） |
| 已確認生效 | 有執行期或遠端證據，例如 CI 執行紀錄、使用者附依據的確認 | operational enforcement |
| 無法觀察 | 例如 branch protection、雲端 session 是否套用設定 | `unknown` |

**規則：**

- 每張規則卡自己定義「目標形式」與「目標證據等級」。例如「輸出格式有約定」到「可重用」就夠。
- 不同題目之間不比較形式的高低。PR 範本不一定比一行指令更有效。
- 「從結果改進」（記錄錯誤、轉成規則或測試）屬於 Loop 層的 hill-climbing 題目，不再是強度的最高級。

### 4.3 建議：層與層之間用「前置條件」，不用百分比

外層需要內層提供特定能力，但不需要內層全部勾滿。例如：

- 沒有驗證器，Loop 只會反覆產出垃圾（Shirley 的說法）。
- 但 Loop 不需要 Context 的每一題都做到。

前置條件寫成具體的能力判斷式，每個判斷式由有版本號的 detector 判定，不寫成「某題達某級」。

| 要採用的層 | 必要條件（草案） | 建議條件（草案） | 理由 |
|---|---|---|---|
| Prompt | 無 | — | 最基礎 |
| Context | 無；與 Prompt 可並行 | — | — |
| Harness | `commands.verify-documented`：至少有一個可執行的驗證指令寫明（test、lint、typecheck、build 任一即可） | — | hook 和 CI 需要知道跑什麼；不要求每種都有 |
| Loop | `verifier.configured`：驗證能自動執行（hook 或 CI 已設定）<br>`recovery.available`：出錯可復原（版本控制加隔離的分支或 worktree） | `verifier.confirmed`：已確認生效 | 迴圈每一圈都靠驗證決定下一步 |
| Graph | 適用性回答「是」<br>`loop.stop-condition-defined`<br>`loop.verify-each-iteration` | 交接格式有定義 | Graph 是選配 |

**規則：**

- 必要條件只能由「看到檔案」以上的證據滿足。agent 的判斷不能單獨滿足必要條件（見第 7 節）。
- 每個條件都可以標示不適用，但要附理由與有效期限（見 8.1）。
- catalog 檢查時要拒絕循環相依。

### 4.4 報告呈現：逐層狀態，不用單一數字

審查指出：Prompt 與 Context 可以並行，Graph 又是選配，只顯示「第 N 層」仍會讓人以為這是線性階梯，也會誘導人去追數字。因此報告逐層顯示狀態：

| 狀態 | 意義 |
|---|---|
| `adopted` | 必要條件成立，而且該層的基本項達到目標 |
| `ready` | 必要條件成立，基本項還沒做完，可以開始 |
| `blocked` | 必要條件還沒成立 |
| `not_applicable` | 已回答不適用，附理由 |
| `in_use_unsupported` | 已經在用（例如有 subagent 定義），但必要條件沒成立；這是風險 |

「第 3 層到第 4 層缺什麼」直接回答成 Loop 的 `blocked` 或 `ready` 清單。如果一定要一個數字，只能是「從 Prompt 起連續 `adopted` 的最高層」，而且 Graph 要另外列出。

**報告呈現方式（示意）：**

```text
Prompt   adopted
Context  adopted
Harness  adopted
Loop     blocked，還差 1 個必要條件、2 個基本項
  - [必要] verifier.configured：只有文字，沒有 hook 或 CI
           → 建議：加 Stop hook 跑 npm test（需要核准）
  - [基本] L1 目標有可測試的停止條件：無
  - [基本] L3 重試與花費有上限：無
Graph    not_applicable（理由：單一 agent，循序工作；2027-05-03 到期重新確認）
風險     .claude/agents/ 有 3 個 subagent，但 Loop 的必要條件未成立 → in_use_unsupported
```

**這個設計的特點：**

- 回答了使用者「第 3 層 → 第 4 層」的問題，但不把五層當成線性階梯。
- 也保留了原 artifact「內層沒做好，外層救不回來」的直覺，但改成具體的相依關係。
- 能偵測「外層已經在用，內層卻沒到位」這種高風險狀態。
- 必要條件與基本項都屬於工具政策，不是研究結論。報告要標明這一點。

## 5. gist 分析與整合

### 5.1 來源與授權

| 項目 | 內容 | 核對 |
|---|---|---|
| 檔案 | `AGENTS.md`，645 行，25,697 bytes | 已核對 |
| 版本 | 兩個版本：2026-06-29 建立；2026-07-03 只改一行，把任務命名範例中的俄文改成英文 | 已核對（GitHub API 與 diff） |
| 授權 | 內文沒有授權聲明；使用者確認可直接使用，因為是保哥在課程中分享給學員 | 授權聲明已核對；使用依據由使用者告知（2026-11-03） |
| 基底 | 前半段的 Workflow Orchestration 1–6、Task Management、`tasks/todo.md`、`tasks/lessons.md` 與一份廣泛流傳的 CLAUDE.md 相同 | 已核對基底內容（[makstheimba 的轉載](https://github.com/makstheimba/claude-md-boris-cherny-mar-5-2026)） |
| 基底作者 | 常被歸給 Boris Cherny（Claude Code 作者）2026-01-02 的 X 貼文 | 子代理轉述，X 原文我未核對 |
| 保哥新增的部分 | Operating Principles、Incremental Delivery、每段的「Additions (Recommended)」、Engineering Best Practices、Git Hygiene、DoD、範本，以及六個「New Section」 | 依內容比對推論 |

### 5.2 證據告訴我們什麼

| 來源 | 發現 | 對 gist 的意義 | 核對 |
|---|---|---|---|
| Gloaguen et al.，[arXiv:2602.11988](https://arxiv.org/abs/2602.11988) v3 | context 檔一般不會提高成功率，成本平均增加超過 20%；指令會被遵守；repository overview 沒有幫助；對非標準做法有用 | 通用原則多半是模型本來就會的事，只會增加成本 | 已核對（前一份 spec） |
| Dos Santos et al.，[arXiv:2606.15828](https://arxiv.org/abs/2606.15828) v5 | 六種 smell：Lint Leakage 62%、Context Bloat 42%、Skill Leakage 35%、Conflicting Instructions、Init Fossilization、Blind References | 整份放入會同時符合 Bloat 與 Skill Leakage；Engineering Best Practices 的部分屬於 Lint Leakage | 已核對摘要 |
| [Anthropic memory 文件](https://code.claude.com/docs/en/memory) | 每份 CLAUDE.md 目標 200 行以下；只與部分程式碼有關的規則放 path-scoped rules；「context, not enforced configuration」，要擋就用 PreToolUse hook | 硬規則應該改成 hook | 已核對 |
| IFScale，[arXiv:2507.11538](https://arxiv.org/abs/2507.11538) | 500 條指令時，最好的模型準確率只有 68%，且偏向前面的指令 | 指令越多越不可靠 | 已核對摘要 |
| Agent READMEs，[arXiv:2511.12884](https://arxiv.org/abs/2511.12884) | 2,303 份 context 檔中，安全只有 14.8%、效能 14.5% 有寫 | gist 的 Security 與 High-Risk 段落正好補這個缺口，值得保留 | 已核對摘要 |

### 5.3 整合方式：拆成規則卡

gist 的每個概念拆成一張卡。工具在兩個地方使用規則卡：

1. **當作檢查項目的來源。** 例如「完成前要驗證」成為 H5 與 L1 的檢查依據。
2. **當作修補內容。** 找到缺口時，依目標形式給出該寫的文字、該建的 skill 或範本、該加的 hook 或 CI 設定。

**卡片內容可以直接沿用 gist。** `derived_from` 記錄來自哪一段；文字可沿用原文，或依 vendor 文件與研究精簡改寫（見 5.5、D4）。

**判定方式：**

- 卡片不寫自然語言的「怎麼偵測」，而是引用有版本號的 detector ID。
- 每個 detector 回傳結構化的判斷式結果，附證據位置。
- 原因：自然語言的判定讓 agent 只要「寫出那串字」就能過關。結構化 detector 可以要求內容，例如 hook 真的引用了測試指令、CI 步驟沒有 `continue-on-error`。
- 設定類的判定最多只到「已設定，未確認生效」。要到「已確認生效」，需要 CI 執行紀錄或附依據的人工確認。

規則卡示意（欄位草案）：

```yaml
id: verify-before-done
version: 1
derived_from: "doggy8088 gist: Workflow Orchestration › Verification Before Done"
layers: { primary: harness, secondary: [loop] }
target: { form: config, evidence: configured }
forms:
  text: "AGENTS.md：完成前執行 `{test_command}`，回報指令與結果"
  reusable: "skill: verification-tiers"
  config:
    claude_code: "Stop hook 執行 {test_command}"
    github_copilot: ".github/hooks/*.json 的 agentStop"
    ci: "workflow 測試步驟；required check 屬於遠端設定，本機無法觀察"
detectors:
  - id: instructions.test-command@1      # 指令檔寫了可執行的測試指令
  - id: hooks.runs-command@1             # hook 引用 {test_command}
  - id: ci.step-runs-command@1           # CI 步驟執行 {test_command}，且未設 continue-on-error
provides: [verifier.configured]          # 滿足 Loop 的必要條件
verify_fix: { rerun: [hooks.runs-command@1, ci.step-runs-command@1], expect: configured }
basis: [vendor-doc, research, tool-policy]
```

### 5.4 gist 各段落對應

以下依 gist 段落順序列出：

| gist 段落 | 主層 | 建議形式 |
|---|---|---|
| Operating Principles、AI Hallucination Mitigation | Prompt／Context | 濃縮成核心 5–10 行 |
| Plan Mode Default（含 checkpoint A–D、風險分級） | Prompt（任務規格） | skill 加計畫範本 |
| Subagent Strategy | Graph | agent 定義檔（角色加結構化產出） |
| Incremental Delivery | Loop | 核心 1 行 |
| Self-Improvement Loop（`tasks/lessons.md`、tripwire） | Loop（hill-climbing）加 Context（記憶） | 範本加核心指引；Loop 層「從結果改進」題目的主要來源 |
| Verification Before Done | Harness 加 Loop | 核心指引加強制設定 |
| Demand Elegance | Prompt | 刪除或 1 行（模型本來就會） |
| Autonomous Bug Fixing、Error Handling | Loop | skill |
| Task Management（`tasks/todo.md`） | Loop（狀態紀錄） | 範本 |
| Communication Guidelines | Prompt（輸出格式） | 濃縮成核心 |
| Context Management | Context | 濃縮成核心 |
| Engineering Best Practices（型別、相依、安全…） | Harness | 優先改成強制設定（lint、型別檢查、secret scanning），文字其次 |
| Git and Change Hygiene | Harness | commit-msg hook 或 commitlint |
| Definition of Done、Review Checklist | Loop（停止條件） | PR 範本 |
| Repository Discovery Playbook | Context | skill |
| High-Risk Change Protocol | Harness 加 Graph（人的核准點） | CODEOWNERS 加 agent deny 規則加 skill |
| Data Migration、Concurrency | Harness／Loop | 有條件啟用的 skill |

### 5.5 需要調整或決定的 gist 內容

- **`tasks/todo.md` 與 `tasks/lessons.md`：**
  - 各家 agent 已有內建的計畫與記憶機制。
  - Lulla et al. 發現迴圈專案幾乎都不 commit 狀態檔。
  - 工具要讓專案選擇：沿用 gist 的檔案、改用 vendor 機制、commit 或 ignore（D5）。
- **「Autonomous Bug Fixing：不要把除錯丟給使用者」vs「High-Risk Protocol：要明確回滾與核准」：**
  - 兩者需要依風險區分自主程度。
  - 可借用 Feng et al. 的 approver 角色：高風險路徑要人核准。
- **「Plan Mode」是部分 vendor 的功能名稱。** 規則卡要寫成中立的說法。
- **授權：**
  - 使用者確認可以直接使用，依據是保哥在自己的課程中分享給學員（D4）。
  - 規則卡保留 `derived_from` 出處。
  - 精簡的理由是 5.2 的 context 成本，不是授權。
  - 若工具日後公開發布，建議保留作者同意的紀錄。

## 6. 各 agent 的可偵測設定面

以下是工具在 repo 內可以讀到的設定，以及讀到也無法確認的部分。依 D9，優先支援的是三家的 CLI，不是各家所有產品介面；每個 adapter 必須分開記錄 CLI 版本與設定面的支援範圍。

| Agent | 可讀的設定 | 檔案存在仍無法確認的事 | 核對 |
|---|---|---|---|
| Claude Code CLI | `CLAUDE.md`、`.claude/rules/`、`.claude/settings.json`（permissions、hooks）、`.claude/agents/`、`.claude/skills/`、`.mcp.json`；v2.1.277 起預設在沒有 CLAUDE.md 時讀 `AGENTS.md` | 使用者可能改變指令載入設定；本機掃描不能證明目前 session 已載入 hook 或權限規則 | 已核對 settings 與 memory 文件 |
| OpenAI Codex CLI | `AGENTS.md`（分層）、`.codex/config.toml`（sandbox、approval、`[hooks]`、rules）、`hooks.json`、`.agents/skills/` | 只有 trusted 專案才載入專案層 `.codex/`；組織的 `requirements.toml` 可能覆寫設定 | 已核對 config-basic 與 hooks 文件 |
| GitHub Copilot CLI | `.github/copilot-instructions.md`、`.github/instructions/**`、`AGENTS.md`、`.github/agents/*.agent.md`；hooks 來自 `.github/hooks/*.json`、`.github/copilot/settings.json` 的 `hooks`，以及 repo 的 `.claude/settings.json` | workspace trust、使用者與組織設定、CLI 版本可能影響載入；不得沿用 IDE 或雲端 agent 的支援假設 | 已核對 hooks 文件；另透過 Context7 核對 CLI 官方 changelog 與設定文件 |
| 通用 | CI workflow、CODEOWNERS、PR／issue 範本、lint、型別、formatter 設定、lockfile | branch protection 與 required checks 屬於遠端設定 | — |

**結論：** 設定類的作法在本機只能確認「已設定」，不能確認「有生效」。報告要分成「已設定，未確認生效」與「已確認生效」兩種證據等級（見 4.2）。

## 7. 判斷型題目與人工確認

- 「停止條件是否可測試」「索引是否指向細節」這類題目無法靠靜態掃描判斷。
- **agent 判斷：**
  - 必須附上引文，標記為 `assessed_by_agent`。
  - 只能產生「候選」或「未知，附意見」，不能單獨滿足任何必要條件，也不改動 `static` 的結果（借用 napetrov 的做法）。
- **使用者確認**（`attested_by_user`）必須記錄：
  - 範圍：確認的是哪一題、哪些路徑
  - 證據指紋：依據的檔案內容雜湊
  - catalog 與規則卡的版本
  - 確認的人
  - 有效期限
- 依據的檔案改變、catalog 改版或到期時，確認自動失效，回到「待確認」。

## 8. 起步陪伴與成長

### 8.1 profile：政策與結果分開

**commit 進 repo 的政策檔**（名稱待定，有 schema 版本號）：

- 適用性回答與理由，例如 Graph 不適用
- 各題的目標形式與目標證據等級（覆寫 catalog 的預設）
- 不適用與豁免：每筆都要有理由、負責人、有效期限、證據指紋
- 人工確認紀錄（欄位見第 7 節）

**不 commit 的結果：**

- 每次的掃描報告與趨勢紀錄放 CI artifact 或本機快取。
- 原因：寫回 repo 會產生大量雜訊 commit；結果也能從政策檔加上 repo 狀態重新算出來。

沒有政策檔，每次掃描都得重問，也無法區分「沒做」與「刻意不做」。

### 8.2 vendor adapter：各 CLI 讀取 AGENTS.md 的方式

寫檔式 init 的起步提案已於 2026-11-04 移除：CLI 寫檔式 init 未獲核准，改善 Skill 依 R-D3 經核准後修改。以下 adapter 表是 catalog 8.5 引用的來源。

不能假設每家的入口檔都能「指向 AGENTS.md」。每個 adapter 要宣告自己的接法，並記錄核對日期：

| Agent | 讀 AGENTS.md 的方式 | 接上 AGENTS.md 的作法 | 核對 |
|---|---|---|---|
| OpenAI Codex | 原生讀取；從根目錄往下串接，近的覆蓋遠的；可用 `AGENTS.override.md` 取代；合計超過 `project_doc_max_bytes`（預設 32 KiB）就不再加入後面的檔案 | 不需要額外檔案；檢查合計大小 | 已核對 Codex AGENTS.md 文件 |
| GitHub Copilot | 原生讀取，最近的 AGENTS.md 優先；也讀 `.github/copilot-instructions.md` | 不需要額外檔案；兩者都存在時，檢查內容是否衝突 | 已核對 custom instructions 文件 |
| Claude Code | v2.1.277 起，預設只在沒有 `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md` 時讀 AGENTS.md；舊版或某些 session 只讀 CLAUDE.md | 已有 CLAUDE.md：在其中用 `@AGENTS.md` 匯入。沒有 CLAUDE.md：可不建，但要提醒舊版與 CLAUDE.local.md 會讓 AGENTS.md 不被讀取 | 已核對 memory 文件 |
| 其他 | 依各 vendor 文件 | 標為 `unsupported` 或 `generated projection`（由 AGENTS.md 產生副本，需同步機制） | — |

## 9. 工具形態選項

| 選項 | 說明 | 優點 | 缺點 |
|---|---|---|---|
| A. 只有 CLI | 確定性掃描、報告、`init` | 可重現，可放進 CI | 判斷型題目無法回答，修補要另外做 |
| B. 只有 agent skill | agent 讀 checklist 自己評估 | 彈性大，所有 agent 都能用 | 結果會飄，無法放進 CI |
| C. CLI 加兩種 Skill（已採用，R-D2／R-D3／R-D5 修訂） | CLI 唯讀觀察與評估，A 核心控制工具內流程；診斷 Skill 協助內容審核，改善 Skill 經核准修改並另依授權驗證 | 確定性觀察與內容改善分工，與既有 Python 計畫相容 | 要維護兩種 Skill、資源、控制核心與交接 |
| D. C 加 MCP server 加 HTML 介面 | 原 artifact 變成同一份 catalog 的視覺介面 | 完整 | 範圍大，適合後期 |

## 10. 風險與限制

- **成效未經驗證。**
  - 沒有任何現有工具的分級經過任務成效驗證。
  - Gloaguen et al. 甚至發現 context 檔一般不會提高成功率。
  - 工具不能暗示「文件越多越好」，應優先推動驗證與強制機制。
- **門檻會被鑽。**
  - DORA 的教訓是，指標一旦變成門檻，人就會去鑽門檻。
  - 不顯示總分、改用逐層狀態，可以降低這個風險。
  - detector 要檢查內容而不只是字串，修補時禁止放寬驗證。
- **agent 判斷不穩定。** 必須附引文，只能當候選，且以前一次報告為基準。
- **vendor 設定變動快。**
  - 例如 Copilot hooks 的事件、Codex 的 trusted 規則、Claude Code 從 v2.1.277 才原生讀 AGENTS.md。
  - adapter 需要版本號與核對日期。
- **授權。** gist 沒有授權聲明；使用者確認可直接使用（見 5.5）。若工具公開發布，建議保留作者同意的紀錄。

## 11. 決定紀錄

D1–D7 延續前次決定。先前將 D8、D9 一併標成已採用，未在對話完整說明；經補充說明後，使用者於 2026-11-03 明確確認 D8–D10 與 D11 的九項必要資訊。D11 不代表每張規則卡、通過條件或 v1 題數都已確認；Loop 的 L-D1–L-D6 修正版已於稍後（2026-11-03）由使用者核准，見 Loop 研究第 12 節。

| 編號 | 問題 | 選項 | 決定 | 狀態 |
|---|---|---|---|---|
| D1 | 漸進模型 | 作法形式與證據等級加必要條件（第 4 節）／Factory 式 80% 階梯／只做自評 | 作法形式與證據等級加必要條件 | 已採用 |
| D2 | 報告怎麼呈現「做到哪」 | 逐層狀態（adopted、ready、blocked、不適用）／另外顯示「從 Prompt 起連續 adopted 的最高層」數字 | 只顯示逐層狀態；若要數字，Graph 另列 | 已採用 |
| D3 | 工程基礎（測試、lint、CI、文件）放在哪裡 | 第 0 層「基礎」／放進 Harness 必要條件／不管 | 第 0 層「基礎」，不計入五層 | 已採用 |
| D4 | gist 授權 | 聯絡保哥取得授權／clean-room／直接使用 | 直接使用並標示出處；依據是保哥在課程中分享給學員 | 使用者決定 |
| D5 | `tasks/todo.md`、`tasks/lessons.md` | 沿用／改用 vendor 機制／讓專案選；commit 或 ignore | 讓專案選，預設 lessons commit、todo ignore | 已採用 |
| D6 | 工具形態 | 第 9 節 A–D | C：CLI 加 agent skill；2026-11-04 依 R-D2 拆成診斷／改善兩種 | 已採用並修訂 |
| D7（原決定） | 修補由誰寫檔、何時開放 | v1 只產生計畫／v1 就讓 agent 依計畫改檔 | 原為只產生報告與計畫；2026-11-04 依 R-D3 開放核准後改善，命令執行另依授權 | 原改善時程被 R-D3 取代；CLI 唯讀保留 |
| D8 | 判斷型題目由誰答 | 使用者問卷／agent 判斷附引文／兩者 | 兩者並用，結果分開標示；agent 判斷不能覆寫機器觀察 | 明確確認 |
| D9 | 先支援哪些 agent | Claude Code、Codex、Copilot 的 CLI／IDE／雲端等介面 | 優先支援 Claude Code CLI、OpenAI Codex CLI、GitHub Copilot CLI；其他介面不自動納入 | 明確確認 |
| D10 | 文件處理 | 改版既有設計 spec／另寫新 spec；中文或英文 | 另寫整合後的正式 spec，繁體中文為主、保留英文技術名詞；研究文件保留，舊設計標為被取代，實作計畫同步更新 | 明確確認 |
| D11 | catalog 來源整合 | 27 題、檢視提案、gist 規則卡、工程基礎項怎麼合併 | 每項至少有唯一 ID、所屬層、適用條件、檢查方式、證據要求、前置條件、改善方法、驗收方式與來源；去重並保留來源對應 | [Catalog 0.1.0](./2026-11-03-five-layer-catalog.md)已補齊全部 41 題與來源；U-1–U-4、B1–B6、分級與契約均於 2026-11-04 核准並凍結 |

## 12. 來源核對狀態

**本次已親自核對：**

- gist 原文、GitHub API 版本紀錄與兩版 diff
- makstheimba 轉載的 CLAUDE.md 內容
- arXiv 2606.15828、2507.11538、2511.12884、2506.12469 的摘要與日期
- Anthropic memory 文件（200 行、context not enforced、PreToolUse hook、v2.1.277 起讀 AGENTS.md 的條件）
- Codex config-basic（`.codex/config.toml`、trusted 專案、hooks、rules）
- Codex AGENTS.md 文件（串接順序、`AGENTS.override.md`、`project_doc_max_bytes` 預設 32 KiB）
- Copilot hooks 文件（`.github/hooks/*.json`、事件、雲端 agent 限制）
- Copilot custom instructions 文件（AGENTS.md 最近的優先）
- Factory overview（5 級名稱、前一級 80%、9 個支柱、`/readiness-fix`）
- Kodus README（39 項、7 個支柱、80%、`--min-level`）
- napetrov/agentready README（`init`、`diff`、`explain`、`analyze`、MCP、SARIF、policy packs）
- ambient-code README（4 個 tier 的權重、徽章）
- agnix repo 描述
- OpenSSF OSPS Baseline coverage 的四種狀態

**由子代理轉述，未親自核對：**

- Boris Cherny 的 X 貼文
- Chroma Context Rot
- Dan Shapiro、Steve Yegge 的分級
- OWASP SAMM、DORA 的批評
- SARIF `fix` 物件的章節號
- Factory 分數波動的數字

**有出入並已修正：** 子代理說 Factory 有 8 個支柱、門檻是「本級 80% 加上所有前級」。官方文件目前寫的是 9 個支柱、「前一級 80% 解鎖下一級」。
