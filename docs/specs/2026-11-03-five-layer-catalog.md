# 五層 Agent 工程工具：Catalog 0.1.0

**日期：** 2026-11-03

**狀態：** 標準內容已核准，`catalog_version` 0.1.0 於 2026-11-04 凍結。41 題均具備九項資訊，另附不評分的保護觀察格式。這還不是可執行的 catalog（detector、rule card 與 CLI 介面尚未實作或定版），也不取代[正式 spec](./2026-11-03-five-layer-tool-spec.md)。U-1–U-4 已決定；baseline 選擇標準 B1–B6 已於 2026-11-04 逐題核准（見 3.1）；第 6 節 41 題的分級與適用條件、第 7 節能力登錄與層級條件已於同日審查通過；第 8 節由 Claude 依使用者授權對照 B1–B6 與第 7 節逐題核對，未發現需使用者決定的衝突（見 8.0 審查紀錄）。工程介面仍待定版。

**2026-11-04 範圍修訂：** 依正式 spec 的 R-D3，診斷 CLI／Skill 保持唯讀；v1 改善 Skill 可經明確核准後由既有 agent 修改，命令執行另依授權。[運作架構](./2026-11-04-toolkit-operation-architecture.md)依已核准 R-D5 的 A 實作工具內控制，host 執行核准動作。本修訂不啟用或改寫本文件的逐題門檻。

**語言：** 繁體中文為主，保留英文技術名詞與資料欄位名

**討論方式：** Copilot 撰寫契約，透過 Herdr 與既有 Codex 用英文討論邊界、選擇標準與完整草案（見第 11 節）。

## 1. 文件定位與讀法

這份文件回應 D11：整合後，每個檢查項目至少要有九項資訊——唯一 ID、所屬層、適用條件、檢查方式、證據要求、前置條件、改善方法、驗收方式與來源。

本文的陳述分成三種，閱讀時請分開看待：

| 標示 | 意義 | 可否直接用於實作 |
|---|---|---|
| **約束** | 使用者已核准的決定（D1–D11、L-D1–L-D6、P-C、I-B）或正式 spec 的規定 | 可以 |
| **建議** | Copilot 與 Codex 討論後的共同建議，符合已核准的原則，但不是唯一合規的作法 | 已隨 2026-11-04 的整份審查通過；不逐條另外投票 |
| **待決** | 真正的產品選擇，兩個 agent 不能代替使用者決定 | 不可以；見第 3 節 |

Herdr 的討論紀錄只證明討論過程，不代表使用者已核准；使用者的決定另外引用。

## 2. 整合結論摘要

- **來源全數有去向：**
  - 27 題、檢視提案、gist 各段落與工程基礎來源，都標示了處理方式（保留、改寫、合併、拆分、排除、待決）與用途（見第 5 節）。
- **候選題目共 41 題：**
  - 另有一組「驗證器保護觀察」，以不評分的觀察區塊呈現（U-3 A）；另有 7 項列入待辦清單，不參與評估。
  - 題數是去重後的結果，沒有湊成固定數字。
- **能力登錄表是唯一權威：**
  - 能力（前置條件）只由登錄表依觀察結果判定。
  - 檢查題與規則卡不能自行宣稱「提供」某個能力。
- **前置條件依範圍套用：**
  - 層級的必要條件綁定到具體的工作流程或影響範圍，不因層名就一律套用。
  - 範圍是否適用尚未確定時，條件不能被略過。
- **v1 靜態掃描只說得出它看得到的事：**
  - 關鍵字比對只能當候選線索，不能當作語意或執行的證明。
  - 缺少證據時回報 `unknown`，不判定 `missing`，也不判定不適用。
- **41 題的九項契約均已撰寫（第 8 節）：**
  - 契約完整不等於 baseline 政策已核准，也不代表 detector 已實作。
  - 先前 5 題試行保留並修正，其餘 36 題補齊；每題另列條件式 baseline 提案。

## 3. 使用者決定

以下是 Codex 與 Copilot 都認為必須由使用者決定的事項。使用者已於 2026-11-03 決定：

| 編號 | 決定 | 後續效果 |
|---|---|---|
| U-1 | A：保留所有有理由的題目，報告先顯示摘要 | 不設固定題數，也不設每層題數上限 |
| U-2 | A：一份 catalog，每題寫明計入 baseline 的條件；核准方式為「先核准選擇標準，再一次審查清單」 | 選擇標準 B1–B6 已於 2026-11-04 逐題核准（見 3.1）；第 6、7 節同日審查通過；第 8 節依使用者授權由 Claude 對照標準核對一致；`catalog_version` 0.1.0 同日凍結 |
| U-3 | A：報告中設不評分的保護觀察區塊 | 不建立保護相關的檢查題；不給整體結論，也不影響採用狀態 |
| U-4 | A：每個能力各自寫明接受的證據，不另加更嚴格的政策 | 依 D8 與 spec 8.2，有效的使用者確認在允許時可滿足必要條件，並標示為確認 |

以下保留決定前的選項說明，供日後追溯。

### U-1　題數與呈現方式

| 選項 | 說明 | 優點 | 代價 |
|---|---|---|---|
| **A（建議）** | 保留所有有理由的題目；報告先顯示簡短摘要，細節可展開 | 不會為了湊數而硬合併不相關的問題 | catalog 維護量較大 |
| B | v1 只收固定的小題庫，其餘放待辦清單 | 實作與閱讀成本低 | 報告必須說明涵蓋範圍較窄 |
| C | 每層 baseline 最多 4 題 | 數字好解釋 | 容易扭曲題目邊界，也把性質不同的層等量齊觀 |

報告初始顯示幾題，是介面上的預設值，不是採用門檻。

### U-2　baseline 的模型

| 選項 | 說明 | 優點 | 代價 |
|---|---|---|---|
| **A（建議）** | 一份 catalog；每題寫明在什麼條件下計入 baseline | 符合現有設計 | 適用條件要寫得很精確 |
| B | 分成「最小」與「高保證」兩組 profile | 容易溝通不同的保證目標 | 要另外設計 profile 的選擇、版本與比較方式 |

**核准的粒度：** 不需要逐題核准。

1. 使用者先核准 baseline 的選擇標準。
2. 我們依標準整理一份 baseline 清單，附上理由、適用條件、證據要求與對採用狀態的影響，交使用者一次審查。
3. 若使用者明確授權依標準自行定案，可以照做並記錄這項授權。否則，核准標準不等於核准我們訂出的所有門檻。

### U-3　驗證器保護觀察的呈現（P-C 的後續）

P-C 已決定：不定義 `verifier.protected` 能力，也不分保護等級。這裡要決定的是報告怎麼呈現這些觀察。

| 選項 | 說明 | 優點 | 代價 |
|---|---|---|---|
| **A（建議）** | 報告中設一個不評分的「保護觀察」區塊：逐項列出保護對象、防範的威脅、邊界、證據與未知，附改善建議；不計算整體結論，也不影響採用狀態 | 最直接落實 P-C | 這是 spec 尚未定義的新報告區塊，需要另寫格式 |
| B | 拆成幾個窄範圍的設定檢查，每題有完整九項資訊（例如「CODEOWNERS 涵蓋測試路徑」） | 每項都能規劃與驗收 | 題目變多；讀者容易把「有設定」誤讀成「有保護效果」 |

不論選哪一個，原始題目「驗證器不能被 agent 繞過」都標示為以觀察方式保留，不標示為通過。

### U-4　使用者確認能否滿足必要條件（選擇性）

**原則已定：** D8 與 spec 8.2 已允許有效的使用者確認滿足 catalog 明定的人工要求，也不能覆寫相反的機器觀察。所以預設採 A，不需要重新核准。

只有在使用者想要更嚴格的政策時，才需要選 B：

| 選項 | 說明 | 代價 |
|---|---|---|
| **A（預設）** | 每個能力的判斷式各自寫明接受哪些證據；允許時，有效的確認可滿足必要條件，並標示為「使用者確認」 | 不能宣稱是獨立執行驗證 |
| B | 指定的能力必須有獨立來源或更強的證據 | 會出現更多 `unknown`／`blocked`，也要先定義什麼叫「獨立」 |

無論 A 或 B，agent 的判斷或沒有依據的說法，都不能單獨滿足必要條件。

### 不需要另外決定的事

- **復原的涵蓋範圍：** 建議採「本機原始碼變更由靜態掃描觀察；其他影響範圍接受使用者提供的證據」。若要改成 v1 完全不評估其他範圍，才需要另外決定。
- **D9 三家 CLI 的 adapter 細節：** 不需逐項投票。實作時揭露各 CLI 的支援範圍；有重大缺漏時再提出。

### 3.1 Baseline 選擇標準（已核准）

**狀態：已核准（2026-11-04）。** U-2 已決定核准流程。2026-11-03 的標準表單與 2026-11-04 的 B1–B6 確認表單都曾被取消，沒有當成通過。2026-11-04 交接給 Claude 後，使用者先確認「現在問的是 baseline 的規則」，再於對話中逐題作答，B1–B6 每題都選 A，即下表所列規則。本次核准只涵蓋選擇標準；第 6–8 節的分級、前置條件與門檻仍為提案，依 U-2 第 2 步交整份審查。

| 標準 | 選擇與排除規則 |
|---|---|
| B1 最小必要 | 在確認適用的範圍與目標內，缺少會讓理解、執行、驗證或交接失去最低依據；每題說明具體後果，以及為何更簡單或既有的替代作法仍不足。替代作法足夠時不得強迫新增工具或檔案 |
| B2 情境與範圍 | 分開判斷適用性與 `baseline.when`；逐 CLI、工作流程、迴圈、影響範圍評估，不跨範圍湊證據。條件未知不能當 false；baseline 條件為 false 的適用題仍可呈現進階發現 |
| B3 可核對的主張 | 證據、主張與改善後驗收必須對齊；宣告只證明宣告，不能變成生效證明。允許契約列明且有依據的確認；單純勾「有」或 agent 意見不夠 |
| B4 不湊數 | 按缺失後果而非工具名或來源名氣分級；不設題數、百分比或成熟度階梯。持久狀態、交接或檢查關卡若在某情境必要，可提出條件式 baseline，而不是一律進階 |
| B5 與能力分離 | 題目適用性、baseline、能力前置條件分開。題目通過不授予能力；進階缺口不隱藏。保護觀察不參與採用狀態，不新增自我依賴 |
| B6 不增加通用門檻 | 不要求通用上限、heartbeat、外部驗證器或 runner。前置能力成立、適用性與 baseline 條件已釐清時，基本項不足為 `ready`；必要能力缺少或未知為 `blocked`，有使用證據時依 D2 呈現 `in_use_unsupported`；條件未釐清不可 `adopted` |

核准標準只允許依標準提出整合清單，不自動核准第 6、7、8 節的分級、前置條件或通過規則。無論選擇標準是否通過，41 題的內容均保留供審查。

## 4. 整合時採用的規則

### 4.1 Codex 第一輪指出的修正

以下 7 點都源於已核准的決定，不是新的選擇。

| 修正 | 依據 |
|---|---|
| 自我宣告的完成，可依政策接受（低風險時）；停止訊號、候選提交、接受三者分開 | L-D5 |
| 不把「次數加花費或時間，超過就交人」當成通用要求；依已宣告且適用的政策判斷；看到上限設定不等於證明有強制 | L-D6 |
| 保護觀察不給「部分保護」之類的整體等級 | P-C |
| 不用「形式 ≥ 文字」這種排序；每題列出可接受的形式集合與理由 | D1；spec 5.2 |
| 沒有偵測結果、沒有確認、CLI 不支援，都不能當成「缺少」或「不適用」的證據 | spec 5.3 |
| 看到一個 hook、評估者名稱或 CI 步驟，不能推論整條驗收路徑已設定 | L-D2 |
| 寫好的作業慣例或使用者提供的任務說明，也能滿足任務規格；範本不是唯一途徑 | D1 |

工具研究 4.3 的早期表格若與 Loop 研究 12.3 或正式 spec 衝突，以後者為準；Loop 研究的早期提案章節已於 2026-11-04 移除。

### 4.2 去重原則

- 同一份觀察只計算一次；各題各自寫明除此之外還需要什麼證據。
- 不計算「同一個證據讓幾題通過」這類總數。
- 兩題共用 detector 沒有問題；同一個未經限定的觀察，不能同時證明好幾種不同的主張。

### 4.3 來源用途的四種標示

每個來源都要標示實際用了哪一部分：

| 標示 | 意義 |
|---|---|
| 保留題目 | 原題的問題保留（可能改寫） |
| 規則卡沿用 | 內容成為改善規則卡的依據，不另成一題 |
| 政策改寫 | 依本工具的政策改寫，標示為工具政策，不是來源原意 |
| 排除 | 不收錄，附理由 |

標示「合併」時，不代表來源的每一項主張都被保留；只用了一小部分時，要寫明用了哪部分。

### 4.4 v1 detector 的證據邊界

依 Codex 第一輪 D 節整理：

| 類別 | 例子 | 可以說什麼 |
|---|---|---|
| 可實作的結構化觀察 | 指引檔存在、本機路徑可解析、檔案大小、skill／agent 定義的結構化欄位、manifest 指令、測試框架、lint／型別設定、lockfile、hook 與權限設定的已知語法、CI 觸發與步驟、CODEOWNERS 樣式 | 存在與結構；不證明被使用、品質或生效 |
| 弱訊號 | 指引中的關鍵字、範本欄位名、hook 或 CI 指令中的子字串、`stop_hook_active`、devcontainer 存在、`migrations/` 目錄名稱、MCP 設定 | 只當候選線索；不得當語意或執行的通過依據 |
| 需要人工證據 | 指引是否互相矛盾、工作流程是否有用、隔離與復原的實際效果、遠端核准、agent 能否看到有用的 log、成本與成效量測、路由不可跳過、交接正確性、改進的效果 | 可先收集靜態觀察作為輔助；整體結論需要人工證據或外部紀錄 |

缺少確認時回報 `unknown`，不代表該作法不存在。

每個 detector 實作前都要記錄五件事：

- 輸出的觀察
- 支援的語法、產品與版本
- 反例測試
- 什麼情況回報 `unknown`
- 由哪個判斷式使用

## 5. 來源對照

### 5.1 原始 27 題

原文見[檢查表檢視 3.3](./2026-11-03-five-layer-checklist-review.md#33-各層內容)。

| 原編號 | 原題 | 處理 | 目標 ID | 理由 |
|---|---|---|---|---|
| P1 | 專案指引只有一份，所有 agent 讀同一份 | 改寫並移層 | `context.instruction-authority` | F-04；改問每個 CLI、每個範圍的權威來源與優先順序。「沒有矛盾」另作語意評估 |
| P2 | 重複出現的工作，寫成了固定做法 | 改寫並移層 | `context.reusable-workflows` | F-04；有 skill 或腳本檔還不夠，要與實際重複的工作相關 |
| P3 | 每個專責 agent 有自己的角色說明 | 合併並移層 | `graph.roles` | F-01；與 G1 合併 |
| P4 | 輸出格式有事先約定 | 保留 | `prompt.output-contract` | 加入「無法執行的驗證要說明」 |
| C1 | 專案知識有索引，agent 先讀索引再讀細節 | 改寫 | `context.index-to-details` | 只在知識分散多處時適用；小專案不必硬做索引 |
| C2 | 該看的規範，會在對的時機自動出現 | 改寫 | `context.just-in-time` | 改成「載入規則有宣告」；實際何時載入屬執行期 |
| C3 | 踩過的坑有固定存放的地方 | 保留 | `context.lessons-store` | 依 D5 可選擇任何保存機制；新專案沒有歷史紀錄不算缺失 |
| C4 | 程式碼結構查得到，不用整檔讀 | 保留 | `context.code-navigation` | 主要靠人工證據 |
| C5 | 什麼原文引用、什麼摘要、什麼不放，有規則 | 待決 | 待辦清單 | 問題與證據契約尚未設計。這類規則可能寫在指引或 compaction 政策中，不是不可觀察 |
| H1 | 擋：機器能判定的規範，交給 lint 和 CI 硬擋 | 改寫 | `harness.mechanical-enforcement` | 改問「已宣告的規範是否對應到機械檢查、在哪個邊界、失敗後果為何」；與工程基礎的分析工具設定分開 |
| H2 | 擋：要靠理解的規範，有指定誰來審 | 改寫 | `harness.review-ownership` | 不限團隊；審查者可以是人或模型 |
| H3 | 擋：agent 的權限邊界有設 | 保留 | `harness.permission-boundaries` | 依 CLI adapter 分開判讀 |
| H4 | 擋：每件工作有隔離的執行環境 | 保留 | `harness.isolation` | 與復原分開：隔離不等於可復原 |
| H5 | 修：寫完會自動檢查 | 改寫 | `harness.verification-wiring` | F-06；問 agent 工作流程中，驗證怎麼觸發、結果回到哪裡 |
| H6 | 修：出錯之後能復原或重來 | 改寫 | `harness.recovery` | 依影響範圍描述復原、補償或對帳方式 |
| H7 | 量：成本和耗時看得到 | 保留 | `harness.cost-visibility` | — |
| H8 | 量：agent 做對幾成，算得出來 | 保留 | `harness.outcome-measurement` | 依量測結果做改進，屬 Loop |
| L1 | 目標有可以測試的停止條件 | 拆分 | `loop.acceptance-policy`、`loop.stopping-policy` | 驗收（接受結果）與停止（取消、阻塞、額度用盡）不同；依 L-D5，自我宣告可依政策接受 |
| L2 | 每一圈都有驗證步驟 | 改寫 | `loop.feedback-routing` | F-06；問驗證結果如何對應到下一步 |
| L3 | 重試有上限，超過會交給人 | 改寫 | `loop.bounds` | 合併 F-09 的花費上限；依 L-D6 先定語意，不定數字 |
| L4 | 每一圈都留下紀錄 | 改寫 | `loop.resumable-state` | 結構化狀態檔加上 commit 或 ignore，不能證明可接續 |
| L5 | 誰來啟動這個迴圈，有定義 | 保留 | `loop.trigger` | 不得因為有 CI 就推論是 agent 迴圈 |
| G1 | 每種工作有專責的節點 | 合併 | `graph.roles` | 節點可以是 agent、確定性函式或人 |
| G2 | 走向由程式決定，agent 不能自己跳關 | 改寫 | `graph.declared-routes` | F-07；模型路由也合法 |
| G3 | 整件事只有一份共用紀錄 | 改寫 | `graph.shared-state` | F-08；只在實際共用狀態時適用 |
| G4 | 人的核准點畫進圖裡 | 保留 | `graph.human-gates` | 只在政策要求人決定時適用 |
| G5 | 路徑上的檢查有寫明 | 保留 | `graph.edge-gates` | 與 G2 分成兩題、同組呈現：有路徑不代表路徑上有檢查 |

### 5.2 檢視提案

出處見[檢查表檢視第 6、8 節](./2026-11-03-five-layer-checklist-review.md#6-檢視結果)。

| 提案 | 處理 | 目標 | 說明 |
|---|---|---|---|
| Prompt：任務的目標、限制、驗收條件有寫清楚 | 新增 | `prompt.task-spec` | F-04、F-09 |
| Prompt：需要時附上範例 | 合併 | `prompt.task-spec` 的規則卡 | 範例可觀察；依相關性作為條件式指引，不另成一題 |
| Prompt：大任務先拆成步驟 | 新增 | `prompt.plan-for-nontrivial` | 只在有非小型任務時適用 |
| Context：只寫非標準做法，不重複 lint 已擋的規則 | 新增 | `context.instruction-hygiene` | Gloaguen；Dos Santos 的 Lint Leakage、Context Bloat |
| Context：過期的文件有人清 | 新增 | `context.maintenance` | 與上一題分開、同組呈現：精簡但過期，或有人維護但冗長，需要不同的改善方式 |
| Harness：錯誤訊息寫成能教 agent 怎麼修 | 待決 | 待辦清單 | 可以用人工證據判斷；因範圍考量暫緩，不是因為無法觀察 |
| Harness：agent 看得到 log、畫面、指標 | 新增 | `harness.agent-observability` | — |
| Harness：外部內容視為不可信 | 新增 | `harness.untrusted-input` | — |
| Loop：驗證器不能被 agent 繞過 | 以觀察保留 | 保護觀察區塊（U-3 A） | P-C；主層改為 Harness，Loop 為相關層 |
| Loop：有花費上限 | 合併 | `loop.bounds` | — |
| Loop：同一種錯出現第二次，就變成規則、測試或工具 | 改寫 | `loop.learn-from-results` | 不強制「第二次就訂規則」；是否採用需要判斷 |
| Graph：這件事真的需要多個 agent 或分支嗎？ | 改寫 | Graph 層的適用性條件 | F-02；不是計分題 |
| Graph：交接格式有定義 | 新增 | `graph.handoff-contract` | — |
| 全域：症狀 → 層、刪除「外層救不回來」、引用修正（F-03、F-11–F-13） | 不屬 catalog | 報告呈現與文件 | — |
| 全域：三態（F-10） | 已由模型解決 | spec 5.2 的作法形式與證據等級 | 不另設欄位 |

### 5.3 gist 段落

來源是保哥的 [AGENTS.md gist](https://gist.github.com/doggy8088/736457fa63e0aaeb152a0b2d30b73d82)，revision `83e12fa`（2026-07-03）。行號依此版本。依 D4 可直接使用，規則卡以 `derived_from` 保留出處。

以下行號與 revision 來自本機副本（`gist-agents-md.md`，SHA-256 `aa023457…e93983`），它是來源出處紀錄，不是對遠端內容的獨立驗證。

| gist 段落（行） | 處理 | 用途 | 相關題目 | 規則卡 |
|---|---|---|---|---|
| Operating Principles 與 Additions（7） | 合併 | 規則卡沿用 | — | `core-principles`（濃縮） |
| WO1 Plan Mode Default（27） | 拆分 | 保留題目＋規則卡沿用 | `prompt.task-spec`（可測試的成功條件）、`prompt.plan-for-nontrivial` | `plan-before-act`、`plan-template`；用中立說法，不用 vendor 的「plan mode」 |
| WO2 Subagent Strategy（47） | 拆分 | 保留題目＋規則卡沿用 | `graph.roles`、`graph.handoff-contract` | `subagent-roles` |
| WO3 Incremental Delivery（64） | 合併 | 規則卡沿用 | `loop.feedback-routing` | `incremental-delivery`；迴圈外也適用 |
| WO4 Self-Improvement Loop（78） | 拆分 | 保留題目＋規則卡沿用 | `context.lessons-store`、`loop.learn-from-results` | `lessons-file`、`tripwires`；檔名依 D5 |
| WO5 Verification Before "Done"（94） | 拆分 | 規則卡沿用 | `foundation.verify-entrypoints`、`harness.verification-wiring`、`loop.acceptance-policy`；「No silent skips」對應 `prompt.output-contract` | `verify-before-done`；不另成重複題目（spec 6.3）。「No silent skips」要求說明哪些驗證沒跑，不是防竄改保護 |
| WO6 Demand Elegance（111） | 排除 | 排除 | — | 可選 1 行放入 `core-principles`。理由：不是獨立的基礎設施檢查 |
| WO7 Autonomous Bug Fixing（123） | 合併 | 規則卡沿用 | `loop.feedback-routing` | `bugfix-workflow`；迴圈外也適用；自主程度依風險區分 |
| Task Management（143） | 拆分 | 保留題目＋規則卡沿用 | `loop.resumable-state`、`prompt.task-spec`；Risk & Rollback 對應 `harness.recovery`、`harness.high-risk-controls`；Dependencies & Environment 對應 `foundation.dev-environment` | `todo-file`；依 D5，不強制檔名 |
| Communication 1、2、5（174、189、223） | 合併 | 規則卡沿用 | — | `core-communication` |
| Communication 3 State Assumptions（202） | 合併 | 規則卡沿用 | `prompt.task-spec` | `core-communication` |
| Communication 4 Show the Verification Story（211） | 合併 | 保留題目 | `prompt.output-contract` | `verification-story` |
| Context Mgmt 1 Read Before Write（237） | 合併 | 規則卡沿用 | — | `core-context`。其中「Authority ranking」談的是程式碼的事實來源，不是指引的權威 |
| Context Mgmt 2 Working Memory（249） | 合併 | 規則卡沿用 | `loop.resumable-state`、`context.maintenance` | `todo-file`；保留工作摘要、必要原始證據連結、過期內容整理，不等於已納入 C5 廣義納入規則 |
| Context Mgmt 3 Minimize Cognitive Load（262） | 排除 | 排除 | — | 程式風格建議，不是 agent 基礎設施 |
| Context Mgmt 4 Control Scope Creep（274） | 合併 | 規則卡沿用 | — | `core-principles` |
| Error Handling 1–2 Stop-the-Line、Triage（290、303） | 合併 | 規則卡沿用 | `loop.feedback-routing` | `stop-the-line`；迴圈外也適用 |
| Error Handling 3–4 Safe Fallbacks、Rollback（318、332） | 合併 | 規則卡沿用 | `harness.recovery` | `rollback-strategy` |
| Error Handling 5 Instrumentation（345） | 合併 | 規則卡沿用 | `harness.agent-observability` | `instrumentation` |
| Eng BP 1 API／Interface（362） | 待決 | 待辦清單 | — | `api-discipline`（有條件） |
| Eng BP 2 Testing（375） | 合併 | 規則卡沿用 | `foundation.automated-tests` | `testing-strategy` |
| Eng BP 3 Types and Invariants（390） | 合併 | 規則卡沿用 | `foundation.static-analysis` | 不變量與邊界驗證保留為有條件的規則卡內容；型別設定不代表不變量已被強制 |
| Eng BP 4 Dependency Discipline（402） | 合併 | 規則卡沿用 | `foundation.dev-environment` | `dependency-discipline`；lockfile 只涵蓋一部分 |
| Eng BP 5 Security and Privacy（414） | 合併 | 規則卡沿用 | `foundation.security-signals` | `security-privacy`。prompt injection 的控制屬政策改寫，以 agent 專屬來源為主 |
| Eng BP 6 Performance（431） | 待決 | 待辦清單 | — | `performance`（有條件） |
| Eng BP 7 Accessibility（444） | 待決 | 待辦清單 | — | `a11y`（有 UI 時） |
| Git and Change Hygiene（457） | 拆分 | 規則卡沿用 | PR 證據與風險說明歸 `prompt.output-contract`；禁止改寫歷史歸 `harness.permission-boundaries` 的規則卡 | `git-hygiene`（選用） |
| Definition of Done（483） | 合併 | 保留題目＋規則卡沿用 | `prompt.task-spec`、`loop.acceptance-policy` | `definition-of-done`；DoD 也適用於沒有明確迴圈的互動工作 |
| Templates：Plan（505） | 合併 | 規則卡沿用 | `prompt.plan-for-nontrivial` | `plan-template` |
| Templates：Bugfix（523） | 合併 | 規則卡沿用 | — | `bugfix-template`；範本存在不證明執行期的回饋路由 |
| Repository Discovery Playbook（548） | 合併 | 規則卡沿用 | `context.index-to-details`、`foundation.verify-entrypoints` | `repo-discovery` |
| High-Risk Change Protocol（568） | 合併 | 政策改寫 | `harness.high-risk-controls`、`graph.human-gates` | `high-risk-protocol`。gist 要求回滾、加強驗證與資料安全；CODEOWNERS 與 deny 規則是本工具的改寫 |
| Data Migration（588） | 合併 | 規則卡沿用 | `harness.high-risk-controls` | `data-migration`（有條件） |
| Concurrency（601） | 待決 | 待辦清單 | — | `concurrency`（有條件） |
| AI Hallucination Mitigation（613） | 合併 | 規則卡沿用 | — | `core-principles` |
| Review Checklist（624） | 合併 | 規則卡沿用 | `harness.review-ownership`、`loop.acceptance-policy` | `review-checklist` |

**排除理由的寫法：** 不寫「模型本來就會」。研究並未證明所有模型都能可靠做到。改寫為「不是獨立的基礎設施檢查；需要時保留為選用指引」。

### 5.4 工程基礎來源

工程基礎（第 0 層）原本沒有逐題清單，只有 [spec 5.1](./2026-11-03-five-layer-tool-spec.md#51-第-0-層與五個面向) 的描述與 Factory 的九個支柱（[工具研究第 3 節](./2026-11-03-five-layer-tool-research.md#3-既有工具調查)）。

| 來源 | 處理 | 目標 |
|---|---|---|
| spec 5.1「驗證指令」 | 保留 | `foundation.verify-entrypoints` |
| spec 5.1「測試」；gist Eng BP 2；Factory Testing | 保留 | `foundation.automated-tests` |
| spec 5.1「lint」；gist Eng BP 3；Factory Style & Validation | 保留 | `foundation.static-analysis` |
| spec 5.1「CI」 | 保留 | `foundation.ci-verification` |
| spec 5.1「開發環境」「基本文件」；gist Eng BP 4；Factory Development Environment、Build System | 合併 | `foundation.dev-environment`：本機設定與 build 方式有記錄。build 不等於 CI；「概覽無助 agent」的研究不代表基本設定文件無用 |
| Factory Security；gist Eng BP 5 | 保留 | `foundation.security-signals`：明示不是完整的安全基線 |
| Factory Debugging & Observability | 合併 | `harness.agent-observability` |
| Factory Task Discovery、Product & Experimentation | 排除 | 不屬 agent 基礎設施檢查 |
| 版本控制本身 | 合併 | 作為 `harness.recovery` 的輔助觀察；不另設必要題，Git 也不是唯一可接受的復原基礎 |

## 6. 候選題目索引

這是**候選**索引，不是可執行的 catalog。三種狀態分開記錄：

- **收錄：** 是否列為候選題目
- **契約：** 九項資訊是否完整
- **分級建議：** baseline 或 advanced 的分級；依 U-2，使用者已於 2026-11-04 核准選擇標準並逐層審查通過（見本節末審查紀錄）

| ID | 主層（相關層） | 問題 | 分級建議 | 適用條件概要 | 契約 |
|---|---|---|---|---|---|
| `foundation.verify-entrypoints` | foundation（harness） | 驗證進入點已宣告並記錄在指定來源 | 條件式 baseline | 有需驗證的產出 | 完整 |
| `foundation.automated-tests` | foundation | 自動化測試有可辨識的案例與執行方式 | 條件式 baseline | 有可測試程式，且選定自動化回歸為基本驗證 | 完整 |
| `foundation.static-analysis` | foundation（harness） | 有非純排版的靜態分析設定 | 條件式 baseline | 程式範圍的驗證政策需要靜態分析 | 完整 |
| `foundation.ci-verification` | foundation（harness） | CI 叫用驗證；失敗後果分開回報 | 條件式 baseline | 指定 CI 承擔驗證；僅有 CI 不夠 | 完整 |
| `foundation.dev-environment` | foundation | 設定環境、相依與 build 的方式有宣告 | advanced | 需要本機開發環境 | 完整 |
| `foundation.security-signals` | foundation（harness） | 指定安全控制的設定有依據，不代表安全保證 | advanced | 有選定的安全控制目標 | 完整 |
| `prompt.task-spec` | prompt（loop） | 任務目標、範圍、限制、驗收條件有約定 | 條件式 baseline | agent 接受工作委託 | 完整 |
| `prompt.output-contract` | prompt | 輸出與驗證回報有約定，包含未執行項目 | 條件式 baseline | agent 交付成果 | 完整 |
| `prompt.plan-for-nontrivial` | prompt（loop） | 非小型任務的規劃包含驗證與重規劃 | advanced | 已確認有非小型任務 | 完整 |
| `context.instruction-authority` | context（prompt） | 各 CLI／範圍的權威指引、優先順序與已知衝突有處理 | 條件式 baseline | 使用 agent | 完整 |
| `context.index-to-details` | context | 分散知識有可用導航；概覽可保留 | 條件式 baseline | 必要知識分散且需導航取用 | 完整 |
| `context.just-in-time` | context | 依路徑或情境載入的規則有宣告 | advanced | 有條件式載入需求 | 完整 |
| `context.reusable-workflows` | context（prompt） | 重複工作有相關且可取用的作法 | advanced | 有重複工作 | 完整 |
| `context.lessons-store` | context（loop） | 經驗有保存與取用方式，不強制檔名 | advanced | 選擇保存跨任務經驗 | 完整 |
| `context.instruction-hygiene` | context | 指引內容與任務相關，冗餘有理由 | advanced | 有指引內容 | 完整 |
| `context.maintenance` | context | 過期內容有負責人或清理方式 | advanced | 有長期維護的指引或工作摘要 | 完整 |
| `context.code-navigation` | context | 能以範圍化查詢定位符號與關係 | advanced | 有程式碼 | 完整 |
| `harness.verification-wiring` | harness（foundation、loop） | 評估觸發、輸入、評估者與結果交付有宣告 | 條件式 baseline | 工作流程需要評估 | 完整 |
| `harness.permission-boundaries` | harness | 各 CLI 的權限、核准與外部邊界有宣告 | 條件式 baseline | 選定 CLI 會接觸專案資源 | 完整 |
| `harness.recovery` | harness | 各影響範圍有復原、補償或對帳處置 | 條件式 baseline | 可改變狀態；不可逆限制須明示 | 完整 |
| `harness.isolation` | harness | 隔離或共享工作環境的邊界有宣告 | advanced | 有執行環境或共享工作區 | 完整 |
| `harness.mechanical-enforcement` | harness（foundation） | 可機械檢查的規範有對應檢查與失敗後果 | advanced | 有指定可機械檢查的規範 | 完整 |
| `harness.review-ownership` | harness | 語意審查有負責人或評估者 | advanced | 政策有語意審查需求 | 完整 |
| `harness.high-risk-controls` | harness（graph） | 指定高風險變更有對應控制與核准方式 | advanced | 已宣告高風險範圍 | 完整 |
| `harness.untrusted-input` | harness | 外部內容與指令權限分開處理 | advanced | 會讀取外部不可信內容 | 完整 |
| `harness.agent-observability` | harness | 所需診斷資料有取用路徑與範圍證據 | advanced | 有應用或服務診斷需求 | 完整 |
| `harness.cost-visibility` | harness | 用量、時間與估計／實際花費可追溯 | advanced | 有成本或耗時觀測需求 | 完整 |
| `harness.outcome-measurement` | harness（loop） | 成效指標有母體、判準與計算依據 | advanced | 選擇量測 agent 成效 | 完整 |
| `loop.trigger` | loop | 指定迴圈的啟動者與觸發範圍有定義 | 條件式 baseline | 宣告或觀察到的專案迴圈 | 完整 |
| `loop.acceptance-policy` | loop（prompt） | 候選成果由誰依什麼政策接受 | 條件式 baseline | 迴圈會提交成果或改進提案 | 完整 |
| `loop.stopping-policy` | loop | 暫停、停止、取消、阻塞與恢復有宣告 | 條件式 baseline | 迴圈的執行需要生命週期控制 | 完整 |
| `loop.feedback-routing` | loop（harness） | 評估結果如何決定下一步有宣告 | 條件式 baseline | 以執行回饋決策的迴圈 | 完整 |
| `loop.bounds` | loop | 上限的範圍、計數與耗盡處置有宣告 | 條件式 baseline | 自主執行或自動重試 | 完整 |
| `loop.resumable-state` | loop（context） | 接續所需狀態、版本與未知效果有宣告 | 條件式 baseline | 明確需要跨 session 接續 | 完整 |
| `loop.learn-from-results` | loop（context） | 跨次改進有提出、採納與回看效果的流程 | advanced | 有跨次改進目標 | 完整 |
| `graph.roles` | graph | 節點的職責、輸入與交付責任有定義 | 條件式 baseline | Graph 適用 | 完整 |
| `graph.declared-routes` | graph | 路由、終點與未匹配情況有宣告 | 條件式 baseline | Graph 適用 | 完整 |
| `graph.edge-gates` | graph | 指定轉移的檢查或授權條件有定義 | 條件式 baseline | 政策要求轉移受控 | 完整 |
| `graph.handoff-contract` | graph | 交接內容、版本、接收與拒絕方式有定義 | 條件式 baseline | 節點間有交接 | 完整 |
| `graph.human-gates` | graph（harness） | 人工核准點、授權與未回覆處置有定義 | 條件式 baseline | 政策要求人決定 | 完整 |
| `graph.shared-state` | graph | 狀態的權威、更新與各節點可見範圍有定義 | 條件式 baseline | 節點依賴共用狀態 | 完整 |

統計：工程基礎 6、Prompt 3、Context 8、Harness 11、Loop 7、Graph 6，共 41 題。23 題附條件式 baseline 提案，18 題為進階提案；不是所有專案都適用 23 題。比初稿的 20 題多出 `loop.resumable-state`、`graph.edge-gates`、`graph.shared-state`：只有明確要求接續、受控轉移或共用狀態的範圍才納入。此變動及條件已隨 2026-11-04 的逐層審查一併通過，不代表提高門檻。

**審查紀錄（2026-11-04）：** 使用者選擇逐層審查（六輪，每輪列出該層題目、分級與適用條件概要，只挑有疑問的題討論）。六層均選 A「照建議全過」：foundation 4 基本／2 進階、prompt 2／1、context 2／6、harness 3／8、loop 6／1、graph 6／0，合計 23 條件式 baseline、18 advanced，與上表一致。三題新增項（`loop.resumable-state`、`graph.edge-gates`、`graph.shared-state`）在審查時已標示為新增並通過。本紀錄核准的是每題的分級與適用條件概要。第 7 節能力前置條件與層級條件於同日另一輪審查通過；第 8 節的核對結果見 8.0 審查紀錄。

**不在索引內：**

- **驗證器保護觀察**：主層 Harness、相關層 Loop；依 U-3 A，以不評分的觀察區塊呈現，格式見 6.2。
  - 觀察項目包括：權限規則禁止修改測試或 CI、PreToolUse hook、CODEOWNERS 涵蓋測試與 CI、CI 檢查測試被刪除。
  - 保護對象依政策與實際的驗證路徑決定，不寫死為 `tests/` 與 CI。
- **待辦清單**（不參與評估）：
  - C5「引用、摘要、捨棄的規則」
  - `harness.teaching-errors`
  - gist 的 API、Performance、Accessibility、Concurrency 段落
  - commit 慣例

### 6.1 層的適用性

**建議：**

- **適用性分三件事記錄：** 觀察到的使用、使用者選擇的目標、評估後的需要。
  - 使用者表示不需要 Graph，但觀察到 Graph 正在使用時，要顯示衝突，不隱藏這一層。
  - 「沒有宣告」不等於「沒有使用」。
- **Loop 依迴圈類型判斷適用性**（語意已隨 2026-11-04 Loop 層審查通過；英文類型名稱於實作時定版）：
  - `execution-feedback`：同一個任務內反覆執行，依驗證結果決定下一步
  - `event-driven`：由事件或排程觸發的 agent 執行
  - `cross-run-improvement`：跨次執行的檢討與改進，可以由人主導，不需要自主的內層迴圈
  - 每題只適用於相關的類型。互動式單一 agent 使用時，CLI 內部的模型迴圈不會讓整個 Loop baseline 都變成適用。
- **Graph 適用性是條件，不是能力：** 不能由 detector 授予。
  - 單一 agent、但有確定性多步驟流程的專案，也可能適用 Graph。

### 6.2 不評分的驗證器保護觀察

這不是第 42 題，也不是能力判斷式。每個觀察獨立顯示；不輸出 `verified`、`partial protection`、總分或整體防護結論，不影響 baseline 與採用狀態。

| 欄位 | 記錄內容 |
|---|---|
| `observation_id`、版本 | 可追溯的紀錄識別與產生該觀察的 detector／adapter／catalog 版本 |
| `scope`、`subject` | 工作流程、CLI、驗收對象與版本；受保護的測試、政策、驗證輸出或其他依據 |
| `threat`、`actor` | 要限制誰對哪些材料做什麼；未取得威脅模型時標示未確認，不自行發明攻擊者 |
| `mechanism`、`boundary` | 指示、權限設定、審核治理或完整性檢查；本機寫入、PR、CI 等邊界各自記錄 |
| `observation`、`evidence` | 實際看見的設定與精確位置／引文／指紋，或有效的人工確認；保留 static、assessment、attestation 來源 |
| `unknowns`、`coverage` | 未支援、未讀到、repo 外、搜尋範圍、有效時間、與其他證據的衝突 |
| `advice`、`recheck` | 僅提出該觀察的改善選項與重看方法；不自動變成 adoption 門檻或執行修改 |

| 觀察來源 | 可說什麼 | 不可說什麼 |
|---|---|---|
| 已支援 CLI 的路徑權限規則 | 規則涵蓋哪些路徑、宣告 allow／deny／approval | 所有寫入路徑都受到強制；權限設定沒有繞過可能 |
| PreToolUse 等 hook 設定 | 事件、條件與可辨識的分支；無法解析部分另列 | runtime 必定載入；程式名稱含 verify 就代表保護 |
| CODEOWNERS | 在已知規則語法下涵蓋的路徑與指定擁有者 | 分支已強制審核；本機 agent 改不了檔案 |
| CI 的測試刪除檢查 | 檢查範圍、宣告動作與已知失敗後果 | 防止測試被弱化；所有 verifier 都不可竄改 |

讀取沿用權限、hook、CI 與檔案範圍觀察，不為此執行任何 hook。無支援 parser 時由使用者提供去敏感的片段與範圍確認；agent 的語意解讀只保留為候選。例：CODEOWNERS 可讀但 hook 讀取失敗時，列出兩筆觀察與各自未知，不能概括為「部分保護」。原始提案來源為檢視 F-09／第 8 節，呈現政策來源為 P-C 與 U-3 A。

## 7. 能力登錄表與前置條件

**狀態：已核准（2026-11-04）。** 使用者以一輪審查通過 7.1 的 9 項能力、7.3 的層級條件與真值表（`unknown` 記為待確認，不當成缺少）。

### 7.1 登錄表

**約束：**

- 登錄表是能力判斷式的唯一權威（spec 5.4）。
- 檢查題與規則卡都沒有權威的 `provides` 欄位；報告與索引中的反向連結，由登錄表自動產生。
- 檢查題通過或規則卡已套用，都不會自動授予任何能力。
- 下表每列的充分條件是 `all`；列出的「靜態或確認」是取得同一主張的 `any` 途徑，不能把不相干範圍的片段拼在一起。判斷式本身沒有能力相依。
- 能力結果是成立／不成立／unknown，不是題目的五種結果。只有完整、明確搜尋範圍內的否定證據，或有效的附依據否定確認，才能判不成立；其餘未滿足的情形為 unknown。部分已知主張仍保留，但不授予能力。
- 使用者確認須符合 8.0 的有效性要求；與靜態證據矛盾時保留衝突且不授予能力。單純名稱、關鍵字、設定檔存在不是充分條件。

| 能力 | 判斷的事 | 可接受的證據 | 不代表 |
|---|---|---|---|
| `verify.entrypoint-declared@1` | 同一專案範圍的進入點名稱、呼叫方式與驗證用途均有宣告 | 靜態解析已支援 manifest／指定宣告，或附來源的使用者確認；script 名稱只當線索 | 可以執行、適合用來驗證 |
| `verify.entrypoint-documented@1` | 上述進入點的呼叫方式與用途記錄在已辨識指引或指定來源，且對應關係已核對 | 指令區塊與宣告的結構對應，或使用者指認兩者；同名不自動視為相同指令 | agent 實際讀到；adapter 載入假設另外標示 |
| `evaluation.config-declared@1` | 同一評估範圍的輸入、評估方式與規準引用、結果紀錄位置已宣告；多位評估者逐一記錄 | 可解析的設定與政策合併，或有效人工確認；只有名稱或 hook 片段時仍為 unknown | 執行可用性、觸發接線或整條驗收路徑（L-D2） |
| `evaluation.run-recorded@1` | 指定成果／版本、評估方法／版本、時間、結果與紀錄位置均可對應 | 使用者提供的紀錄與確認；v1 不自行擷取。不完整摘要保留為片段 | 之後每次都會執行；驗證足夠充分 |
| `recovery.local-source-plan-declared@1` | 本機原始碼的基準、處置步驟、責任者、涵蓋與排除已宣告 | 明確復原宣告或有效確認；Git／worktree 資料只輔助核對，不足以單獨成立 | 未 commit／ignore 的資料或遠端效果可復原 |
| `recovery.effect-plan-declared@1` | 指定非原始碼效果的識別、復原／補償／對帳步驟、授權者、不可逆限制與未知結果處置已宣告 | 逐效果的外部流程材料與有效確認；v1 僅讀使用者明確提供的材料，不查外部服務 | 操作曾成功復原，或不可逆效果已被消除 |
| `loop.acceptance-policy-declared@1` | 同一迴圈的候選成果／版本、接受權責、規準／證據、接受／拒絕／例外規則已宣告 | 政策內容或有效確認；可解析設定只能支持涵蓋的子主張；自我宣告若被允許須明示 | 停止／暫停政策；驗收正確；hook 放行即接受 |
| `loop.stopping-policy-declared@1` | 同一迴圈適用的正常結束、取消、阻塞／恢復及額度耗盡處置與權責已宣告；不適用分支有理由 | 完整政策或有效確認；單一上限設定不夠 | 上限有強制力，或取消程序等於取消遠端效果 |
| `loop.feedback-routing-declared@1` | 同一邊界的結果類別與下一步／決策者有對應；未能評估的情況不冒充 pass | 結構化政策／有限語法分支加上已確認意義，或有效確認；見 8.4 的適用結果集合 | 每圈執行評估或遵循對應 |

與研究文件候選名稱的對應（[spec 5.4](./2026-11-03-five-layer-tool-spec.md#54-能力與前置條件) 所稱的候選能力）：

| 研究中的候選名稱 | 本 catalog | 調整理由 |
|---|---|---|
| `commands.verify-documented` | `verify.entrypoint-declared@1`、`verify.entrypoint-documented@1` | 「有宣告」與「有記錄給 agent 看」是不同主張 |
| `verifier.configured` | `evaluation.config-declared@1` | 依 L-D2，評估者可以是人、模型或程式；看到設定不代表執行時可用 |
| `verifier.confirmed` | `evaluation.run-recorded@1` | 只表示有使用者提供的執行紀錄，不表示驗證充分 |
| `recovery.available` | `recovery.local-source-plan-declared@1`、`recovery.effect-plan-declared@1` | 分範圍的處置宣告，不把 Git 當成所有效果都可復原 |
| `verifier.protected` | 不設立 | P-C |

Loop 研究早期提案（已於 2026-11-04 移除）以舊名稱寫的必要條件，以本節及第 7.3 節為準。

其他效果範圍（例如外部付款、遠端資源）的復原：

- 自動靜態偵測不支援，但可依 `recovery.effect-plan-declared@1` 採計明確提供的證據。
- 沒有證據時回報 `unknown`，不是不適用。

### 7.2 三種相依分開

**建議：** 下表是 D11 九項資訊內的欄位細化，不是新的產品功能。

| 相依的意義 | 放在哪裡 | 規則 |
|---|---|---|
| 檢查時需要的輸入 | `inspection.inputs` | 寫明輸入不存在時怎麼辦；可能讓某個 detector 無法執行或回報 `unknown`，但不影響其他可獨立進行的觀察 |
| 採用某作法需要的能力 | 每題的 `prerequisites`，以及第 7.3 節的層級條件 | 分必要與建議，寫明 all／any；缺少前置條件時，該題仍要能回報這項缺少；不可以依賴「只是把自己成功條件換句話說」的能力 |
| 改善動作的先後順序 | 改善計畫的 `depends_on` | 依規則卡與目前證據產生；有些缺口要先問人，不是改檔 |

登錄表的相依、catalog 的引用、產生的計畫相依，三者各自檢查循環。另外要檢查範圍是否一致，以及 `unknown` 是否正確向後傳遞。引用不存在的能力時直接拒絕，不轉成 false。

### 7.3 層級條件

**建議：**

- D2 的逐層狀態需要「必要條件是否成立」的算法。
- 層級條件集中寫在一個 `layers` 區塊，但每個條件都綁定到具體的工作流程、迴圈或影響範圍。
- 每個相關的範圍都要各自成立；一個設定完整的工作流程，不能掩蓋另一個沒有支援的工作流程。

| 層 | 條件 |
|---|---|
| foundation、prompt、context | 無 |
| harness | 若某工作流程由 worker 自己叫用指令評估，該範圍需要 `verify.entrypoint-declared@1`；需要 worker 找得到時，再加 `verify.entrypoint-documented@1`。由 runner 負責的驗證，不必讓 worker 看得到指令 |
| loop | 若驗收政策需要評估機制，該迴圈中每個必要的評估邊界、成果／輸入範圍與評估者各需對應的 `evaluation.config-declared@1`，不可跨邊界替代；政策缺少或未知不能使條件變 false。改變狀態時，依各效果要求 `recovery.local-source-plan-declared@1` 或 `recovery.effect-plan-declared@1` 仍是**候選政策**；不可逆效果可明示補償、對帳、授權及限制，不假稱可回滾 |
| graph | 先確認 Graph 適用；只有會循環或重試的部分，才套用 Loop 的條件 |

**真值表：**

| 範圍是否適用 | 能力判定 | 對層狀態的影響 |
|---|---|---|
| 已確認適用 | 成立 | 滿足 |
| 已確認適用 | 不成立 | 必要能力缺少 → `blocked`；已有使用證據且符合 D2 時為 `in_use_unsupported` |
| 已確認適用 | `unknown` | 必要能力待確認 → `blocked`；已有使用證據且符合 D2 時為 `in_use_unsupported`，不改記為確定缺少 |
| 已確認不適用（附理由與期限） | 不評估 | 不阻擋 |
| `unknown` | 不評估能力 | 不能略過；列為待確認，該層不能是 `adopted` |

組合條件的規則：

- **all：**
  - 任一項不成立 → 不成立
  - 否則有任一項 `unknown` → `unknown`
- **any：**
  - 任一項成立 → 成立
  - 否則有任一項 `unknown` → `unknown`

**例子：** 同一個 repo 有兩個迴圈。

- **迴圈 A：** CI 中的 agent 工作，評估者是測試指令，各項條件都成立。
- **迴圈 B：** 排程產生文件，接受產出時沒有任何評估政策。
- **結果：**
  - 兩者的證據不能合併計算。
  - 報告逐一列出兩個迴圈：A 滿足，B 在範圍完整且取得否定依據時缺少驗收政策，否則待確認。
  - B 的評估能力需求仍未釐清，不能把「沒有政策」當作「不需要評估」，也不能直接推論能力不存在。
  - Loop 層不能是 `adopted`。

## 8. 全部 41 題的九項契約

8.1–8.5 是修訂後的試行，8.6–8.41 補齊其他題目。驗證相關題目的關係不是必經的 CI 階梯：

```text
指令評估 → 驗證進入點宣告 → CI、local hook 或 runner 的叫用
人工／模型評估 → 對應的評估宣告與交付方式（不要求 CI）
上述評估 → harness.verification-wiring：何時觸發、送入什麼、結果交給誰
有回饋決策的迴圈 → loop.feedback-routing：如何使用結果
```

前一題的設定存在，不會讓後一題自動取得「已在運作」的地位。

所有契約共用 `catalog_version: 0.1.0`，2026-11-04 由使用者核准凍結；欄位名稱沿用 spec 6.1 的草案，欄位或介面變更時再升版。

### 8.0 共用契約規則

以下規則是每題契約的一部分；各題仍明列九項資訊，不以這一節取代逐題的主張、動作或驗收。

- **範圍與結果：** 逐工作範圍先判適用性。有效且無矛盾的不適用證據才給 `not_applicable`；適用性未知先給 `unknown`，獨立觀察仍保留。適用時，全部明定主張成立為 `verified`；有已證實的必要子主張、其餘不足為 `partial`；沒有成立子主張且在完整搜尋範圍有否定依據才為 `missing`；其餘為 `unknown`。未支援、關鍵字、空範本、純檔名不構成已證實子主張。本節的優先順序適用所有逐題描述；局部例子不是另一套互相競爭的判定順序。
- **衝突：** 相反證據不得互相覆寫，衝突主張為 unknown；其他已成立子主張仍可呈現。`partial` 必須列出哪些已知、哪些缺少／未知，不以百分比打分。
- **確認有效性：** 所有 `attestation` 皆須附問題的實質回答、可定位材料與引文、範圍（CLI／工作流程／版本／效果）、證據指紋、時間、確認者、期限及 catalog／adapter 版本。材料改變、範圍不符、版本失效或到期須重確認。未提供材料、單純「有」與 agent 評估不能授予必要能力或完成語意主張。
- **非本機來源：** 使用者可明確提供去敏感的組織規範、外部評估、成本／執行紀錄；不自動越出 repo 讀取，不聯網，不擷取憑證。不支持的 detector 不否定人工途徑。
- **人工題：** `detectors: []` 表示沒有可靠的自動語意 detector，不是漏寫；`inspection.review` 指定人工要核對的內容，`verification.attestation` 指定改善後的確認。agent 可產生附引文的候選，由使用者確認；不能只用關鍵字判定。
- **前置與分級：** `required`、`recommended` 的列表預設各為 all；conditional 的 when 未知不能跳過。缺少能力不禁止觀察題目。每題 `baseline` 的分級與 `when` 已於 2026-11-04 核准；`when: false` 只表示維持進階，不改成不適用。
- **改善安全：** `remediation` 是計畫文字，不由掃描器套用。R-D3 開放 v1 改善 Skill，但任何修改仍須先展示計畫／範本並取得明確核准。`needs_approval: true` 另須滿足該題的角色核准要求；false 不免除 v1 計畫／動作核准。命令執行另依授權，掃描／範本／修改核准都不是執行許可。已選定的工具與位置優先；未知時先產生詢問步驟，不猜指令／權限／檔名。計畫相依由目前缺口產生，不依層數排序。
- **驗收：** `rerun: []` 的人工題改由指定材料與逐項核對驗收，不能用「沒有 detector 失敗」當通過。掃描器不執行測試、hook 或 agent；需要執行證據時由使用者明確提供，標示來源。
- **參考組件：** 本節的 detector／rule card ID 與 version 是設計提案，並非已存在的程式或可執行範本；登錄邊界見第 10 節。各題的 `actions` 是相關規則卡在本題的具體內容。來源縮寫「檢視」「工具研究」「Loop 研究」「spec」分別指本目錄對應文件；gist 引用一律綁定第 5.3 節的 URL、revision 與行號。

**審查紀錄（2026-11-04）：** 使用者授權 Claude 依已核准的 B1–B6 與第 7 節逐題核對 8.1–8.41，只把拿不準的題目提問。核對結果：41 題的 `alternative` 都接受等效既有作法且不強迫新增工具或檔案（B1）；適用性與 baseline 條件逐 CLI／工作流程／迴圈／效果判定，不跨範圍湊證據，未知不當 false（B2）；`verified` 都要求主張與證據對齊，宣告、關鍵字、空範本、agent 意見都不足（B3）；沒有題數、百分比或數量門檻（B4）；能力只在 7.1 登錄表，`prerequisites` 只出現於 8.3（conditional）與 8.4（required），與 7.3 一致（B5）；沒有通用數字、heartbeat、外部驗證器或 runner 要求（B6）。沒有需要使用者決定的題目。工程層面一項待實作時統一、不改政策：8.1–8.5 的 `attestation` 為結構化欄位，8.6–8.41 為單行文字，實作時統一為 8.0「確認有效性」要求的欄位。`catalog_version` 於同日依使用者決定凍結為 0.1.0。

### 8.1 `foundation.verify-entrypoints`

```yaml
id: foundation.verify-entrypoints
item_version: 1
catalog_version: 0.1.0
question: 驗證進入點（測試、lint、型別檢查、build）已宣告，並記錄在專案指引或指定來源
layer: { primary: foundation, related: [harness] }
baseline:
  proposed_tier: baseline
  when: 確認有需要驗證的產出，且所需驗證採用指令
  omission: 無權威進入點會讓 agent 猜測驗證方式
  alternative: 既有 manifest 加簡短指引即可；純人工驗收走對應人工題，不強迫新增指令
applicability:
  applicable: 產出需要指令驗證；文件 repo 也可能有連結檢查、網站產生等驗證
  not_applicable: 確認沒有指令驗證需求，或完全採人工評估並提供理由、範圍與期限
  unknown: 搜尋範圍不完整或讀取失敗
  questions: [哪個指令是權威的驗證進入點？]
inspection:
  inputs:
    - repo 根目錄內已支援的 manifest：package.json scripts、Makefile／justfile／Taskfile target、pyproject 工具設定
    - 各 adapter 已辨識的指引檔
    - 政策檔中宣告的驗證進入點
  missing_input: 沒有選定 CLI 時，仍可讀 manifest 與共用指引；CLI 專屬指引列為待確認
  detectors:
    - manifest.verify-entrypoint@1      # 結構化解析；script 名稱只當候選，不證明用途
    - instructions.verify-entrypoint@1  # 指令區塊；只在對應到已宣告的進入點時採計
    - policy.verify-entrypoint@1
  methods: [static, attested_by_user]
  limits: 不執行；無法證明可以執行或適合用來驗證
evidence_requirements:
  accepted_forms: [text, reusable, config]
  claims:
    declared: verify.entrypoint-declared@1
    documented: verify.entrypoint-documented@1
  verified: 兩個主張都成立，且已記錄的指令對應到已宣告的進入點（或經使用者確認）
  partial: 只有其中一個主張成立
  missing: 在完整且明確的搜尋範圍內兩者都沒有，且使用者確認沒有其他宣告
  unknown: 解析失敗、格式不支援、搜尋範圍不完整，或只有未對應的指令區塊
  not_applicable: 有效的不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: repo-discovery, version: 1 }, { id: verify-before-done, version: 1 }]
  actions:
    - 先詢問權威的驗證進入點；不得猜測
    - 計畫文字：在核心指引加一行，記錄驗證指令與回報方式
  targets: 依選定 CLI 的 adapter；位置未知時列為問題
  risk: low
  needs_approval: false
verification:
  rerun: [manifest.verify-entrypoint@1, instructions.verify-entrypoint@1, policy.verify-entrypoint@1]
  logic: declared 與 documented 都要成立
  expected: 兩個能力判定成立
  attestation:
    question: 哪個指令是權威的驗證進入點？記錄在哪裡？
    requires: [範圍, 證據指紋, catalog 與 adapter 版本, 確認者, 有效期限]
  conflicts: 使用者確認與機器觀察矛盾時，兩者並列，保持待確認
sources:
  - { type: tool_policy, ref: "spec 5.1 工程基礎「驗證指令」", use: 保留題目 }
  - { type: tool_policy, ref: "工具研究 4.3 commands.verify-documented", use: 政策改寫（拆成兩個能力） }
  - { type: practitioner, ref: "gist 83e12fa › Workflow Orchestration › 5. Verification Before \"Done\"（第 94 行）", use: 規則卡沿用 }
  - { type: practitioner, ref: "gist 83e12fa › Repository Discovery Playbook 第 5 步（第 548 行）", use: 規則卡沿用 }
  - { type: practitioner, ref: "Factory Agent Readiness：Style & Validation、Testing（工具研究第 3 節）", use: 政策改寫 }
```

### 8.2 `foundation.ci-verification`

```yaml
id: foundation.ci-verification
item_version: 1
catalog_version: 0.1.0
question: CI 叫用已宣告的驗證進入點；叫用與失敗後果分開回報
layer: { primary: foundation, related: [harness] }
baseline:
  proposed_tier: baseline
  when: 選定工作流程明確由 CI 承擔驗證
  omission: 無法知道 CI 是否叫用指定驗證，而非只做部署或同步
  alternative: 其他流程可使用本機或人工驗證；既有 CI 的一個明確步驟即可
applicability:
  applicable: CI 承擔驗證或被選作驗證目標；CI 存在只是待確認線索
  not_applicable: 使用者確認不使用 CI 驗證，附理由與期限
  unknown: 沒有偵測到 CI，也沒有回答。此時不判定 missing
  questions: [這個專案是否以 CI 驗證變更？]
inspection:
  inputs:
    - adapter 支援的 CI 設定路徑
    - foundation.verify-entrypoints 的觀察結果
  missing_input: 沒有已宣告的進入點時，仍回報 CI 步驟；「是否叫用已宣告的進入點」回報 unknown，計畫先詢問權威指令
  detectors:
    - ci-config-found@1
    - ci.step-invokes-entrypoint@1   # 限定語法：字面 run 步驟。可重用 workflow、動態表達式、遠端 action 列為無法解析
    - ci.failure-consequence@1       # blocking／advisory（如 continue-on-error）／unknown
  methods: [static, attested_by_user]
  limits: 不證明 pipeline 會執行或通過；required check 屬遠端設定，無法觀察
evidence_requirements:
  accepted_forms: [config]
  claims:
    invocation: 每個指定 CI 驗證義務，都有步驟對應其宣告的進入點；不是任一成功步驟代表全部
    consequence: 另外回報，不影響叫用的判定；advisory 是合法的觀察，不是「未設定」
  verified: 全部指定叫用成立；有效人工材料也可補足動態或外部部分
  partial: 至少一項指定叫用已確認，其餘缺少或未知；列出已成立子主張
  missing: CI 驗證適用、搜尋完整，所有指定叫用都無設定且無其他來源
  unknown: 只有驗證關鍵字、未對應步驟、解析失敗或未提供材料的遠端 workflow
  not_applicable: 有效的不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: ci-verify, version: 1 }]
  actions:
    - 計畫文字：在既有 CI 加入執行 {entrypoint} 的步驟
    - 提醒：required check 要在遠端設定
  targets: 既有的 CI 設定；沒有 CI 時不建議新增，改為詢問
  risk: medium
  needs_approval: true
verification:
  rerun: [ci-config-found@1, ci.step-invokes-entrypoint@1, ci.failure-consequence@1]
  logic: invocation 成立；consequence 分開回報
  expected: 全部指定叫用由支援解析或有效人工材料成立；consequence 與遠端 required 狀態另列來源，無充分材料時為 unknown
  attestation:
    question: 哪些 CI 步驟對應哪些驗證義務與指令？提供設定片段；如要主張執行，再附對應版本紀錄
    requires: [範圍, 設定或政策材料位置, 時間, 確認者, 有效期限]
    execution_claim: 只有另行主張已執行時才要求同範圍、版本與時間的執行紀錄；另遵守 8.0 的共同中繼資料要求
  conflicts: 同 8.1
sources:
  - { type: tool_policy, ref: "spec 5.1 工程基礎「CI」", use: 保留題目 }
  - { type: tool_policy, ref: "工具研究 5.3 規則卡示意 ci.step-runs-command", use: 政策改寫（叫用與後果分開） }
  - { type: discussion, ref: "codex-catalog-round1.md B 節", use: 設計理由 }
```

### 8.3 `harness.verification-wiring`

```yaml
id: harness.verification-wiring
item_version: 1
catalog_version: 0.1.0
question: 選定的 agent 工作流程中，驗證怎麼觸發、結果回到哪裡
layer: { primary: harness, related: [foundation, loop] }
baseline:
  proposed_tier: baseline
  when: 選定工作流程的政策要求評估成果
  omission: 不清楚何時評估、評估什麼及結果交給誰
  alternative: 人工交付與簡短規約也可成立，不必安裝 hook 或 CI
applicability:
  applicable: 每個選定 CLI 的 agent 工作流程，逐一評估
  not_applicable: 使用者確認某個工作流程不需要驗證，附理由與期限
  unknown: 沒有選定 CLI，且只有 CLI 專屬的設定
  questions: [專案用哪些 CLI？各工作流程由誰驗收？]
inspection:
  inputs:
    - 選定的 CLI 與 adapter 版本
    - foundation.verify-entrypoints 的觀察結果
    - 政策檔中的工作流程宣告
  missing_input: 缺少 CLI 或指令資訊時保留可讀的人工／共用政策觀察；受影響的接線為 unknown
  detectors:
    - hooks.invokes-entrypoint@1   # 依 adapter；記錄 hook 事件（編輯後、停止前）與指令；以限定語法解析
    - evaluation.model-gate@1      # prompt 型或 agent 型的停止 gate
    - policy.human-evaluation@1    # 政策檔宣告的人工驗收
  methods: [static, attested_by_user, assessed_by_agent]
  limits: hook 是否載入取決於 trust 與使用者、組織設定，無法觀察；一個 hook 不代表整條路徑
evidence_requirements:
  accepted_forms: { command: [text, reusable, config], model: [text, reusable, config], human: [text, reusable, config] }
  claims:
    trigger: 在哪個邊界觸發評估
    input: 被評估的成果、版本與規準引用
    evaluator: 評估者種類，可多值或 unknown
    delivery: 結果送到哪裡（回給 agent、PR、決策者）
  verified: 每個選定工作流程的四個主張都有觀察或有效確認
  partial: 只有部分主張或部分工作流程成立
  missing: 完整搜尋範圍內沒有任何宣告，且使用者確認沒有外部評估
  unknown: 沒有本機宣告也沒有確認時（可能有外部評估）；agent 意見只當候選
  not_applicable: 有效的不適用確認
prerequisites:
  required: []
  recommended: []
  conditional:
    - when: 評估者包含 command，且由 worker 叫用
      required: [verify.entrypoint-declared@1]
      recommended: [verify.entrypoint-documented@1]
remediation:
  rule_cards: [{ id: verify-before-done, version: 1 }]
  actions:
    - 描述各 CLI 的 hook 契約（L-D3：只描述契約，v1 不提供可執行範本；error／timeout 不得視為通過）
    - 或描述人工驗收流程與結果的紀錄位置
    - 指令未知時列為問題
  targets: 依 adapter
  risk: medium
  needs_approval: true
verification:
  rerun: [hooks.invokes-entrypoint@1, evaluation.model-gate@1, policy.human-evaluation@1]
  logic: all；每個工作流程四個主張成立；設定存在不代表實際可用或評估充分
  expected:
    command: 工作流程命令可對應宣告入口；本機、CI、runner 或人工叫用皆可，觸發與結果交付另需宣告
    model: 有模型評估的輸入、規準、觸發與結果交付宣告，不限某家 CLI gate
    human: 政策寫明審查者、輸入規準、何時審查與結果紀錄位置
  attestation:
    question: 這個工作流程的驗證由誰、在何時執行？結果記在哪裡？
    requires: [工作流程範圍, 證據指紋, 版本, 確認者, 有效期限]
  conflicts: 同 8.1
sources:
  - { type: original_item, ref: "H5（檢查表檢視 3.3）", use: 保留題目（改寫） }
  - { type: review_finding, ref: "F-06（檢查表檢視第 6 節）", use: 去重理由 }
  - { type: practitioner, ref: "gist 83e12fa › Workflow Orchestration › 5.（第 94 行）", use: 規則卡沿用 }
  - { type: tool_policy, ref: "spec 6.3 去重表", use: 範圍邊界 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D2、L-D3", use: 約束 }
```

### 8.4 `loop.feedback-routing`

```yaml
id: loop.feedback-routing
item_version: 1
catalog_version: 0.1.0
question: 已宣告的迴圈中，驗證結果如何對應到下一步（繼續、重試、等待、交人、停止）
layer: { primary: loop, related: [harness] }
baseline:
  proposed_tier: baseline
  when: 迴圈在指定邊界使用評估結果決定下一步
  omission: 知道結果卻沒有後續動作，可能無限重試或把錯誤當完成
  alternative: 人工決策表也可，沒有回饋決策需求的單次事件處理不強迫採用
applicability:
  applicable: execution-feedback，或明確依評估結果決策的 event-driven 迴圈
  not_applicable: 使用者確認沒有這類迴圈，且沒有觀察到相反的使用證據
  unknown: 迴圈類型或範圍未知；不得因此略過
  questions: [專案有哪些迴圈？各自在什麼邊界驗證？]
inspection:
  inputs:
    - 政策檔中的迴圈宣告
    - 觀察到的迴圈訊號：loop.trigger@1、loop.stop-gate.command@1、loop.stop-gate.model@1、loop.self-declared@1
  missing_input: 沒有可解析設定時仍讀指定政策或確認材料；只有訊號不推導結果路由
  detectors:
    - loop.routing-declared@1             # 政策檔的結構化對應，或可辨認的 hook 決策分支
    - loop.stop-hook-active-checked@1     # 弱訊號，只當輔助
  methods: [static, attested_by_user, assessed_by_agent]
  limits: 靜態只看得到宣告；每一圈實際怎麼做屬執行期；一個 Stop hook 不代表每一圈
evidence_requirements:
  accepted_forms: [text, config]
  claim: 同一邊界的通過、失敗與無法評估對應到動作／權責；自動機制另區分錯誤、逾時、取消，人工流程可用等待／無法判定；不適用分支附理由
  verified: all；適用的結果類別皆有對應，且錯誤／逾時不冒充 pass；例外接受另記授權與證據缺漏
  partial: 有已確認的結果對應，但部分適用分支或權責缺少／未知
  missing: 迴圈適用、完整搜尋範圍內沒有對應，且使用者確認沒有
  unknown: 迴圈設定在 repo 外（雲端、IDE）且沒有確認；或只有 agent 意見
  not_applicable: 有效的不適用確認
prerequisites:
  required:
    - capability: evaluation.config-declared@1
      scope: 同一迴圈中本題涵蓋的評估邊界、成果／輸入範圍與評估者；多個必要邊界逐一成立，不得以另一邊界替代
      note: 評估者種類需符合該迴圈的驗收政策
  recommended: [evaluation.run-recorded@1]
remediation:
  rule_cards:
    - { id: stop-the-line, version: 1 }
    - { id: incremental-delivery, version: 1 }
    - { id: bugfix-workflow, version: 1 }
  actions:
    - 為每個迴圈寫下「結果 → 動作」表
    - 描述 Stop hook 契約：錯誤與逾時不算驗證通過；可停止或交人，依政策例外接受須另記，不要求永遠阻擋退出
  targets: 政策檔或迴圈的設定位置；未知時列為問題
  risk: medium
  needs_approval: true
verification:
  rerun: [loop.routing-declared@1, loop.stop-gate.command@1, loop.stop-gate.model@1]
  logic: 每個適用的迴圈都要成立
  expected: 每個適用的結果類別都有對應動作與權責；不適用的分支附理由
  attestation:
    question: 這個迴圈在驗證失敗、錯誤、逾時時分別做什麼？由誰決定？記錄在哪裡？
    requires: [迴圈範圍, 證據指紋, 版本, 確認者, 有效期限]
  conflicts: 同 8.1
sources:
  - { type: original_item, ref: "L2（檢查表檢視 3.3）", use: 保留題目（改寫） }
  - { type: review_finding, ref: "F-06", use: 去重理由 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D2、L-D3、L-D5", use: 約束 }
  - { type: practitioner, ref: "gist 83e12fa › WO3（第 64 行）、WO7（第 123 行）、Error Handling 1–2（第 290、303 行）", use: 規則卡沿用 }
```

### 8.5 `context.instruction-authority`

```yaml
id: context.instruction-authority
item_version: 1
catalog_version: 0.1.0
question: 每個選定 CLI、每個範圍，哪個指引具權威、優先順序如何；已知衝突如何處理
layer: { primary: context, related: [prompt] }
baseline:
  proposed_tier: baseline
  when: 選定 CLI 的工作範圍已確認需要指引權威與優先順序約定；不以現有指引是否存在或已載入為條件
  omission: 不清楚應遵從哪份規範，衝突可能被默默忽略
  alternative: 一份已指定的短指引即可，不要求跨 CLI 同檔或額外索引
applicability:
  applicable: 使用 agent 的專案
  not_applicable: 使用者確認不使用 agent
  unknown: 沒有選定 CLI 時，逐 CLI 的分析列為待確認
  questions: [專案用哪些 CLI？是否有放在 repo 外的使用者或組織層級指引？]
inspection:
  inputs:
    - 選定的 CLI 與 adapter 版本
    - adapter 搜尋路徑內找到的指引檔
    - 匯入與投影關係：@AGENTS.md、root 內的 symlink、產生的副本
  out_of_scope: 使用者與組織層級的設定（無法觀察）
  missing_input: repo 外來源僅收明確提供的材料；未選 CLI 不妨礙列出本機指引，但優先順序未知
  detectors:
    - instruction-file-found@1
    - instructions.import-topology@1     # 明確匯入、位元組相同的副本、root 內的 symlink
    - instructions.precedence-model@1    # 依 adapter 記載的優先順序算出結果，標示為 adapter 假設
    - context-size-reported@1            # 僅大小資訊；產品截斷限制待 adapter 版本核對
  methods: [static, assessed_by_agent, attested_by_user]
  limits: 無法以靜態方式判定「任何地方都沒有矛盾」
evidence_requirements:
  accepted_forms: [text, reusable]
  claims:
    authority: 每個選定 CLI 的權威來源與優先順序可由支援解析或有效確認辨識
    conflicts: agent 列出附引文的候選衝突；由使用者處理或確認
  verified: authority 對每個選定 CLI 成立，且候選衝突經使用者處理後沒有未解決的項目（附證據指紋）
  partial: authority 只對部分 CLI 成立，或有未解決的候選衝突
  missing: 本次判定範圍內所有必要子主張均未成立，且完整搜尋與有效否定證據支持缺少；多 CLI 分別判定，有成立子主張的彙總依 8.0 為 partial
  unknown: 必要權威主張無法由支援解析或有效確認成立；外部位置、不支援版本與解析失敗保留為診斷，不單獨否定允許的確認途徑
  not_applicable: 有效的不適用確認
  nonlocal: 使用者可以確認權威指引位於 repo 外，記錄為使用者確認並寫明範圍
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: agents-md-core, version: 1 }]
  actions:
    - 指定權威來源
    - 依各 CLI 的 adapter 描述接法，例如在 CLAUDE.md 中匯入 AGENTS.md（工具研究 8.2）
    - 列出候選衝突請使用者決定
  targets: 依 adapter
  risk: low
  needs_approval: false
verification:
  rerun: [instruction-file-found@1, instructions.import-topology@1, instructions.precedence-model@1]
  logic: authority 對所有選定 CLI 成立，且沒有未解決的候選衝突
  expected: 權威來源與優先順序有範圍依據；已知候選衝突已處理，不宣稱任何地方都沒有衝突
  agent_review: 重新列出候選衝突，只當候選
  attestation:
    question: 哪份指引具權威？列出的候選衝突是否成立、如何處理？
    requires: [檔案範圍與雜湊, catalog 與 adapter 版本, 確認者, 有效期限]
    invalidated_by: 依據的檔案改變、catalog 或 adapter 改版、到期
  conflicts: 機器觀察到的相反事實不會被確認覆寫；兩者並列並保持待確認
sources:
  - { type: original_item, ref: "P1（檢查表檢視 3.3）", use: 保留題目（改寫） }
  - { type: review_finding, ref: "F-04", use: 移層理由 }
  - { type: vendor_doc, ref: "工具研究第 6 節、8.2（三家 CLI 的指引載入方式）", use: adapter 假設 }
  - { type: research, ref: "Dos Santos et al. arXiv:2606.15828：Conflicting Instructions（工具研究 5.2）", use: 衝突評估的依據 }
```

### 8.6 `foundation.automated-tests`

```yaml
id: foundation.automated-tests
item_version: 1
catalog_version: 0.1.0
question: 指定程式範圍是否有自動化測試案例與對應的執行方式
layer: { primary: foundation, related: [] }
baseline: { proposed_tier: baseline, when: 可測試的程式且政策選定自動化回歸為基本驗證, omission: 缺少可反覆檢查行為的依據, alternative: 可用語言原生 runner 或既有小型測試，不要求第三方框架 }
applicability:
  applicable: 有待驗證程式行為，或使用者選擇增加自動化回歸
  not_applicable: 確認範圍無程式行為或只採其他合理驗證，附理由
  unknown: 程式範圍或驗證目標未確認；不支援語言不是不適用
  questions: [哪些行為要靠自動化回歸確認？是否已有原生 runner 或外部測試？]
inspection:
  inputs: [宣告的程式範圍, 測試設定與案例, manifest 或指定執行說明]
  missing_input: 缺設定時仍列出案例；原生 runner 可由確認材料辨識
  detectors: [tests.structure@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 核對案例中的實際斷言與執行入口，不以 test 目錄或套件名稱單獨判定
  limits: 不跑測試，不宣稱涵蓋率、測試品質或目前通過
evidence_requirements:
  accepted_forms: [reusable, config]
  verified: all；有至少一個與目標行為相關的非空案例，且執行方式可對應；語意關聯需有效確認
  partial: 已確認案例或入口其中一項，其餘不足
  missing: 適用範圍搜尋完整且確認沒有任何案例或外部測試
  unknown: 只有套件／檔名訊號、語法不支援且無有效材料
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: testing-strategy, version: 1 }]
  actions: [沿用原生或既有 runner，為一個代表行為規劃最小測試, 指認預期失敗與成功訊號，避免只測常數或工具本身]
  targets: 專案既有測試位置；未知時先詢問
  risk: medium
  needs_approval: true
verification:
  rerun: [tests.structure@1]
  logic: all；案例與入口都可定位，對應同一行為範圍
  expected: 案例有實質斷言及可追溯入口；未執行仍標示未執行
  attestation: 請指出哪個案例覆蓋哪個行為、如何執行；若宣稱改善有效，附修改前後紀錄及版本
sources:
  - { type: tool_policy, ref: "spec 5.1 測試；本文件 5.4 Factory Testing 映射", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L375–389 Testing Strategy", use: 規則卡沿用 }
```

### 8.7 `foundation.static-analysis`

```yaml
id: foundation.static-analysis
item_version: 1
catalog_version: 0.1.0
question: 指定程式範圍是否有非純排版的靜態分析設定與入口
layer: { primary: foundation, related: [harness] }
baseline: { proposed_tier: baseline, when: 程式範圍的驗證政策需要靜態分析, omission: 無法依已選規範檢查語法型別或規則錯誤, alternative: 語言原生編譯／分析即可，不要求額外 lint 套件 }
applicability:
  applicable: 有程式碼且存在對應的分析需求
  not_applicable: 確認沒有此需求或適當工具，附替代驗證與理由
  unknown: 語言、目標或設定格式未支援且未提供確認
  questions: [哪些分析規則適用？使用 lint、型別檢查還是語言原生工具？]
inspection:
  inputs: [語言與模組範圍, lint／型別或編譯設定, 指令宣告]
  missing_input: 無設定檔不否定原生預設，請確認工具與版本預設
  detectors: [analysis.config@1]
  methods: [static, attested_by_user]
  review: 核對工具、分析目標、規則或預設引用與執行方式
  limits: formatter 單獨不足；不推論所有不變量已強制或 CI 會阻擋
evidence_requirements:
  accepted_forms: [text, config, reusable]
  text_path: 文字須指明工具與版本、目標、非純排版規則或預設依據及入口；工具名稱或泛稱預設不足
  verified: all；分析工具與目標、非純排版規則／預設、入口均有依據
  partial: 有分析設定與範圍，但規則或入口尚缺
  missing: 完整範圍內只有排版或無分析設定，並已確認無外部設定
  unknown: 僅套件名稱、動態設定不可讀或無法確認預設
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: static-analysis, version: 1 }]
  actions:
    - 先採既有工具與規則集，記錄適用目標與入口，不把所有文字規範自動翻成 lint
    - 適用時於輸入邊界驗證資料，並使用既有型別或模型表達不變量；此為選用改善指引，不增加 verified 條件，也不證明分析設定已強制不變量
  targets: 既有分析設定與驗證說明
  risk: medium
  needs_approval: true
verification:
  rerun: [analysis.config@1]
  logic: all；工具、範圍、分析內容與入口一致
  expected: 可確認分析設定，不宣稱程式已通過分析
  attestation: 請指出分析哪些錯誤、排除哪些路徑與如何執行；若採原生預設，附工具版本與依據
sources:
  - { type: tool_policy, ref: "spec 5.1 lint；本文件 5.4 Style & Validation", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L390–401 Type Safety and Invariants", use: 規則卡沿用，設定不證明不變量生效 }
```

### 8.8 `foundation.dev-environment`

```yaml
id: foundation.dev-environment
item_version: 1
catalog_version: 0.1.0
question: 開發環境、相依、必要服務與 build 方式是否有可對應的宣告
layer: { primary: foundation, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 新加入者可能猜測環境，但不據此自動阻擋所有面向, alternative: README 的簡短設定步驟可取代 devcontainer 或特定 lockfile }
applicability:
  applicable: 工作需要本機工具鏈、相依或 build
  not_applicable: 確認只編輯不需工具鏈的內容，沒有環境需求
  unknown: 目標環境或遠端開發方式未說明
  questions: [在哪裡開發？需哪些版本、服務與設定？是否真的有 build 步驟？]
inspection:
  inputs: [工具鏈宣告, manifest 與 lockfile, 設定／build 文件, 明確提供的環境說明]
  missing_input: lockfile 不存在時仍核對替代相依管理；不得讀取秘密值
  detectors: [environment.declarations@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 對應必要版本、相依安裝方式、服務與設定鍵名稱、build 或不需 build 的理由
  limits: lockfile 或容器檔不能證明環境可重現，不安裝或建置
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；該環境適用的設定與 build 項目完整且有來源對應
  partial: 已有相依或版本宣告，但設定步驟或必要服務未說明
  missing: 範圍完整且確認沒有環境宣告或設定說明
  unknown: 僅檔名訊號、外部環境無材料或必要設定存在矛盾
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: dependency-discipline, version: 1 }]
  actions: [補上現有環境的最短設定步驟與必要版本, 說明 build 或免 build 理由與設定鍵，不記錄憑證值]
  targets: 現有 README／CONTRIBUTING 或指定開發文件
  risk: low
  needs_approval: false
verification:
  rerun: [environment.declarations@1]
  logic: all；逐項核對適用的環境需求與文件對應
  expected: 設定與 build 方式可定位；不額外聲稱已重現環境
  attestation: 請按步驟指出工具版本、相依來源、服務與 build 方式；若聲稱可重現，附同版本的實際紀錄
sources:
  - { type: tool_policy, ref: "spec 5.1 開發環境與基本文件；本文件 5.4 Build System", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L402–413 Dependency Discipline；L159–170 Task Management Additions", use: 規則卡沿用 }
```

### 8.9 `foundation.security-signals`

```yaml
id: foundation.security-signals
item_version: 1
catalog_version: 0.1.0
question: 選定的安全控制目標是否有對應設定、處置責任與證據邊界
layer: { primary: foundation, related: [harness] }
baseline: { proposed_tier: advanced, when: false, omission: 不清楚已有安全控制涵蓋什麼；不把此窄題當安全基線, alternative: 可沿用外部治理與既有工具，不要求所有工具同時存在 }
applicability:
  applicable: 已選定秘密偵測、相依更新或其他明確安全設定作為觀察目標
  not_applicable: 附理由確認沒有本題涵蓋的控制需求；不代表沒有安全風險
  unknown: 未選控制目標，或控制在外部而無資料
  questions: [要核對哪些安全控制？由誰處理告警？哪些控制位於平台而非 repo？]
inspection:
  inputs: [選定控制清單, 相關設定, 去敏感的外部政策材料]
  missing_input: 只報告可讀設定與未知，不掃描或輸出秘密值
  detectors: [security.config-signals@1]
  methods: [static, attested_by_user]
  review: 逐控制核對範圍、設定引用與發現後的負責人／處置方式
  limits: 不做漏洞掃描，不判定沒有秘密或程式安全
evidence_requirements:
  accepted_forms: [text, config]
  verified: all；選定控制各有設定依據、範圍與處置責任
  partial: 至少一項控制有明確設定，但其他項或責任未定
  missing: 完整搜尋及有效確認均無選定控制的配置
  unknown: 只見工具名稱、平台設定看不到且無確認，或控制目標未定
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: security-privacy, version: 1 }]
  actions: [先盤點既有控制與缺口，再提出專案需要的措施, 記錄告警處理責任，不假設新增工具便完成安全治理]
  targets: 指定安全政策與既有工具設定
  risk: medium
  needs_approval: true
verification:
  rerun: [security.config-signals@1]
  logic: all；只核對選定控制的宣告與責任
  expected: 每項附範圍證據與未知；沒有安全總分或無漏洞保證
  attestation: 請提供去敏感的設定片段、涵蓋範圍與處理流程；平台控制需指明來源與有效時間
sources:
  - { type: practitioner, ref: "gist 83e12fa:L414–430 Security and Privacy", use: 規則卡沿用 }
  - { type: tool_policy, ref: "本文件 5.4 Factory Security 映射", use: 政策改寫為有限設定主張 }
```

### 8.10 `prompt.task-spec`

```yaml
id: prompt.task-spec
item_version: 1
catalog_version: 0.1.0
question: 委託任務是否有目標、範圍、限制與驗收條件的明確約定
layer: { primary: prompt, related: [loop] }
baseline: { proposed_tier: baseline, when: agent 接受工作委託, omission: 工作者不知道要完成什麼或哪些行為不能改, alternative: 一段清楚的任務說明或既有慣例即可，不要求範本系統 }
applicability:
  applicable: 以 agent 執行專案任務
  not_applicable: 確認此範圍不委託 agent 工作
  unknown: 未提供任務慣例或代表任務，不能猜測任務需求
  questions: [任務通常在哪裡描述？什麼算完成？哪些部分不在範圍內？]
inspection:
  inputs: [權威任務慣例, 代表任務或已填寫範本, 驗收條件引用]
  missing_input: 無範本仍可審閱明確提供的任務說明；沒有語意材料則待確認
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 逐項核對目標、限制、範圍／排除與可判定的驗收條件；模糊處列為問題
  limits: 空範本只代表結構，不證明委託完整；本題不決定誰有接受權
evidence_requirements:
  accepted_forms: [text, reusable]
  verified: all；指定慣例或任務清楚交代四項內容，或明確規定缺項時先澄清，並經有效確認
  partial: 已確認部分內容，其餘未定或相互矛盾
  missing: 指定委託範圍內無任何約定且已確認
  unknown: 只有空欄位、關鍵字、agent 推測或無代表材料
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: plan-before-act, version: 1 }, { id: definition-of-done, version: 1 }]
  actions: [在既有任務入口補上目標、範圍與驗收條件, 只有歧義會影響實作時才要求釐清或範例，不一律加長提示詞]
  targets: 任務入口、工作慣例或既有範本
  risk: low
  needs_approval: false
verification:
  rerun: []
  logic: all；人工逐項核對四項約定與一個代表用例，沒有未解決的關鍵歧義
  expected: 每項都能指向具體文字，不宣稱所有未來任務會遵從
  attestation: 請指出代表任務的目標、不能改的部分與可驗收結果；沒有的項目會如何澄清？
sources:
  - { type: review_finding, ref: "檢視 F-04、F-09 與第 8 節 Prompt 提案", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L27–46 WO1；L143–170 Task Management；L202–210 State Assumptions；L483–502 DoD", use: 規則卡沿用 }
```

### 8.11 `prompt.output-contract`

```yaml
id: prompt.output-contract
item_version: 1
catalog_version: 0.1.0
question: 成果輸出與驗證回報的內容、使用者和未執行項目是否有約定
layer: { primary: prompt, related: [] }
baseline: { proposed_tier: baseline, when: agent 需要交付成果或交接報告, omission: 接收者無法分辨完成事項與未驗證的聲明, alternative: 簡短文字即可，只有機器消費時才需要結構化格式 }
applicability:
  applicable: agent 有人或系統要接收的產出
  not_applicable: 確認該範圍沒有交付需求
  unknown: 接收者或交付用途不清楚
  questions: [誰消費輸出？需要什麼格式？如何回報未跑的驗證與原因？]
inspection:
  inputs: [輸出慣例或範本, 接收者需求, 明確提供的代表回報]
  missing_input: 無機器 schema 不代表缺少；可審閱文字約定
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對成果摘要、定位、驗證範圍／結果、未執行項目與原因；需要時有後續驗證方式
  limits: 格式符合不代表內容正確；不得從回報聲稱推論實際執行
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；接收方式與必要內容已宣告，明確區分已驗證與未驗證
  partial: 輸出格式已定，但未執行或驗證範圍的回報規則不完整
  missing: 完整指定範圍內沒有交付約定且經確認
  unknown: 只有漂亮範例無來源／範圍，或只有 agent 斷言
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: verification-story, version: 1 }, { id: git-hygiene, version: 1 }]
  actions: [沿用接收者格式，加上變更與證據的位置, 列出未跑項目、原因與適用的後續步驟；有風險或基線比較需求時附對應說明]
  targets: 指引、PR／交接範本或輸出 schema
  risk: low
  needs_approval: false
verification:
  rerun: []
  logic: all；用成功與無法驗證兩種回報核對約定，不能把 skipped 當 pass
  expected: 兩種回報皆能辨識範圍、來源與未完成驗證
  attestation: 請提供可接受與不可接受的回報例子，說明哪些欄位必須呈現、何時可省略
sources:
  - { type: original_item, ref: "檢視 3.3 P4", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L94–110 No silent skips；L211–222 Verification Story；L457–480 Git Hygiene", use: 規則卡沿用 }
```

### 8.12 `prompt.plan-for-nontrivial`

```yaml
id: prompt.plan-for-nontrivial
item_version: 1
catalog_version: 0.1.0
question: 非小型任務是否有先規劃、驗證與依新資訊重規劃的約定
layer: { primary: prompt, related: [loop] }
baseline: { proposed_tier: advanced, when: false, omission: 複雜工作可能缺乏順序與驗證規劃，不強迫所有小修改寫計畫, alternative: 現有 issue 清單或短計畫可取代固定 plan mode }
applicability:
  applicable: 專案確認有跨範圍、多步驟或高影響任務
  not_applicable: 評估範圍僅含簡單且無需預先規劃的工作，附理由
  unknown: 未定義何時需要規劃
  questions: [哪些任務必須先規劃？計畫失效時如何停下調整？]
inspection:
  inputs: [規劃慣例, 已填寫的計畫或代表案例, 任務驗收條件]
  missing_input: 沒有範本時可讀既有計畫與約定；空範本只作候選
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對啟用條件、工作切分、驗證步驟與改變假設後的處置
  limits: 不要求固定三步或特定 CLI 模式；計畫存在不代表遵從
evidence_requirements:
  accepted_forms: [text, reusable]
  verified: all；適用條件、切分、驗證與重規劃約定均明確並有代表材料
  partial: 已有具體步驟但缺驗證或失效處置
  missing: 確認有非小型任務，且完整材料中無規劃約定
  unknown: 只有範本標題或未確認的適用條件
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: plan-before-act, version: 1 }, { id: plan-template, version: 1 }]
  actions: [依專案風險定義何時先計畫, 將驗證安排進步驟；必要時加風險與復原說明，不普遍擴大流程]
  targets: 既有任務追蹤、規劃慣例或範本
  risk: low
  needs_approval: false
verification:
  rerun: []
  logic: all；對一個非小型任務核對步驟、驗證、假設失效後的更新方法
  expected: 計畫可對應任務目標；小任務不被無理由套用
  attestation: 請用代表任務說明何時啟用計畫、如何驗證、什麼情況要改計畫
sources:
  - { type: review_finding, ref: "檢視第 8 節 Prompt 大任務拆解", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L27–46 WO1；L505–522 Plan Template", use: 規則卡沿用 }
```

### 8.13 `context.index-to-details`

```yaml
id: context.index-to-details
item_version: 1
catalog_version: 0.1.0
question: 分散的必要專案知識是否有可用的導航與細節來源
layer: { primary: context, related: [] }
baseline: { proposed_tier: baseline, when: 必要知識分散且 agent 需要依導航取用, omission: 找不到任務需要的權威細節, alternative: 既有 README 連結或目錄足夠即可，不另造索引檔 }
applicability:
  applicable: 必要規範、架構或操作知識分散於多處
  not_applicable: 一份短指引已涵蓋必要內容且經確認
  unknown: 不清楚哪些知識必要或外部知識無材料
  questions: [agent 必須找到哪些細節？現有導航是否足夠？]
inspection:
  inputs: [權威指引或指定入口, 必要知識清單, 連結目的地或提供的外部材料]
  missing_input: 不自行抓外部 URL；目的地不可讀時保留位置與未知
  detectors: [documents.local-links@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 逐必要主題核對入口、連結與目的地內容；概覽有定位用途時可保留
  limits: 連結可解析不代表內容正確或 agent 已讀取
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；每個指定必要主題都有可定位細節，入口與主題對應經確認
  partial: 部分主題可找到，其他必要主題缺路徑或目的地未知
  missing: 完整範圍內沒有通往任何必要分散知識的導航且已確認
  unknown: 只有索引標題、必要主題未定或遠端來源未提供
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: repo-discovery, version: 1 }]
  actions: [在既有入口加入少量主題到細節的連結, 修復失效路徑，保留有用途的概覽，不複製整份細節]
  targets: 現有指引或 README
  risk: low
  needs_approval: false
verification:
  rerun: [documents.local-links@1]
  logic: all；逐指定主題核對可定位來源與有效性
  expected: 路徑可解析或有有效外部材料，不以檔案數量衡量完整性
  attestation: 請示範從入口找到各必要主題的來源，確認內容仍適用於目前版本
sources:
  - { type: original_item, ref: "檢視 3.3 C1", use: 保留題目並限定適用性 }
  - { type: practitioner, ref: "gist 83e12fa:L548–565 Repository Discovery Playbook", use: 規則卡沿用 }
```

### 8.14 `context.just-in-time`

```yaml
id: context.just-in-time
item_version: 1
catalog_version: 0.1.0
question: 依路徑或工作情境提供規範的選擇規則是否有宣告
layer: { primary: context, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 容易載入不相關或漏掉情境規範，不強迫所有 repo 做動態載入, alternative: 清楚的人工選用規則也可，不要求特定 skills 機制 }
applicability:
  applicable: 不同路徑或情境需要不同規範
  not_applicable: 確認共用短指引足夠，沒有條件式取用需求
  unknown: 規範範圍、CLI 或適用情境未定
  questions: [哪些規範只適用特定路徑？由誰在何時選用？]
inspection:
  inputs: [選定 CLI 的規則來源, 路徑／情境對應, skill 或指引的用途說明]
  missing_input: 未支援自動載入格式時可核對人工選用宣告；不能猜測預設載入
  detectors: [instructions.scoping@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 對應情境、來源、選用時機與重疊規則的處理
  limits: 本題只核對選擇宣告，執行時是否載入另需紀錄
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；適用情境與對應來源、時機、重疊處理均有依據
  partial: 已知部分路徑／情境對應，其他必要情境未說明
  missing: 確認有需求且完整範圍無選用宣告
  unknown: 只有規則檔／skill 名稱或 adapter 無法辨識語法
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: contextual-rules, version: 1 }]
  actions: [為不同情境寫明何時取用哪份規範, 依已選 CLI 提出設定建議；未知格式先列待確認，不自動安裝]
  targets: 指定指引、skill 或 adapter 支援的規則來源
  risk: medium
  needs_approval: true
verification:
  rerun: [instructions.scoping@1]
  logic: all；取一個命中與一個不命中的情境，核對宣告的選用結果
  expected: 能說明應選哪份規範及衝突處理，不宣稱 runtime 已載入
  attestation: 請指出兩種情境的選用依據；若主張已自動載入，另附同 CLI 版本的紀錄
sources:
  - { type: original_item, ref: "檢視 3.3 C2", use: 政策改寫為可觀察的選擇宣告 }
  - { type: tool_policy, ref: "spec 第 7 節 CLI 支援契約", use: 產品與版本邊界 }
```

### 8.15 `context.reusable-workflows`

```yaml
id: context.reusable-workflows
item_version: 1
catalog_version: 0.1.0
question: 已確認的重複工作是否有可取用且相關的作法
layer: { primary: context, related: [prompt] }
baseline: { proposed_tier: advanced, when: false, omission: 重複探索可能耗時或不一致，但不因沒有 skill 就判基礎不足, alternative: 簡短程序、腳本、範本或 skill 皆可 }
applicability:
  applicable: 有經確認會重複出現的工作
  not_applicable: 目前範圍沒有重複工作，附理由或起步階段說明
  unknown: 只有工具或檔案，無重複工作的依據
  questions: [哪項工作反覆發生？現有作法放在哪裡、何時取用？]
inspection:
  inputs: [重複任務類型與代表材料, 程序／腳本／skill, 取用規則]
  missing_input: 缺少 skill 可看文字流程；沒有重複任務證據先詢問
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對任務、步驟、輸入／輸出、驗證與取用方式的關聯
  limits: 不以 skill 數量代表流程品質，不執行腳本
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；至少一項指定重複工作有相關作法，且每個選定目標皆有步驟與取用說明
  partial: 已有相關步驟，但部分目標或驗證／取用方式未明
  missing: 重複工作已確認且完整範圍沒有對應作法
  unknown: 只有可重用檔名、無任務關聯或有效確認
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: reusable-workflow, version: 1 }, { id: bugfix-workflow, version: 1 }]
  actions: [挑一個有證據的重複工作，沿用成功步驟整理短流程, 寫明何時適用及如何驗證，不為湊數新增 skill]
  targets: 專案已選的 skill、腳本或流程文件位置
  risk: low
  needs_approval: false
verification:
  rerun: []
  logic: all；對照代表任務，逐項確認作法與輸入輸出及驗證相關
  expected: 可指出可重用部分與例外，不聲稱已提升成功率
  attestation: 請用一個代表任務說明如何選用流程、哪些步驟可重用、何時不適合
sources:
  - { type: original_item, ref: "檢視 3.3 P2；F-04", use: 保留題目並移層 }
  - { type: practitioner, ref: "gist 83e12fa:L123–140 WO7；L523–545 Bugfix Template", use: 可選規則卡，不強制採用 }
```

### 8.16 `context.lessons-store`

```yaml
id: context.lessons-store
item_version: 1
catalog_version: 0.1.0
question: 經驗是否有選定的保存、取用與保留範圍
layer: { primary: context, related: [loop] }
baseline: { proposed_tier: advanced, when: false, omission: 經驗可能無法再找到，但不把記錄存在當成已改進, alternative: repo 文件、issue、平台記憶等皆可，固定 lessons 檔非必要 }
applicability:
  applicable: 希望在任務間保留經驗或已採用此作法
  not_applicable: 確認不需持久經驗保存，並說明替代安排或理由
  unknown: 保存政策或是否使用平台記憶未定
  questions: [經驗存哪裡？誰可以讀？何時回看？是否要 commit？]
inspection:
  inputs: [保存與取用宣告, 既有紀錄或新專案的空庫政策, 版本控制／平台保存說明]
  missing_input: 沒有歷史紀錄不判缺少；外部記憶可附有效確認
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對保存位置、進入規則、取用時機、維護責任與敏感內容限制
  limits: 有 lessons 不證明防止重犯；不自動寫入平台記憶
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；保存與取用機制有明確宣告；新專案可沒有歷史項目
  partial: 有已知保存位置，但取用、保留或維護方式不完整
  missing: 已確認採用且完整範圍無任何機制
  unknown: 只有檔名或無法確認外部保存與權限
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: lessons-file, version: 1 }]
  actions: [依專案選定保存機制與取用時機, 建議 lessons commit、todo ignore，但尊重專案選擇與敏感資訊界線]
  targets: 選定的經驗保存來源，未選時先詢問
  risk: low
  needs_approval: false
verification:
  rerun: []
  logic: all；核對保存位置、可見範圍、取用與保留政策
  expected: 可從宣告定位經驗入口；不以紀錄數或固定檔名驗收
  attestation: 請說明如何存入與取用一條經驗，以及哪些資訊不能保存；新專案確認預定機制即可
sources:
  - { type: original_item, ref: "檢視 3.3 C3", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L78–93 WO4", use: 規則卡沿用 }
  - { type: user_decision, ref: "spec 第 3 節 D5", use: 不強制保存位置 }
```

### 8.17 `context.instruction-hygiene`

```yaml
id: context.instruction-hygiene
item_version: 1
catalog_version: 0.1.0
question: 指引內容是否與工作相關，重複、概覽與規則提醒是否有明確用途
layer: { primary: context, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 無關或冗餘文字增加理解負擔，但不能按字數認定無效, alternative: 保留必要的短概覽或重點提醒，不一律刪標準規則 }
applicability:
  applicable: 有專案提供的指引內容
  not_applicable: 確認沒有此範圍的指引；是否需要指引由 authority 題處理
  unknown: 指引來源不全或用途不明
  questions: [哪些內容影響工作？哪些與工具已檢查規則重複？重複是否刻意？]
inspection:
  inputs: [指定指引集合, 任務類型, 可供對照的工具規則]
  missing_input: 沒有工具規則時不推論 lint 重複；僅評估已提供內容
  detectors: [context-size-reported@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 對候選冗餘或無關段落逐一引文，請使用者確認保留、改寫或刪除理由
  limits: 大小是資訊，不設字數門檻；研究關聯不是每個專案的因果保證
evidence_requirements:
  accepted_forms: [text, reusable]
  verified: all；選定範圍的候選問題經逐項處理，保留內容有任務或治理用途
  partial: 有已確認的處理，但仍有未解候選問題
  missing: 完整評估中沒有任何內容符合選定用途，且有效確認支持此結論
  unknown: 無用途對照或只有長度／agent 主觀評語
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: instruction-curation, version: 1 }]
  actions: [逐段刪改經確認無用的內容，不全面移除概覽, 將長細節移至可定位來源，保留必要提醒與出處]
  targets: 被評估的指引段落
  risk: low
  needs_approval: true
verification:
  rerun: [context-size-reported@1]
  logic: all；重新核對候選問題清單及保留理由，長度變短不是驗收條件
  expected: 無未處理的已確認冗餘，重要約束與來源未被刪失
  attestation: 請確認哪些段落要保留及用途，哪些問題已處理；不作全域無冗餘保證
sources:
  - { type: review_finding, ref: "檢視第 8 節 Context 精簡提案", use: 政策改寫為相關性而非禁止概覽 }
  - { type: research, ref: "工具研究 5.2 Gloaguen、Dos Santos：Lint Leakage／Context Bloat", use: 評估理由，不當通用門檻 }
```

### 8.18 `context.maintenance`

```yaml
id: context.maintenance
item_version: 1
catalog_version: 0.1.0
question: 指引與工作摘要是否有更新責任、觸發時機與過期內容處置
layer: { primary: context, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 文件變動後可能保留失效指令或假設，不以修改日期單獨判斷, alternative: 一個責任者與變更觸發約定即可，不要求定期排程 }
applicability:
  applicable: 有會持續使用的指引、索引或工作摘要
  not_applicable: 確認只是一次性材料，不需要後續維護
  unknown: 材料生命週期或維護責任未定
  questions: [誰更新規範？程式或工具改版時怎麼知道要更新？過期內容怎麼處理？]
inspection:
  inputs: [維護約定, 指引與摘要, 已知變更或失效連結]
  missing_input: 沒有歷史更新不等於無維護機制；新專案可檢查宣告
  detectors: [documents.local-links@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 核對責任者、觸發事件、更新／移除與原始證據連結保留方式
  limits: 不以檔案年齡推論過期，不要求自動排程
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；責任、觸發與處置明確，已確認的失效項已處理或具有效範圍說明
  partial: 有負責人但更新觸發或已知失效處置不足
  missing: 完整材料與確認均沒有維護安排
  unknown: 只見最近 commit 或日期，無法確認內容有效性
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: instruction-maintenance, version: 1 }, { id: todo-file, version: 1 }]
  actions: [指定維護責任與相關變更時的檢查點, 整理工作摘要但保留必要原始證據定位，修正已知失效來源]
  targets: 指引維護約定與被標示過期的內容
  risk: low
  needs_approval: false
verification:
  rerun: [documents.local-links@1]
  logic: all；核對宣告並逐筆確認已知失效項，非追求全部連結都在本機
  expected: 有更新與過期處置依據，外部不可查部分保留未知
  attestation: 請用一個規範改動例子說明誰更新、何時更新、如何保留依據
sources:
  - { type: review_finding, ref: "檢視第 8 節 Context 過期文件提案", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L249–260 Keep a Working Memory", use: 規則卡沿用 }
```

### 8.19 `context.code-navigation`

```yaml
id: context.code-navigation
item_version: 1
catalog_version: 0.1.0
question: agent 是否有在指定程式範圍定位符號與關係的可用方法
layer: { primary: context, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 可能反覆讀整檔才能找關係，但不強迫安裝 LSP 或索引服務, alternative: 小專案的精準搜尋與局部閱讀也可滿足目標 }
applicability:
  applicable: 需要理解程式結構與關聯
  not_applicable: 確認沒有程式結構查詢需求
  unknown: agent 可用工具或程式範圍未明
  questions: [如何定位定義、使用處與相關測試？是否能提供代表查詢結果？]
inspection:
  inputs: [可用查詢方式說明, 指定符號與路徑, 明確提供的查詢紀錄]
  missing_input: 有工具設定但無結果時只保留設定訊號，不能說查得到
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對查詢方法、可見範圍、符號定位與關係結果是否對應目前版本
  limits: 掃描器不啟動 LSP／MCP；一個樣本不保證所有符號都能查到
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；已指定方法與範圍，且有可對應版本的定義／使用或測試定位樣本
  partial: 方法與範圍已確認，但沒有足夠結果樣本
  missing: 完整詢問與材料確認無可用的導航方式
  unknown: 只有安裝名稱、MCP 設定或無版本的示意圖
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: repo-discovery, version: 1 }]
  actions: [先用既有搜尋與局部閱讀建立導航例子, 只有無法滿足目標時才提出索引或其他工具選項]
  targets: 工作流程說明與現有查詢工具；新增工具另行決定
  risk: low
  needs_approval: false
verification:
  rerun: []
  logic: all；核對指定查詢及樣本結果與目前符號位置
  expected: 結果有精確定位、範圍與版本，保留未涵蓋部分
  attestation: 請提供查找一個定義與其使用處／測試的紀錄；說明 agent 能使用的方式與限制
sources:
  - { type: original_item, ref: "檢視 3.3 C4", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L237–247 Read Before Write；L548–565 Discovery", use: 導航規則卡沿用 }
```

### 8.20 `harness.permission-boundaries`

```yaml
id: harness.permission-boundaries
item_version: 1
catalog_version: 0.1.0
question: 各選定 CLI 的讀寫、命令、網路與核准邊界是否有明確宣告
layer: { primary: harness, related: [] }
baseline: { proposed_tier: baseline, when: 選定 CLI 接觸專案資源, omission: 無法知道可執行哪些操作及何時要詢問, alternative: 可引用已知版本的預設或組織政策，不要求每個 repo 複製設定 }
applicability:
  applicable: 選定 CLI 會讀取或操作本機／外部資源
  not_applicable: 確認範圍內沒有這類 agent 使用
  unknown: 未選 CLI、版本或有效設定層次
  questions: [哪些資源可讀寫？哪些命令或外部操作需核准？使用者／組織層是否覆蓋 repo？]
inspection:
  inputs: [選定 CLI 與 adapter, repo 權限設定, 明確提供的預設／外部政策]
  missing_input: repo 無設定時不推論沒有權限邊界，請確認外部政策或預設
  detectors: [permissions.declarations@1]
  methods: [static, attested_by_user]
  review: 逐資源核對允許、禁止、需核准與未列項目的處置；區分宣告與可強制範圍
  limits: 不主張所有工具與子程序均受控，不嘗試繞過或實際寫入
evidence_requirements:
  accepted_forms: [text, config]
  verified: all；每個選定 CLI／資源範圍有權限與核准宣告，來源和未知覆蓋已釐清
  partial: 有已知權限設定，但部分資源或外部覆蓋未確認
  missing: 完整範圍與確認均無權限宣告或適用預設
  unknown: 未支援設定、只有提示詞斷言有隔離，或有效設定來源矛盾
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: permission-boundaries, version: 1 }, { id: git-hygiene, version: 1 }]
  actions: [依現有工作需求列出最小權限與需核准操作, 提出選定 CLI 的設定位置與契約，避免擴權；改寫歷史等敏感操作另需明確授權]
  targets: 已選 adapter 的權限設定或指定治理來源
  risk: high
  needs_approval: true
verification:
  rerun: [permissions.declarations@1]
  logic: all；逐 CLI 核對權限範圍、核准及來源優先順序
  expected: 可區分宣告與 runtime 未觀察，不因設定存在而保證隔離
  attestation: 請指出每類資源的允許／禁止／核准規則及來源；外部覆蓋需附去敏感片段
sources:
  - { type: original_item, ref: "檢視 3.3 H3", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L414–430 Least privilege；L457–480 Git Hygiene", use: 規則卡沿用 }
  - { type: tool_policy, ref: "spec 第 7 節 CLI 支援契約", use: adapter 範圍約束 }
```

### 8.21 `harness.recovery`

```yaml
id: harness.recovery
item_version: 1
catalog_version: 0.1.0
question: 改變狀態的各個影響範圍是否宣告復原、補償、對帳或不可逆限制的處置
layer: { primary: harness, related: [] }
baseline: { proposed_tier: baseline, when: 工作會改變本機或外部狀態, omission: 失敗或結果不明時可能無法安全決定下一步, alternative: 可用補償或對帳與明確授權，不強迫所有效果可回滾 }
applicability:
  applicable: 任務會改動原始碼、資料、設定或遠端資源
  not_applicable: 確認完全唯讀且沒有外部副作用
  unknown: 影響範圍未知；不能只看見 Git 就忽略其他效果
  questions: [工作改變哪些狀態？結果不明時如何查核？哪些效果不可逆、誰能決定處置？]
inspection:
  inputs: [效果清單, 本機復原宣告與 Git 中繼資料, 使用者提供的其他效果處置材料]
  missing_input: 沒有 Git 可採其他基準；非本機 detector 不支援時仍接受明確材料
  detectors: [recovery.local-plan@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 逐效果核對基準／識別、步驟、責任者、排除與未知結果處置；不可逆者須明列限制與授權安排
  limits: 不執行回滾，不把宣告視為已演練；ignore 檔案與遠端資源不因 Git 存在被涵蓋
evidence_requirements:
  accepted_forms: [text, reusable, config]
  claims:
    local: recovery.local-source-plan-declared@1
    other_effects: recovery.effect-plan-declared@1
  verified: all；每個適用效果的相應處置宣告成立，涵蓋與排除明確
  partial: 部分效果有完整宣告，其他範圍或未知結果處置不足
  missing: 效果已確認，完整材料證實全部缺乏處置宣告
  unknown: 只有 Git／worktree、效果未定或外部資料未提供
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: rollback-strategy, version: 1 }]
  actions: [列出每種效果的基準、處置與排除, 遠端結果不明先對帳再決定重試；不可逆者明示限制與授權，不假造回滾步驟]
  targets: 指定恢復文件、任務風險區塊或外部處置程序引用
  risk: high
  needs_approval: true
verification:
  rerun: [recovery.local-plan@1]
  logic: all；逐效果核對第 7.1 節的相應判斷式，不能由一個本機計畫替其他效果成立
  expected: 所有選定效果都有可追溯處置或明示的不可逆限制；無 runtime 成功保證
  attestation: 請用失敗及回應遺失兩種情境說明基準、查核、授權與恢復；若宣稱演練成功，另附同範圍紀錄
sources:
  - { type: original_item, ref: "檢視 3.3 H6", use: 保留題目並改為效果範圍 }
  - { type: practitioner, ref: "gist 83e12fa:L159–170 Risk & Rollback；L318–344 Safe Fallbacks／Rollback", use: 規則卡沿用 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D6", use: 取消不等於外部效果消失 }
```

### 8.22 `harness.isolation`

```yaml
id: harness.isolation
item_version: 1
catalog_version: 0.1.0
question: 執行環境與共享資源的隔離邊界是否有宣告及限制說明
layer: { primary: harness, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 同時工作可能互相影響，不據此要求所有任務啟動容器, alternative: 單一使用者工作區加明確共享限制也能回答宣告題 }
applicability:
  applicable: agent 有執行環境或與其他工作共享資源
  not_applicable: 確認此評估範圍沒有執行或共享環境
  unknown: 環境或共享方式不明
  questions: [哪些檔案、程序、資料與憑證共享？每件工作的隔離方式是什麼？]
inspection:
  inputs: [環境設定與政策, 工作區／分支／容器宣告, 共享資源清單]
  missing_input: 看不到容器或 worktree 不推論無隔離；請確認外部環境
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對工作識別、隔離與共享對象、建立／清理責任及已知限制
  limits: worktree 只隔離部分檔案，不代表程序、網路、秘密或資料庫隔離
evidence_requirements:
  accepted_forms: [text, config]
  verified: all；選定環境的隔離與共享邊界、限制與清理方式有依據
  partial: 已知部分隔離但共享資源或清理限制未說明
  missing: 完整範圍內沒有環境邊界宣告且已確認
  unknown: 只有容器／worktree 名稱，無範圍材料
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: isolation-boundaries, version: 1 }]
  actions: [先描述既有共享與隔離範圍, 依衝突風險提出最小隔離選項；不要把隔離當成復原]
  targets: 工作區或執行環境政策
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；以兩件工作可能共享的資源逐項核對宣告
  expected: 可說明彼此是否共享及未知，不宣稱技術隔離已實測
  attestation: 請列出兩個工作環境的共享項與隔離項；若主張強制隔離，附同範圍驗證紀錄
sources:
  - { type: original_item, ref: "檢視 3.3 H4", use: 保留題目並限定宣告主張 }
  - { type: tool_policy, ref: "spec 5.1 Harness；本文件 4.4 人工證據邊界", use: 隔離與復原分離 }
```

### 8.23 `harness.mechanical-enforcement`

```yaml
id: harness.mechanical-enforcement
item_version: 1
catalog_version: 0.1.0
question: 宣告為可機械檢查的規範是否有對應檢查、邊界與失敗後果
layer: { primary: harness, related: [foundation] }
baseline: { proposed_tier: advanced, when: false, omission: 不清楚規範在哪裡檢查以及是否阻擋；本題不強制每條文字規範自動化, alternative: 既有 lint、腳本或 CI 可重用，不重複建立檢查 }
applicability:
  applicable: 有被指定為可機械檢查的規範
  not_applicable: 確認只有需語意判斷的規範或沒有此目標
  unknown: 規範範圍或可機械判斷性未確認
  questions: [哪些規範可由機器判定？在哪個邊界檢查？失敗是提示還是阻擋？]
inspection:
  inputs: [指定規範, 既有分析／驗證設定, 邊界與後果宣告]
  missing_input: 無完整解析時保留已知工具設定，對應關係請確認
  detectors: [analysis.config@1, ci.failure-consequence@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 逐規範核對判斷條件、檢查引用、發生邊界及後果；agent 映射只當候選
  limits: 題目目標是對應宣告，不是證明不可繞過；advisory 合法但不能標為 blocking
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；選定規範的對應、邊界、後果明確，advisory 與 blocking 不混用
  partial: 有有效規範到檢查對應，但部分邊界或後果未知
  missing: 完整範圍內沒有對應，且已確認沒有外部措施
  unknown: 只有 tests 存在就推論保護所有規範，或僅 agent 候選映射
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: norm-check-mapping, version: 1 }]
  actions: [為選定規範列出既有檢查與失敗後果, 需改為阻擋時提出另行核准的變更，不能把提示自動升級為 gate]
  targets: 規範對應表與既有檢查設定
  risk: medium
  needs_approval: true
verification:
  rerun: [analysis.config@1, ci.failure-consequence@1]
  logic: all；每條指定規範有可追溯對應與後果，範圍相同
  expected: 如實標示 advisory／blocking／unknown；沒有 runtime 強制保證
  attestation: 請指出每條規範由什麼條件檢查、在何處、失敗後會怎樣；語意規範改交審查
sources:
  - { type: original_item, ref: "檢視 3.3 H1", use: 政策改寫為對應與後果，不等同實際硬擋 }
  - { type: tool_policy, ref: "spec 5.2 證據；本文件 4.2 去重", use: 與分析工具設定分開 }
```

### 8.24 `harness.review-ownership`

```yaml
id: harness.review-ownership
item_version: 1
catalog_version: 0.1.0
question: 需要語意判斷的變更是否有指定審查者、規準與結果紀錄方式
layer: { primary: harness, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 語意規範可能沒有負責判斷的人或機制，不要求所有變更多模型審查, alternative: 單一授權人或符合政策的模型也可，不強迫 CODEOWNERS }
applicability:
  applicable: 政策要求理解意圖或品質的審查
  not_applicable: 確認此範圍沒有語意審查需求，附理由
  unknown: 哪些變更需審查或誰負責尚未定義
  questions: [哪些品質無法機械判斷？由誰審、按什麼標準、如何記錄？]
inspection:
  inputs: [審查政策, 角色／所有權宣告, 規準與紀錄位置]
  missing_input: 沒有 CODEOWNERS 可使用人工政策；只有檔案不代表已授權或會被執行
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對範圍、評估者、判準、結果／例外與缺席處置；自評需明示
  limits: 指定另一模型不證明獨立，指定人名不證明真實授權或核准
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；每類指定審查有對應責任、規準與結果處理宣告
  partial: 有責任者但規準、範圍或結果紀錄不足
  missing: 確認需要審查，完整範圍卻沒有責任分配
  unknown: 只有團隊／模型名稱或未確認的所有權
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: review-checklist, version: 1 }]
  actions: [為必要語意判斷指定人或模型及規準, 分開記錄意見、接受權與例外，不聲稱審查已執行]
  targets: 審查政策、角色說明或既有 PR 流程
  risk: medium
  needs_approval: true
verification:
  rerun: []
  logic: all；以一項適用變更追溯責任者、判準及結果去向
  expected: 有可定位的審查約定，不以 reviewer 數量判定成熟
  attestation: 請指出誰負責這類審查、授權來自哪裡，以及缺席或意見衝突如何處理
sources:
  - { type: original_item, ref: "檢視 3.3 H2", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L624–646 Review Checklist", use: 規則卡沿用 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D2", use: 人與模型皆可合法評估 }
```

### 8.25 `harness.high-risk-controls`

```yaml
id: harness.high-risk-controls
item_version: 1
catalog_version: 0.1.0
question: 宣告的高風險變更是否有對應驗證、資料安全與風險處置安排
layer: { primary: harness, related: [graph] }
baseline: { proposed_tier: advanced, when: false, omission: 高風險工作可能缺乏明確控制；本題維持可見且不自動變成全域 gate, alternative: 沿用專案既有風險程序，不強迫所有專案加入同一套措施 }
applicability:
  applicable: 使用者／專案政策確認有高風險工作
  not_applicable: 本次目標範圍沒有高風險變更，附理由與期限
  unknown: 只看到 auth／migrations 等名稱，尚未確認風險
  questions: [哪些變更被視為高風險？要哪些額外驗證、資料保護與授權？]
inspection:
  inputs: [風險分類與範圍, 對應處置政策, 去敏感的代表計畫]
  missing_input: 目錄訊號只產生詢問；沒有近期高風險任務可核對政策而非要求執行
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對每種風險的驗證、資料邊界、復原／補償、發布與必要核准；不適用措施附理由
  limits: 不做漏洞評估，不把政策存在視為已降低風險
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；宣告的風險目標都有對應控制、責任及例外處置
  partial: 已有部分措施，但某風險或責任未覆蓋
  missing: 高風險需求已確認，完整材料中無對應安排
  unknown: 風險分類未定或只有通用安全提醒
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: high-risk-protocol, version: 1 }, { id: data-migration, version: 1 }]
  actions: [依已宣告風險補驗證、資料範圍與回復／補償步驟, 遷移情境提出分階段及核對方式；是否需人核准由政策決定]
  targets: 既有風險政策、遷移或發布計畫
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；逐風險核對措施與責任，不要求不相關控制
  expected: 高風險目標有可追溯安排；治理與 runtime 強制分開
  attestation: 請用代表風險說明驗證、資料安全、復原或不可逆限制與授權方式
sources:
  - { type: practitioner, ref: "gist 83e12fa:L568–600 High-Risk Change／Data Migration；L159–170 Task Management", use: 規則卡沿用 }
  - { type: tool_policy, ref: "本文件 5.3 高風險映射；spec 5.2", use: 不把 gist 改寫的控制誤稱來源原意 }
```

### 8.26 `harness.untrusted-input`

```yaml
id: harness.untrusted-input
item_version: 1
catalog_version: 0.1.0
question: 外部內容是否與可執行指令、權限變更和敏感資料分開處理
layer: { primary: harness, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 外部內容可能被誤當授權；保持風險可見但不假裝已防住注入, alternative: 明確來源與信任界線的政策也可，不強迫特定過濾產品 }
applicability:
  applicable: agent 讀網頁、issue、檢索內容或其他低信任來源
  not_applicable: 確認沒有此類輸入且範圍仍有效
  unknown: 輸入來源或工具權限未盤點
  questions: [哪些來源不可信？其中的指令能否改變任務或權限？哪些資料不得外傳？]
inspection:
  inputs: [來源清單, 信任與權限政策, 明確提供的代表資料流]
  missing_input: 只見網路工具不推論有防護；先確認實際使用來源
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對資料與指令區分、來源標記、權限擴張與秘密處置、衝突時的決定方式
  limits: 不執行外部內容，不主張提示詞注入已被防止
evidence_requirements:
  accepted_forms: [text, config]
  verified: all；每類指定低信任輸入有明確處理界線與授權來源
  partial: 已有來源區分，但權限或外傳處理未明
  missing: 外部輸入適用，完整政策確認無信任界線
  unknown: 只有安全字眼、未確認資料流或防護聲稱
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: untrusted-input-boundary, version: 1 }]
  actions: [在既有工具使用政策中標記資料與指令的差異, 外部文字不得自行授權擴權或傳出秘密；風險處置留給明確授權來源]
  targets: 工具與外部資料處理政策
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；以正常外部資料與內含越權要求的描述情境核對政策，不實際執行
  expected: 能指出合法授權來源與拒絕／詢問方式，不聲稱攻防實測
  attestation: 請說明 issue／網頁若要求改權限或傳資料時，依哪條政策處理及如何記錄
sources:
  - { type: review_finding, ref: "檢視 F-09 與第 8 節 Harness 外部內容不可信", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L414–430 Security and Privacy", use: 資料最小化指引；注入處理為本工具政策改寫 }
```

### 8.27 `harness.agent-observability`

```yaml
id: harness.agent-observability
item_version: 1
catalog_version: 0.1.0
question: agent 所需的診斷資料是否有可取用路徑、範圍與代表證據
layer: { primary: harness, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 問題可能難定位，但不強迫所有任務有 log、畫面、指標三者, alternative: 針對需求的最小日誌或截圖即可 }
applicability:
  applicable: 任務需要觀察應用、服務或執行結果
  not_applicable: 確認沒有這類診斷需求
  unknown: 需要的訊號或 agent 可見範圍未定
  questions: [要診斷什麼？需要哪些資料？agent 如何取得且避免讀到敏感內容？]
inspection:
  inputs: [診斷需求, 取用方法與權限宣告, 使用者提供的去敏感樣本]
  missing_input: 只有工具設定時只說有設定，不能說 agent 看得到
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 逐需求核對資料位置、查詢範圍、去敏感方式與目前版本的取用樣本
  limits: 不啟動服務或自行抓監控資料，不保證未來可用
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；指定診斷訊號有取用路徑與同範圍樣本，已確認權限與去敏感限制
  partial: 方法已宣告，但部分訊號的可取用樣本不足
  missing: 完整範圍與有效確認均無必要訊號的取得方式
  unknown: 僅 log 目錄／工具名稱或資料來源未明
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: instrumentation, version: 1 }]
  actions: [優先暴露既有必要訊號與查詢方式, 設計最小權限與去敏感樣本，不收集原始秘密或完整個資]
  targets: 既有診斷取用說明與設定
  risk: medium
  needs_approval: true
verification:
  rerun: []
  logic: all；各指定訊號的取得方式、樣本、範圍與限制相符
  expected: 可定位去敏感診斷證據；不以 log 存在代表 agent 可讀
  attestation: 請提供一次必要訊號的取用紀錄與樣本，說明權限、版本及未涵蓋部分
sources:
  - { type: review_finding, ref: "檢視第 8 節 Harness 可觀測性", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L345–357 Instrumentation", use: 規則卡沿用 }
```

### 8.28 `harness.cost-visibility`

```yaml
id: harness.cost-visibility
item_version: 1
catalog_version: 0.1.0
question: 選定範圍的耗時與用量／花費是否有可追溯紀錄和估計限制
layer: { primary: harness, related: [] }
baseline: { proposed_tier: advanced, when: false, omission: 無法比較工作成本，但不等同沒有預算上限, alternative: 可用 CLI 匯出或人工整理，缺精確金額時標示估算／不可得 }
applicability:
  applicable: 專案需要或已採用成本／耗時觀測
  not_applicable: 確認此範圍沒有觀測需求，附理由
  unknown: 觀測範圍、帳務來源或可得指標未定
  questions: [量測 run、任務還是專案？哪些是實際值、估算或不可得？]
inspection:
  inputs: [指標定義, 明確提供的去敏感用量／耗時紀錄, 成本換算與涵蓋說明]
  missing_input: 無供應商帳務權限不聯網補抓，保留未知或已知的可得限制
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對計數單位、時間範圍、來源、重試／子任務涵蓋與估算方式
  limits: 延遲帳務與估算不是精確美元，也不代表有硬上限
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；選定指標有定義與樣本；不可得欄位有已確認原因而非虛構值
  partial: 至少一個選定指標有紀錄，其餘來源或涵蓋未知
  missing: 完整範圍與有效確認皆無任何選定指標紀錄
  unknown: 只有看板設定、無來源總數或估算標籤不明
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: cost-recording, version: 1 }]
  actions: [選少量可得指標，記錄單位、時間與來源, 區分實際、估算及延後回報，不要求所有供應商有同精度]
  targets: 專案選定的觀測紀錄或回報格式
  risk: low
  needs_approval: false
verification:
  rerun: []
  logic: all；依樣本追溯各指標來源與涵蓋，無法取得者須明示
  expected: 可核對耗時／用量或花費的計算依據，不延伸為全域成本保證
  attestation: 請提供一筆去敏感紀錄，說明是否含重試與子任務，哪些金額只是估算
sources:
  - { type: original_item, ref: "檢視 3.3 H7", use: 保留題目 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D6", use: 估算與硬上限分開 }
```

### 8.29 `harness.outcome-measurement`

```yaml
id: harness.outcome-measurement
item_version: 1
catalog_version: 0.1.0
question: agent 成效指標是否有母體、判準、資料與計算方式
layer: { primary: harness, related: [loop] }
baseline: { proposed_tier: advanced, when: false, omission: 成功率等數字可能無法解釋，不把測量本身當成有效改進, alternative: 小樣本與人工評估也可，但須標示偏差及限制 }
applicability:
  applicable: 專案選擇量測 agent 任務成效
  not_applicable: 確認暫無成效量測目標
  unknown: 指標或任務母體未定
  questions: [什麼算成功？哪些任務納入？取消、未知與失敗如何計算？]
inspection:
  inputs: [指標與抽樣定義, 去敏感任務結果, 計算方式或報表]
  missing_input: 沒有歷史資料可記錄已定義方法，不能虛構成功率
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對分母／時間範圍、判準、評估者、排除項及樣本計算
  limits: 不推論因果效果；採樣或自評偏差須明示
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；方法與母體明確且樣本可重算，未判定與取消不被當成功
  partial: 方法已定義但缺足夠樣本或部分結果來源
  missing: 選定量測目標已確認且無方法或紀錄
  unknown: 只有百分比、無母體或單純 agent 宣稱效果提升
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: outcome-evaluation, version: 1 }]
  actions: [定義一個與任務相關的指標及母體, 記錄結果來源、排除與未知，改善採納另由 Loop 題處理]
  targets: 選定成效紀錄與指標說明
  risk: medium
  needs_approval: true
verification:
  rerun: []
  logic: all；人工以樣本重算指標並核對各類結果與母體
  expected: 有可解釋的量測而非保證 agent 成功，不需固定最低成功率
  attestation: 請提供指標定義及去敏感樣本，說明未知／取消／重試如何納入與樣本偏差
sources:
  - { type: original_item, ref: "檢視 3.3 H8", use: 保留量測，改進流程另題 }
  - { type: tool_policy, ref: "spec 5.2 證據；檢視第 6 節 Harness 與 Loop 邊界", use: 不將量測等同改善 }
```

### 8.30 `loop.trigger`

```yaml
id: loop.trigger
item_version: 1
catalog_version: 0.1.0
question: 指定專案迴圈由誰、因什麼事件、以哪個範圍啟動
layer: { primary: loop, related: [] }
baseline: { proposed_tier: baseline, when: 有明確專案迴圈或選定的迴圈目標, omission: 啟動責任與事件範圍不明, alternative: 人工啟動與定期檢討也可，不要求 scheduler 或常駐模型 }
applicability:
  applicable: execution-feedback、event-driven 或 cross-run-improvement 的專案流程
  not_applicable: 確認只有單次互動；CLI 內部模型迴圈不自動讓本題適用
  unknown: 只有 CI／agent 檔案訊號而無法識別實際流程
  questions: [有哪些專案層迴圈？誰能啟動？什麼事件啟動哪個範圍？]
inspection:
  inputs: [流程清單, 觸發設定或人工啟動約定, 對應任務／目標]
  missing_input: 無自動設定仍可看人工觸發政策；缺目標對應不能靠 cron 推論
  detectors: [loop.trigger@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 逐迴圈核對啟動者、事件或命令、目標範圍及授權來源
  limits: 有 schedule 不證明 scheduler 健康；不新增 I-B 明確排除的閒置／heartbeat 檢查
evidence_requirements:
  accepted_forms: [text, config, reusable]
  verified: all；每個指定迴圈的啟動者、條件與目標對應已宣告
  partial: 有已知啟動方式，但授權或目標範圍未明
  missing: 迴圈已確認，完整範圍無啟動約定
  unknown: 只有 CI 或排程訊號、未識別迴圈類型
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: loop-trigger, version: 1 }]
  actions: [寫明既有人工或事件觸發流程與授權, 先選定範圍，不為了題庫引入常駐 runtime]
  targets: 既有流程宣告或觸發設定
  risk: medium
  needs_approval: true
verification:
  rerun: [loop.trigger@1]
  logic: all；每個迴圈的觸發能對應到同範圍工作與授權者
  expected: 可回答何時由誰啟動，不聲稱實際曾喚醒
  attestation: 請指出一次人工或事件觸發的規約；若主張已執行，附對應 run 與時間紀錄
sources:
  - { type: original_item, ref: "檢視 3.3 L5", use: 保留題目 }
  - { type: user_decision, ref: "Loop 研究 12.5、12.9 I-B", use: 不新增持續健康檢查 }
```

### 8.31 `loop.acceptance-policy`

```yaml
id: loop.acceptance-policy
item_version: 1
catalog_version: 0.1.0
question: 迴圈候選成果的接受權責、規準、證據與版本如何綁定
layer: { primary: loop, related: [prompt] }
baseline: { proposed_tier: baseline, when: 迴圈會提交成果或改進提案並決定是否接受, omission: 工作者停止可能被誤當成果已驗收, alternative: 合法人工或明示自我宣告政策亦可，不要求機械判斷所有品質 }
applicability:
  applicable: 指定迴圈具有候選成果與接受決策
  not_applicable: 確認沒有成果接受決策需求，附範圍與理由
  unknown: 只見 DONE／Stop hook 而不知驗收意義
  questions: [接受哪個成果版本？誰依什麼證據接受？允許自我宣告或例外嗎？]
inspection:
  inputs: [迴圈驗收政策, 任務驗收條件, 版本／範圍宣告, 例外規則]
  missing_input: 可讀候選聲明不代表有接受政策；無宣告時請確認而不補猜
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 逐項核對候選對象、接受權責、規準引用、證據要求、拒絕與例外處置
  limits: 政策存在不代表成果已接受；指令 exit 0、hook 放行、程序停止都不是充分證據
evidence_requirements:
  accepted_forms: [text, reusable, config]
  claim: loop.acceptance-policy-declared@1
  verified: all；登錄表的宣告主張成立，允許自評時明示其限制，不偽裝獨立驗證
  partial: 任務規準已確認，但接受權責、版本綁定或證據要求不足
  missing: 迴圈與接受需求已確認，完整材料無政策
  unknown: 只有完成字串、空白規準或未確認的外部政策
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: definition-of-done, version: 1 }, { id: review-checklist, version: 1 }]
  actions: [引用 Prompt 的驗收條件，另寫誰如何接受哪個成果版本, 錯誤／逾時不得改寫成 pass；例外接受另記授權與證據缺漏]
  targets: 迴圈驗收宣告與既有任務規準
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；核對登錄表主張，使用成果 A 的證據不得默認驗收 B
  expected: 任務條件、驗證結果、接受決策與停止原因分開
  attestation: 請說明通過、證據不足與例外接受各由誰判斷，如何綁定成果版本及必要驗證輸入
sources:
  - { type: original_item, ref: "檢視 3.3 L1", use: 拆分為驗收與停止 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D1、L-D2、L-D5", use: 權責與證據分開 }
  - { type: practitioner, ref: "gist 83e12fa:L94–110 WO5；L483–502 DoD；L624–646 Review Checklist", use: 規則卡沿用 }
```

### 8.32 `loop.stopping-policy`

```yaml
id: loop.stopping-policy
item_version: 1
catalog_version: 0.1.0
question: 迴圈何時暫停、停止、取消或恢復，及其權責與未完成效果如何處理
layer: { primary: loop, related: [] }
baseline: { proposed_tier: baseline, when: 專案迴圈有需要控制的執行生命週期, omission: 無法分辨正常結束、阻塞或耗盡額度，也不知如何交接, alternative: 人工流程可用簡短停止與回復約定，不要求 runtime 枚舉或新預算 }
applicability:
  applicable: 指定迴圈會持續、重試或等待
  not_applicable: 確認沒有專案迴圈執行控制需求
  unknown: 執行範圍或控制權未明
  questions: [誰可取消？什麼情況等待或停止？阻塞後如何恢復？遠端操作如何處理？]
inspection:
  inputs: [執行政策, 停止／取消宣告, 已有額度政策, 未完成效果處置]
  missing_input: 沒有上限設定不妨礙核對人工停止約定；適用分支未知不跳過
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 分開核對正常結束、取消、阻塞／恢復及有額度時的耗盡處置與授權
  limits: blocked 可恢復；程序停止不等於接受成果或取消遠端效果
evidence_requirements:
  accepted_forms: [text, reusable, config]
  claim: loop.stopping-policy-declared@1
  verified: all；所有適用停止／等待分支與責任已宣告，不適用分支有理由
  partial: 有正常結束約定但適用取消、阻塞或耗盡分支未明
  missing: 完整範圍確認無執行生命週期政策
  unknown: 只有上限數字或結束字串，不能判定整體處置
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: loop-stop-policy, version: 1 }]
  actions: [分開寫停止原因、成果接受與可否恢復, 指定取消權責與執行中效果查核，不無限阻擋退出]
  targets: 迴圈控制政策
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；逐適用分支核對決策者、動作、結果紀錄與恢復條件
  expected: 停止原因有依據，取消不被宣稱為外部操作一定未發生
  attestation: 請用取消、阻塞與既有額度耗盡例子說明處置；沒有某分支時附不適用理由
sources:
  - { type: original_item, ref: "檢視 3.3 L1", use: 拆分後保留停止問題 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D3、L-D5、L-D6", use: 停止與接受分離 }
```

### 8.33 `loop.bounds`

```yaml
id: loop.bounds
item_version: 1
catalog_version: 0.1.0
question: 自主執行或自動重試的上限是否有範圍、計數、恢復帳務與耗盡處置
layer: { primary: loop, related: [] }
baseline: { proposed_tier: baseline, when: 迴圈自主執行或可自動重試, omission: 新 session 或重試可能無聲重置額度，無法界定執行界線, alternative: 依專案選有效的次數、時間、用量或授權邊界，不要求四種同時存在 }
applicability:
  applicable: 自主執行、自動重試或已有額度控制需求
  not_applicable: 純人工逐次決定且確認不需要此類額度政策
  unknown: 自主程度、重試路徑或額度作用範圍不明
  questions: [限制哪個 attempt／run／goal？如何計數、何時重置？誰可增加額度？]
inspection:
  inputs: [上限與計數宣告, 迴圈啟動／重試範圍, 人工提供的額度材料]
  missing_input: 只看到一個 max 參數時保留片段，不推論跨 session 上限
  detectors: [loop.bounds@1]
  methods: [static, assessed_by_agent, attested_by_user]
  review: 核對選定限制的數值或授權來源、單位、作用範圍、重試／重啟帳務、耗盡與提高額度權責
  limits: 工具不設定通用數字；估算花費只能標 soft／estimate；硬上限需另有強制範圍證據
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；專案選定的限制有明確來源與完整計數／處置宣告，硬軟與未知如實標示
  partial: 已知閾值與單位，但跨 run 計數、重置或耗盡處置不足
  missing: 自主或重試範圍已確認，完整材料沒有界線宣告
  unknown: 只有參數名稱；數值型缺閾值或單位；授權型缺有限範圍、失效條件、重試／恢復處置或擴充權責；對應主張為 unknown
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: loop-budget, version: 1 }]
  actions: [先記錄專案選定額度與作用範圍，再規劃持久計數與恢復帳務, 無進展不等於沒有 diff；提高額度與取消權責須有依據，不直接實作控制器]
  targets: 既有迴圈額度政策與計數說明
  risk: high
  needs_approval: true
verification:
  rerun: [loop.bounds@1]
  logic: all；逐限制核對範圍與耗盡處置；數值型核對累計／重置，授權型核對範圍消耗／有效性與擴充授權；重試或重開 session 不得自行重置或擴大限制
  expected: 可分辨有效作用範圍及估算限制，沒有無證據的硬上限承諾
  attestation: 請指出限制來源、重試如何消耗同一額度、提高額度的授權與尚未回報的用量如何處理
sources:
  - { type: original_item, ref: "檢視 3.3 L3", use: 政策改寫為有範圍的上限 }
  - { type: review_finding, ref: "檢視 F-09 花費上限", use: 合併，不另設重複題 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D6、12.6", use: 不預設數值與硬軟區分 }
```

### 8.34 `loop.resumable-state`

```yaml
id: loop.resumable-state
item_version: 1
catalog_version: 0.1.0
question: 跨 session 接續所需狀態、版本、下一步與不確定效果是否有保存契約
layer: { primary: loop, related: [context] }
baseline: { proposed_tier: baseline, when: 工作明確要求跨 session 接續, omission: 恢復者無法知道已做什麼或可能重複外部操作, alternative: 結構化 Markdown 或外部任務系統也可，不要求資料庫或固定 todo 檔 }
applicability:
  applicable: 工作跨 session、跨人或需要中斷後接續
  not_applicable: 確認工作為一次性且不需要接續
  unknown: 生命週期、保存方式或外部副作用範圍未明
  questions: [恢復者要知道什麼？狀態存哪裡？如何區分已完成、待查與尚未執行？]
inspection:
  inputs: [狀態結構與保存政策, 代表紀錄或新流程範本, 成果／操作版本對應]
  missing_input: 沒有本機狀態檔仍接受外部材料；只看到 ignore 或 commit 不足
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對目標、目前步驟、已驗證／未知結果、成果版本、下一步與恢復責任；有外部效果時保留查核識別
  limits: 保存結構不證明可恢復或 exactly-once；不強制保留完整對話
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；接續必要資訊、保存／取用與版本關係已宣告，代表結構可表達未完成及未知結果
  partial: 已有進度紀錄，但版本、下一步或未知效果資訊不足
  missing: 接續需求已確認，完整材料無保存契約
  unknown: 只有檔案、勾選清單或無法對應版本的歷史紀錄
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: todo-file, version: 1 }]
  actions: [在選定保存機制加入必要進度與證據連結, 精簡工作摘要並保留重要原始定位；未知外部結果恢復後先查核，別默認重做]
  targets: 專案選定狀態紀錄；依 D5 決定 commit／ignore
  risk: medium
  needs_approval: true
verification:
  rerun: []
  logic: all；以一筆中斷情境核對結構是否能描述完成、待查與下一步
  expected: 接續資訊可定位；若沒有實際恢復紀錄，不標示已驗證可恢復
  attestation: 請用代表狀態說明新 session 如何辨認成果版本、已執行操作與下一步；明示哪些仍需對帳
sources:
  - { type: original_item, ref: "檢視 3.3 L4", use: 改寫為接續資訊契約 }
  - { type: practitioner, ref: "gist 83e12fa:L143–170 Task Management；L249–260 Working Memory", use: 規則卡沿用 }
  - { type: user_decision, ref: "spec D5；Loop 研究 L-D6", use: 保存方式與恢復界線 }
```

### 8.35 `loop.learn-from-results`

```yaml
id: loop.learn-from-results
item_version: 1
catalog_version: 0.1.0
question: 跨次結果如何產生改善提案、決定是否採用並回看效果
layer: { primary: loop, related: [context] }
baseline: { proposed_tier: advanced, when: false, omission: 有紀錄卻未形成改善流程；不強制每次錯誤立即寫規則, alternative: 人工回顧、issue 或測試改善也可，不要求 autonomous loop 或 lessons 檔 }
applicability:
  applicable: 有跨任務或跨 run 改進目標
  not_applicable: 確認本次範圍無跨次改進需求
  unknown: 只有經驗檔，無法確認是否採用改進流程
  questions: [哪些結果會提出改善？誰採納或拒絕？如何判斷改善有用？]
inspection:
  inputs: [改進流程, 問題／提案／採納紀錄或新流程設計, 效果核對方法]
  missing_input: 沒有歷史採納不判定失敗；新流程可審閱完整約定與預定核對方式
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 追溯結果到提案、決定、變更及效果回看；拒絕提案可以是合法結果
  limits: 指標或 lessons 存在不代表改進有效，不自動修改規範
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；提出、決策、採納／拒絕及效果回看方法有宣告；已有紀錄時能追溯，未開始時明示
  partial: 已有結果與提案，但採納權責或回看方式未定
  missing: 已確認改進目標，完整材料無改進流程
  unknown: 只有 lessons 或聲稱進步，無過程依據
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: tripwires, version: 1 }]
  actions: [由有證據的重複問題提出最小改善，經指定權責決定, 選擇回看效果的方法，不把每次錯誤硬轉成永久規則]
  targets: 既有回顧、issue 或經驗流程
  risk: medium
  needs_approval: true
verification:
  rerun: []
  logic: all；追蹤代表提案或新流程的示例走完提出、決定與回看安排
  expected: 能分辨保存經驗、採納改善與效果證明三件事
  attestation: 請說明一項提案如何採納或拒絕、由誰決定及之後如何核對成效；沒有實例時標示尚未運行
sources:
  - { type: review_finding, ref: "檢視 F-09 與第 8 節 Loop 從錯誤改進", use: 政策改寫，不強制第二次即設規則 }
  - { type: practitioner, ref: "gist 83e12fa:L78–93 WO4", use: 規則卡沿用 }
```

### 8.36 `graph.roles`

```yaml
id: graph.roles
item_version: 1
catalog_version: 0.1.0
question: 各節點的責任、輸入、輸出與決定範圍是否明確
layer: { primary: graph, related: [] }
baseline: { proposed_tier: baseline, when: Graph 適用且選定流程需要分配節點責任，不以節點已命名或已有角色文件為條件, omission: 無法知道誰負責哪件事及交付什麼, alternative: 人、函式或同一 agent 的多步驟也可，不要求多 agent 或多角色檔 }
applicability:
  applicable: 確認有明確多步驟／節點流程，或選定 Graph 作為目標
  not_applicable: 確認單次直接工作已足夠，且無相反使用證據
  unknown: 只有 subagent 定義檔，無流程用途與使用／目標確認
  questions: [哪些節點實際負責工作？各自產出及權限是什麼？是否真的需要分節點？]
inspection:
  inputs: [流程節點清單, 角色／函式／人工責任宣告, 任務輸入輸出]
  missing_input: 缺少角色檔可用流程文件；不能從工具安裝推論 Graph 已採用
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 逐節點核對職責、輸入輸出與不能自行決定的事，辨識重疊或無人負責的交付
  limits: 定義存在不證明節點正在執行；不同 agent 名稱不保證獨立性
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；每個指定節點都有一致責任與交付宣告，已知衝突有處理
  partial: 部分節點完整，其他責任或交付未定
  missing: Graph 範圍已確認，完整材料無節點職責宣告
  unknown: 只有角色名字、工具定義或用途未定
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: subagent-roles, version: 1 }]
  actions: [先移除無必要的角色分拆，再為必要節點定義單一明確責任, 列出交付及權限，不把 agent 數量當成果]
  targets: 既有流程與節點定義
  risk: medium
  needs_approval: true
verification:
  rerun: []
  logic: all；用代表任務對照每個節點的輸入、責任與輸出
  expected: 無未解的必要交付責任衝突，不聲稱實際協作成功
  attestation: 請說明代表任務分給哪些節點、各自能決定什麼及交付給誰
sources:
  - { type: original_item, ref: "檢視 3.3 P3、G1；F-01", use: 合併並歸 Graph }
  - { type: practitioner, ref: "gist 83e12fa:L47–62 Subagent Strategy", use: 規則卡沿用，非強制平行化 }
```

### 8.37 `graph.declared-routes`

```yaml
id: graph.declared-routes
item_version: 1
catalog_version: 0.1.0
question: 節點間允許的路徑、路由權責與無法選路時的處置是否有宣告
layer: { primary: graph, related: [] }
baseline: { proposed_tier: baseline, when: Graph 適用且有節點轉移, omission: 不清楚誰接誰或路由失敗時如何處理, alternative: 程式、模型或人路由皆可；簡單表格足夠 }
applicability:
  applicable: 有多節點轉移或分支流程
  not_applicable: 確認無 Graph 路由需求
  unknown: 節點或流程範圍不明
  questions: [哪些轉移允許？誰選路？沒有符合條件或多條同時符合時怎麼辦？]
inspection:
  inputs: [節點與路由宣告, 起點／終點, 分支選擇規則與例外處理]
  missing_input: 沒有 graph DSL 仍可審閱文字流程；動態路由不能被硬猜
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 逐路徑核對起訖節點、選路者、分支條件與未匹配／衝突處置；單一路徑也可
  limits: 宣告路由不證明 agent 無法跳關；模型路由不是自動不合格
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；選定流程路徑、路由責任與例外處置完整且引用有效節點
  partial: 部分路徑已宣告，但終點、未匹配或衝突處理缺漏
  missing: 完整範圍沒有路由規約且適用性已確認
  unknown: 只有節點清單或無法確認的動態選路聲稱
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: graph-routing, version: 1 }]
  actions: [以現有流程寫最小路由表，保留允許的人／模型選路, 補無法選路時的等待或交人，不自行新增循環]
  targets: 流程文件或既有路由宣告
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；核對節點引用、正常路徑與未匹配／衝突情境
  expected: 允許路徑與決策責任可追溯；關卡是否阻擋另由 edge-gates 限定
  attestation: 請說明一條正常路徑及一次無法選路的處置，指出決策者與依據
sources:
  - { type: original_item, ref: "檢視 3.3 G2；F-07", use: 政策改寫，不強制程式選路 }
  - { type: tool_policy, ref: "spec 5.1 Graph", use: 路由與關卡分離 }
```

### 8.38 `graph.edge-gates`

```yaml
id: graph.edge-gates
item_version: 1
catalog_version: 0.1.0
question: 被政策要求受控的轉移是否定義檢查條件、證據與結果處置
layer: { primary: graph, related: [] }
baseline: { proposed_tier: baseline, when: 政策要求特定轉移通過檢查或授權, omission: 即使知道路徑，也不知道何時可走該路徑, alternative: 人工或模型的明確決策條件也可，不要求每條邊都有自動 gate }
applicability:
  applicable: 存在被要求檢查或授權的轉移
  not_applicable: 確認流程沒有受控轉移需求，附理由
  unknown: 轉移風險或政策需求尚未確認
  questions: [哪幾條轉移受控？要求什麼證據？無法檢查時能否繼續？]
inspection:
  inputs: [受控邊清單, 條件與證據契約, 決策者與例外規則]
  missing_input: 有路由但無 gate 政策時先確認需求；不以路由存在當有檢查
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對每條指定邊的成果版本、通過／拒絕／未知條件與授權例外
  limits: 宣告條件不證明不可跳過或 runtime 會強制
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；每條要求受控的邊都有條件、證據、權責及未知處置
  partial: 部分 gate 完整，其他邊或例外處理未定
  missing: 受控需求已確認，完整材料無關卡定義
  unknown: 只有 approved／passed 標籤，或條件／證據／權責／未知處置無法確認；runtime 可跳過性另列未知，不影響完整宣告的判定
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: graph-edge-gates, version: 1 }]
  actions: [為政策要求的轉移列條件與證據，重用既有驗收規準, 明示拒絕、未知與例外接受，不把錯誤改寫成 pass]
  targets: 指定路徑的條件契約
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；以通過、拒絕與無證據三種情境核對每條受控邊
  expected: 有可追溯的條件及處置；非受控邊不強加 gate
  attestation: 請指出每條 gate 的證據來源、版本與授權者；若主張不可繞過，另提供強制邊界證據
sources:
  - { type: original_item, ref: "檢視 3.3 G5", use: 保留題目，與 G2 分開 }
  - { type: user_decision, ref: "Loop 研究 12.3 L-D1、L-D3", use: 證據、接受與退出分開 }
```

### 8.39 `graph.handoff-contract`

```yaml
id: graph.handoff-contract
item_version: 1
catalog_version: 0.1.0
question: 節點交接的必要內容、版本、接收與拒絕方式是否有約定
layer: { primary: graph, related: [] }
baseline: { proposed_tier: baseline, when: 節點間有任務或成果交接, omission: 接收者可能取得不足或過期的內容並錯誤繼續, alternative: 精確文字或結構化紀錄皆可，不強迫通用 RPC 或資料格式 }
applicability:
  applicable: 節點間實際或計畫中有交接
  not_applicable: 確認無交接或 Graph 不適用
  unknown: 交接邊或接收者需要的資訊不明
  questions: [誰交給誰？最少需要哪些內容？接收者如何辨識版本與缺件？]
inspection:
  inputs: [交接邊清單, 內容契約, 代表交接或已填寫範例]
  missing_input: 無 schema 可核對文字約定；空範本不證明可用
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對任務／成果識別、必要輸入、證據引用、版本、限制與接收／缺件處置
  limits: 不要求把全部對話或共用狀態交給所有節點，不證明實際傳遞成功
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；每條指定交接有必要內容與版本對應、接收及拒絕／補件規則
  partial: 有有效交付內容，但版本或缺件處置不足
  missing: 交接適用，完整材料無任何契約
  unknown: 只有欄位名字、未確認接收需求或無內容的 schema
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: handoff-contract, version: 1 }, { id: subagent-roles, version: 1 }]
  actions: [依接收者任務保留最小必要資訊、證據定位與版本, 指定缺件／過期時補件或停止交接的方式，不擴充通用 protocol]
  targets: 既有交接格式或流程文件
  risk: medium
  needs_approval: true
verification:
  rerun: []
  logic: all；以完整、缺件與過期版本樣本核對每個交接契約
  expected: 接收者能依約辨識適用成果與缺件，不依自由文字猜測完成
  attestation: 請提供一筆交接範例，指出接收所需資訊與缺件／版本不符時的處理
sources:
  - { type: review_finding, ref: "檢視 F-09 與第 8 節 Graph 交接格式", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L47–62 Structured subagent deliverables", use: 規則卡沿用 }
```

### 8.40 `graph.human-gates`

```yaml
id: graph.human-gates
item_version: 1
catalog_version: 0.1.0
question: 政策要求人決定時，核准位置、權責、版本與未回覆處置是否明確
layer: { primary: graph, related: [harness] }
baseline: { proposed_tier: baseline, when: 流程政策要求人工核准, omission: 不知道何時停下等誰決定，或把未回覆當同意, alternative: 既有 issue／PR 核准流程即可，不要求畫圖或新 UI }
applicability:
  applicable: 指定流程要求人的批准或選擇
  not_applicable: 確認政策沒有人工決策點，附理由
  unknown: 是否需人或誰被授權尚未確認
  questions: [哪些點必須等人？誰有權核准？未回覆、拒絕與改版後怎麼辦？]
inspection:
  inputs: [人工決策政策, 流程位置, 授權來源, 決策紀錄格式]
  missing_input: 有 reviewer 名稱不代表具接受權；外部核准需明確材料
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 逐核准點核對提出內容、成果版本、權責、回覆種類與有效期／變更後重審
  limits: 有核准設定不代表人已看過或真的核准；不代替人作決定
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；所有要求人工決策點有位置、授權依據及拒絕／未回覆／版本變更處置
  partial: 有核准位置與角色，但有效性或未回覆處置不足
  missing: 人工核准需求已確認，完整流程卻無核准約定
  unknown: 只有 approve 標籤或無授權依據的人名
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: human-approval, version: 1 }, { id: high-risk-protocol, version: 1 }]
  actions: [將已有人工決策要求對應到流程位置與成果版本, 明示拒絕、未回覆與過期如何處理，不把沉默當核准]
  targets: 既有流程的人工決策契約
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；以接受、拒絕、未回覆與成果改版核對決策有效性
  expected: 人工權責與流程對應可追溯；不主張任何實際核准已發生
  attestation: 請指出授權來源與版本綁定方式，說明不回覆或核准後改版時的下一步
sources:
  - { type: original_item, ref: "檢視 3.3 G4", use: 保留題目 }
  - { type: practitioner, ref: "gist 83e12fa:L568–585 High-Risk Change Protocol", use: 政策改寫，並非 gist 要求所有變更人工核准 }
```

### 8.41 `graph.shared-state`

```yaml
id: graph.shared-state
item_version: 1
catalog_version: 0.1.0
question: 共用狀態是否有權威、結構、版本、更新及各節點可見範圍的約定
layer: { primary: graph, related: [] }
baseline: { proposed_tier: baseline, when: 節點依賴共用狀態協作, omission: 多份狀態互相覆蓋或節點取得過多／過期資訊, alternative: 不變交接資料或有明確權威的分散儲存皆可，不要求單一實體檔案 }
applicability:
  applicable: 節點之間讀取或更新共用狀態
  not_applicable: 確認節點僅接收不相依的輸入，沒有共用狀態
  unknown: 狀態來源、讀寫者或並行需求未定
  questions: [哪個來源對哪部分狀態具權威？誰可讀寫？衝突與過期怎麼處理？]
inspection:
  inputs: [狀態欄位與來源, 節點讀寫權限／視圖, 更新與版本約定, 代表狀態]
  missing_input: 無 schema 檔仍可讀結構化約定；無共享需求不得強制建立狀態
  detectors: []
  methods: [assessed_by_agent, attested_by_user]
  review: 核對各欄位權威、必要資料視圖、寫入者、版本與並行／過期處置
  limits: 單一檔案不證明一致性；不是所有節點都應看到全部狀態，不實測同步或權限
evidence_requirements:
  accepted_forms: [text, reusable, config]
  verified: all；共用資訊有權威與結構，節點讀寫範圍、版本及衝突處置明確
  partial: 有結構或權威來源，但可見範圍、更新或過期處置不足
  missing: 共用狀態需求已確認，完整材料無權威或結構約定
  unknown: 只有資料庫／JSON 檔名稱或未確認的同步保證
  not_applicable: 有效不適用確認
prerequisites: { required: [], recommended: [] }
remediation:
  rule_cards: [{ id: shared-state-contract, version: 1 }]
  actions: [列出每類狀態的權威與必要欄位，讓各節點只取所需, 為多寫入者定義更新／衝突方式，沒有並行時不強迫交易系統]
  targets: 既有狀態或交接契約
  risk: high
  needs_approval: true
verification:
  rerun: []
  logic: all；核對兩個節點對同一狀態的讀寫視圖與一個過期／衝突情境
  expected: 可追溯狀態權威與權限界線，不宣稱執行時一致性已證實
  attestation: 請示範各節點需要的資料視圖、誰能更新及如何辨識舊版本；說明共享與非共享部分
sources:
  - { type: original_item, ref: "檢視 3.3 G3；F-08", use: 改寫為權威與最小可見範圍，不要求一個實體檔案 }
  - { type: tool_policy, ref: "spec 5.1 Graph；本文件 4.2 去重", use: 與接續及交接契約分開 }
```

## 9. 反例集

每個判斷式都要用以下反例檢驗，確認它只說證據支持的事。

| 情境 | 不可得出的結論 | 正確呈現 |
|---|---|---|
| 空白的任務範本 | 任務都寫得清楚 | 範本結構存在；任務品質未知 |
| CI 驗證步驟設為 advisory | 驗證未設定 | 叫用成立；失敗後果為 advisory |
| 只有文件的 repo | 不需要驗證 | 仍可能有連結檢查等驗證；依確認判斷 |
| 由外部的人工審查者驗收 | 沒有評估 | 沒有本機設定時回報 `unknown`，請使用者確認 |
| 只讀不寫的 agent | 需要復原機制 | 復原條件不適用於沒有改變狀態的範圍 |
| 有 lessons 檔，但沒有任何改進 | 有從結果改進 | lessons 保存成立；改進流程另外判斷 |
| 有改進流程，但沒有 lessons 檔 | 沒有從結果改進 | 改進流程可以用其他紀錄證明 |
| 同一 repo 有兩個工作流程，一個有指令評估，另一個沒有評估政策 | 兩者都就緒 | 證據不合併；逐一列出 |
| 迴圈類型或影響範圍未知 | 條件不適用，可略過 | 待確認；該層不能是 `adopted` |
| 驗收條件完整，但沒有取消或額度用盡的政策 | 停止政策完整 | 驗收政策成立；停止政策缺少或待確認 |
| 設定的指令找不到執行檔、使用遠端動態 workflow，或包裝腳本吞掉錯誤 | 驗證可用且有強制力 | 保留「已設定」的觀察；可用性與強制力未知 |
| 任務同時修改原始碼與遠端資源 | Git 可以復原全部 | Git 只涵蓋本機原始碼範圍；遠端回報 `unknown` |
| 外部復原流程有相關且有效的使用者確認 | detector 不支援，所以沒有復原 | 依證據契約採計確認，並標示為使用者確認 |
| 保護觀察中，一個 CODEOWNERS 有效、一個 hook 檔讀不到 | 部分保護 | 兩項觀察並列，不給整體等級 |
| 小專案有一份簡短而足夠的權威指引，沒有索引 | 缺少索引 | 索引題不適用 |
| 有 CI 但只用於發布靜態檔案，驗證由授權人完成 | CI baseline 自動缺少 | 先確認 CI 是否承擔驗證；人工接線可獨立成立 |
| 語言原生測試 runner，沒有第三方框架套件 | 沒有測試 | 核對原生案例、入口與行為，不強迫新增依賴 |
| 有 formatter，但政策要求型別或規則分析 | 靜態分析完整 | 排版不能滿足非排版分析主張 |
| 新專案已定 lessons 機制，但沒有任何歷史錯誤 | 缺少經驗保存 | 核對保存與取用宣告；不要求捏造 lessons |
| 人工流程沒有 verifier timeout，卻能記錄未回覆／無法判定 | 回饋路由不完整 | 核對適用的結果類別與不適用理由，不硬套程式錯誤枚舉 |
| 已有完整導航，所以 baseline.when 設為 false | 不需再計入該 baseline | baseline 條件依知識分散與取用需求，不依目前是否缺失 |
| 共用狀態分散在多個服務，每類狀態的權威與視圖已定義 | 必須改成一份檔案 | 可確認分區權威、版本與最小可見範圍，不要求實體集中 |
| baseline 選擇標準已核准，但整合清單尚未審查 | 可把 23 題直接當採用門檻 | 標準核准與清單核准分開；第 6–8 節仍為提案，不影響實際評估 |

## 10. 組件登錄與交付界線

### 10.1 Detector 提案清冊

以下 ID 均為版本 1 的規劃，不宣稱已有實作。表列語法是**擬支援邊界**；正式支援版本、parser 與 fixtures 仍須在實作階段按 adapter 核對。每列列出觀察、反例、unknown 與使用者，避免只有名字沒有契約。

| ID | 觀察／擬支援輸入 | 必測反例與 unknown | 使用的契約／判斷式 |
|---|---|---|---|
| `manifest.verify-entrypoint@1` | 已支援 manifest 中字面 script／target 與用途宣告；不展開或執行 | 名稱叫 test 但只是 echo；動態 target 或缺用途時只列候選 | 8.1；`verify.entrypoint-declared@1` 的結構輸入 |
| `instructions.verify-entrypoint@1` | 指定指引中的命令區塊與已宣告入口對應 | 同名不同參數、只有未解析別名時 unknown | 8.1；`verify.entrypoint-documented@1` |
| `policy.verify-entrypoint@1` | 使用者明確提供的結構化入口／用途／範圍宣告 | 未知政策版本或空白欄位不授予能力 | 8.1；入口宣告能力 |
| `ci-config-found@1` | 支援 CI 設定的存在、工作與觸發種類 | 空檔、只發布的 CI 不代表驗證適用 | 8.2 的設定觀察 |
| `ci.step-invokes-entrypoint@1` | 支援的字面步驟與指定驗證入口對應，逐義務記錄 | 遠端 action、可重用 workflow、動態參數無材料時 unknown；不因單一步驟通過算全部 | 8.2 invocation |
| `ci.failure-consequence@1` | 支援語法中的阻擋／advisory 宣告 | continue-on-error 不等於沒設定；wrapper 吞錯或遠端 required check 未知 | 8.2、8.23 的 consequence |
| `hooks.invokes-entrypoint@1` | adapter 認識的 hook 事件與字面 command 對應 | trust／外部覆蓋未知；有 hook 不代表全路徑可用 | 8.3 的指令接線觀察 |
| `evaluation.model-gate@1` | adapter 確認支援的模型評估宣告及已知片段 | 不把一家支援語法套到另外兩家；只見模型名稱不授予能力 | 8.3；評估設定判斷式的部分輸入 |
| `policy.human-evaluation@1` | 明確材料中結構化的審查者、輸入規準與結果位置 | 任意 prose 關鍵字不能當已配置；缺欄位保留片段 | 8.3；`evaluation.config-declared@1` 的輸入 |
| `loop.routing-declared@1` | 結構化政策或有限語法的結果分支 | 只比對 DONE 或只有 pass 分支不能代表完整對應 | 8.4；`loop.feedback-routing-declared@1` |
| `loop.stop-hook-active-checked@1` | 是否讀取 stop_hook_active 的弱訊號 | 讀取不代表會阻擋／放行或控制預算；語義無法解析為 unknown | 8.4 的輔助觀察，不授予能力 |
| `loop.stop-gate.command@1` | 可辨識 command Stop／agentStop 事件及決策輸出 | command 外殼內可能只解析自我宣告；不代表獨立驗證 | 8.4 的範圍線索 |
| `loop.stop-gate.model@1` | 已核對 adapter 的模型停止評估宣告 | 不推論模型獨立、有效或所有 CLI 都支援 | 8.4 的範圍線索 |
| `loop.self-declared@1` | 可辨識完成字串／聲明比對的設定 | grep DONE 仍是自我宣告；未解析腳本為 unknown | 8.4 輸入、8.31 的人工對照線索 |
| `instruction-file-found@1` | 選定 adapter 的 repo 內指引來源與可讀性 | repo 外無法觀察不是不存在；未選 CLI 不推論使用 | 8.5 authority |
| `instructions.import-topology@1` | 明確匯入、repo 內 symlink 與相同副本關係 | 路徑逃逸、循環、動態匯入標 unknown；不追越界連結 | 8.5 authority |
| `instructions.precedence-model@1` | 依已核對 adapter 版本推導候選優先順序 | 未知版本與外部覆蓋未確認時 unknown，不宣稱 runtime 已載入 | 8.5 authority |
| `context-size-reported@1` | 指定材料的位元組／行數與範圍 | 大不等於壞；不使用未核對的產品截斷常數 | 8.5、8.17 的資訊觀察 |
| `tests.structure@1` | 支援語言的測試案例結構、框架／原生 runner 與入口 | test 目錄或套件單獨不夠；未知語言保留人工途徑 | 8.6 的結構子主張 |
| `analysis.config@1` | 已支援分析設定的工具、範圍與規則／預設引用 | formatter 不算；動態程式設定不執行，無法解析為 unknown | 8.7；8.23 對應輸入 |
| `environment.declarations@1` | 工具版本、相依鎖定與環境設定的結構片段 | lockfile 不代表可重現；秘密值不讀取／不輸出 | 8.8 的結構觀察 |
| `security.config-signals@1` | 指定安全控制的已知設定與範圍 | 套件名稱、排程檔不代表安全；外部強制未知 | 8.9 的有限設定主張 |
| `documents.local-links@1` | 指定 Markdown 本機連結與錨點的可解析性 | 外部 URL 不自動請求；可達不代表正確或足夠 | 8.13、8.18 的導航／維護輔助 |
| `instructions.scoping@1` | adapter 支援的路徑／情境選擇欄位 | skill 檔存在不代表自動觸發；重疊或未知優先順序保留診斷 | 8.14 的選擇宣告 |
| `permissions.declarations@1` | adapter 支援的 allow／deny／approval 與範圍 | repo 無設定不等於沒邊界；外部覆蓋或不支援鍵為 unknown | 8.20；6.2 保護觀察重用 |
| `recovery.local-plan@1` | 本機來源控制片段與明確復原宣告的可對應部分 | Git 單獨不足；未追蹤／ignore 資料不能自動算涵蓋 | 8.21；本機復原宣告判斷式 |
| `loop.trigger@1` | CI／腳本的可辨識啟動關聯與指定流程 | 有 cron 不等於 agent 迴圈；不是健康監控 | 8.30 與 8.4 輸入 |
| `loop.bounds@1` | 有限語法中上限設定、單位與明示作用範圍 | 一個 session 的 max 不等於 goal 上限；花費估計不是硬上限 | 8.33 的片段，不單獨授予停止政策能力 |

| D9 產品 | 本版可用的設計途徑 | 尚不能宣稱的自動支援 |
|---|---|---|
| Claude Code CLI | 共用檔案觀察；有效的指定材料／確認；規劃獨立 adapter | 指引載入、hook 類型、權限鍵與失敗語意的實作版本矩陣尚未定版 |
| OpenAI Codex CLI | 同上，但不繼承 Claude 的設定語意 | 不因有同名 Stop 事件就宣稱模型型 gate 或強制行為相同 |
| GitHub Copilot CLI | 同上，分開解讀各設定來源 | 不把 IDE／cloud／SDK 或其他 CLI 的功能視為此 CLI 已支援 |

通用檔案觀察不限上述產品；產品特有語法未支援時只使對應自動主張 unknown，不禁止採計契約允許的人工材料。三家 CLI 的選擇已定，但未實作的 parser 不以「已支援」包裝。

### 10.2 Rule card 提案登錄

下列規則卡均為 `version: 1`。**卡片的提案內容**是所列契約的 `remediation.actions`，其適用、目標、風險、核准與驗收引用同一契約；來源 `derived_from` 取對應 `sources` 中標示規則卡沿用／政策改寫的精確定位。共用卡只取本題相關片段，不把整張卡全部套用。這是登錄與內容提案，不是已安裝的 skill 或可執行範本。

| 卡片 ID | 內容與使用契約 |
|---|---|
| `repo-discovery`、`verify-before-done` | 8.1、8.3、8.13、8.19 中的入口、接線與導航；驗證紀錄依 WO5 保留必要的前後比較與未跑項目 |
| `ci-verify` | 8.2 的既有 CI 叫用計畫，不自動開啟強制 gate |
| `stop-the-line`、`incremental-delivery`、`bugfix-workflow` | 8.4、8.15 的結果分支與小步驟；可用於無迴圈工作，不新增檢查 |
| `agents-md-core` | 8.5 的權威來源與衝突處理，不強迫所有 CLI 同檔 |
| `testing-strategy`、`static-analysis` | 8.6、8.7 的既有測試與分析方式 |
| `dependency-discipline`、`security-privacy` | 8.8、8.9 的環境與有限安全設定 |
| `plan-before-act`、`definition-of-done` | 8.10、8.12、8.31 的目標／規劃與接受政策，三者的主張不混用 |
| `verification-story`、`git-hygiene` | 8.11、8.20 的成果證據、風險與授權邊界；commit 慣例仍是待辦，不新增題目 |
| `plan-template` | 8.12 的條件式規劃指引 |
| `contextual-rules`、`reusable-workflow` | 8.14、8.15 的情境取用與重複工作 |
| `lessons-file`、`instruction-curation`、`instruction-maintenance` | 8.16–8.18 的保存、精簡與維護；檔名及保留方式可替換 |
| `todo-file` | 8.18、8.34 的工作摘要與接續內容，不要求原始對話全部保存 |
| `permission-boundaries`、`rollback-strategy`、`isolation-boundaries` | 8.20–8.22 各自的邊界宣告，不能互相代替 |
| `norm-check-mapping`、`review-checklist` | 8.23、8.24、8.31 的機械規範對應或語意評估，按各自主張取用 |
| `high-risk-protocol`、`data-migration` | 8.25、8.40 的風險措施或人工決策點，人工核准為工具政策改寫 |
| `untrusted-input-boundary`、`instrumentation` | 8.26、8.27 的信任與診斷取用界線 |
| `cost-recording`、`outcome-evaluation` | 8.28、8.29 的指標來源與限制 |
| `loop-trigger`、`loop-stop-policy`、`loop-budget` | 8.30、8.32、8.33 的啟動、執行控制與額度宣告 |
| `tripwires` | 8.35 的有依據改進與回看安排 |
| `subagent-roles`、`graph-routing`、`graph-edge-gates` | 8.36–8.38 的角色、路由與受控轉移 |
| `handoff-contract`、`human-approval`、`shared-state-contract` | 8.39–8.41 的交接、人工決策與狀態視圖 |

第 5 節中僅作來源用途標記的 `core-principles`、`core-communication`、`core-context`、`bugfix-template` 是選用指引素材，不產生新題目。`api-discipline`、`performance`、`a11y`、`concurrency` 及 commit 慣例仍屬明列待辦，不供目前評估授予結果。

### 10.3 完成度與後續關卡

| 工作 | 本版狀態 |
|---|---|
| 原始 27 題、檢視提案、gist 與工程基礎來源對照 | 已撰寫；保留改寫與排除理由 |
| 41 題九項資訊及 item／catalog 版本 | 已全部補齊，不再是五題試行 |
| 每題適用性、五種結果、改善與驗收 | 已逐題撰寫；人工題有問題與實質證據要求 |
| 能力、detector、規則卡與相依邊界 | 已有可追溯提案與引用；未實作 parser 或執行器 |
| U-3 A 不評分觀察區塊 | 已寫格式、來源與不作整體結論的限制 |
| baseline 選擇標準 | 第 3.1 節 B1–B6 於 2026-11-04 逐題核准，每題選 A；先前取消的表單不算核准 |
| baseline 與能力前置政策的整合清單 | 第 6、7 節於 2026-11-04 審查通過；第 8 節依授權核對與標準一致（見 8.0 審查紀錄） |
| 兩種 Skill 與改善範本的運作契約 | [運作架構](./2026-11-04-toolkit-operation-architecture.md)已撰寫；R-D3 開放核准修改，R-D5 核准 controller A，未新增可執行資源 |
| 正式可執行 catalog、CLI 支援矩陣與 fixtures | 清單審查後依實作計畫定版；本次沒有新增 runner 或修改目標專案 |

**交付界線：** D11 的逐題契約已完成；分級、適用條件、能力前置條件與證據契約均已核准或核對一致，版本已凍結為 0.1.0，尚待的是後續程式實作，不是欠缺另外 36 題的內容。未決門檻不得在實作時默默生效。

## 11. Herdr 討論紀錄與證據

| 項目 | 內容 |
|---|---|
| Herdr 位置 | workspace `w1C`，tab `w1C:t1` |
| Codex | pane `w1C:p1`，terminal `term_65f59187db74810`；即先前討論 Loop 的同一個 Codex |
| Copilot | pane `w1C:p2`，session `fae7ca1e-e204-4fcb-b2b4-7bfcad652e0b` |
| 傳遞方式 | `herdr agent prompt w1C:p1 … --wait`；請 Codex 把完整回覆寫入檔案，再核對雜湊 |
| 語言 | 英文（使用者同意 agent 之間用英文討論） |

| 檔案 | 作者 | 內容 | 存檔時間（+0800） | SHA-256 |
|---|---|---|---|---|
| `catalog-draft-v0.md` | Copilot | 初稿：來源對照、41 題、能力登錄表、4 題完整範例、Q-C1–Q-C12 | 17:45:11 | `6786bd6b…d5aa5` |
| `codex-catalog-round1.md` | Codex | 7 項必要修正、來源處理、去重、detector 可行性、九項資訊缺口、Q-C1–Q-C12 選項 | 17:51:29 | `0350aa9b…bfbf40` |
| `copilot-catalog-round2.md` | Copilot | 接受清單、反提案 CP-1–CP-5、候選待決 U-1–U-4、下一步交付範圍 | 17:52:56 | `c83b817c…41946` |
| `codex-catalog-round2.md` | Codex | 逐點接受或修正；確認待決項目與選項；4 項不同意的語意；補充反例 | 17:56:08 | `de8ddcb7…3babd` |
| `codex-catalog-round3.md` | Codex | 收到已決 U-1–U-4；修訂 baseline 標準、完整契約的邊界與來源保留細節 | 18:10:56 | `87188462…8289b92` |
| `codex-catalog-round4.md` | Codex | 逐一審閱全部 41 題與共同規則；提出 8 組一致性修正，未另開題目或變更已決政策 | 18:33:09 | `31707d6e…0f486ab` |
| `gist-agents-md.md` | gist 原文 | revision `83e12fa`，646 行 | — | `aa023457…e93983` |

- 檔案位於 `~/.copilot/session-state/fae7ca1e-e204-4fcb-b2b4-7bfcad652e0b/files/`，是本機暫存，不納入 repo。
- 兩輪討論中，Codex 都沒有修改 repo（每輪後以 `git status` 確認），也沒有做網路研究。
- 第三、四輪亦限制 Codex 只討論與審閱、不改 repo、不做新網路研究。第四輪審閱快照 SHA-256 為 `21e249cf062b4df28b7acc9a83e76673c346ca7405083db4ebf2fb17e00104c9`；下表修正由 Copilot 套用於該快照之後，不宣稱 Codex 另行審過每個最終位元組。

### 11.1 完整稿的討論與修正

Codex 第四輪明確表示已讀取 8.1–8.41 全部契約及第 1–10 節共同規則，確認九項內容均具實質內容；這是設計文件審閱，不是 CLI／runtime 行為測試。

| 審閱發現 | 本版處理 |
|---|---|
| authority／roles 的 baseline 條件依賴已有指引或已具名節點，反而漏掉缺失案例 | 改依確認的需求判斷，不依待修復產物是否已存在 |
| 同一迴圈有多種評估時，可誤用另一邊界的能力 | 前置條件綁定迴圈、評估邊界、成果／輸入範圍與評估者 |
| CI 允許人工配置材料，但驗收仍強制解析成功及執行紀錄 | 接受有效人工設定證據；只有主張執行才需執行紀錄 |
| 外部指引及 gate 可跳過性使合法宣告被誤判 unknown | 外部證據途徑保留；runtime 未知不否定已完整的宣告主張 |
| 原生分析允許無設定檔，但 accepted forms 不收文字 | 加入具版本與預設依據的文字途徑，不接受只有工具名 |
| 額度允許有限授權範圍，卻強制要求數值閾值 | 分開數值型與授權型的驗收；兩者都不可藉重啟擴大範圍 |
| 多 CLI 的 partial／missing 與層狀態優先順序不一致 | 共用結果順序明確優先；未知必要能力也為 blocked 或 in_use_unsupported |
| gist 的邊界驗證與不變量聲稱已保留，但規則卡內容漏寫 | 補入 static-analysis 的選用改善指引，不新增通過門檻 |

U-1–U-4 的決定仍以第 3 節使用者回答為準；Codex 同意草案完整、或所有修正已套用，都不代表使用者核准；使用者的核准見第 3 節、第 6 節與 8.0 的審查紀錄（2026-11-04）。

**Codex 明確不同意的四項語意**（本文已依此撰寫）：

1. 已設定的評估者，就代表執行時「可用」。
2. 宣告了驗收政策，就完整取代停止與暫停政策。
3. 適用性未知的條件，可以當作不適用而略過。
4. v1 一律不能評估外部影響的復原，即使使用者提供了允許的證據。若要這樣限制，必須是使用者明確的產品選擇。
