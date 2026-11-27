# 回診專用 A4 PDF 輸出 (Vet Report)

Status: Implemented
Introduced: v1.0.0

## Purpose

讓照顧者一鍵產出獸醫看診時能快速掃視的標準化摘要，不需要自己排版試算表或截圖。

## Behavior

- 入口：首頁「回診摘要報告」卡片、紀錄頁（`/records`）右上角「回診報告」按鈕；報告頁左上角「← 返回」回到上一頁，直接開網址（沒有上一頁）時回紀錄頁。底部 Tab 的「紀錄」是血檢與趨勢圖頁，不是報告本身（v1.2 前 Tab 名稱為「報告」、卻連到紀錄頁，報告頁在 App 內沒有入口）。
- 純前端 CSS Print 佈局排版，A4 橫式摘要呈現。血檢表目前列出全部歷史紀錄，紀錄多時是否仍維持單頁尚待實測。
- 「近 14 天」照護量摘要含今天共 14 個日曆日（v1.2 修正：原本多算一天，會出現「15/14 天」）。窗口、體重警報與產出日期都用裝置本地日期計算，取得本地日期前（頁面剛載入的瞬間）摘要顯示「載入中…」。
- 頁尾附完整醫療免責聲明。
- 匯出功能永久免費開放，PetVitals 沒有訂閱分級（見 [../00-product/scope.md](../00-product/scope.md)）。

## AI 回診前照護摘要

Status: Planned
Introduced: 未定
決策：[ADR-010](../05-decisions/ADR-010-ai-blood-test-extraction-and-care-summary.md)
資料契約：[../02-data-contract/care-summary.md](../02-data-contract/care-summary.md)
計算邏輯：[../03-domain-logic/care-summary-input.md](../03-domain-logic/care-summary-input.md)

回診前，把近 6 個月的照護紀錄整理成白話重點，並列出可以問獸醫的問題。讓飼主不用自己從圖表中找出「最近哪裡變了」。摘要只整理資訊，不提供診斷、治療、用藥、劑量或飲食建議。

### 入口與流程

1. 回診報告頁新增「AI 整理（僅供參考）」區塊，預設收合，顯示「產生回診前摘要」按鈕。頁面載入時**不會**自動產生。
2. 第一次使用時顯示說明，使用者勾選「我了解」後才會送出，同一裝置只需勾選一次：
   - 送出的是去識別化的數值與日期，不含貓名、飼主資訊、醫院名稱與備註。
   - 資料會送到境外的 AI 服務（Anthropic）處理。一般情況下 30 天內刪除（違反服務使用政策等特殊情況可能保存更久），不用於訓練模型。
3. 產生期間顯示「整理中…」，報告其餘內容照常顯示。
4. 摘要分三段：
   - **近期變化**：體重、輸液、飲水、食慾、嘔吐、血檢的變化，附期間與數字。
   - **系統提示回顧**：只列出 App 已經觸發的提示（血磷超過建議上限、分期確認提示、體重下滑警報），沒有觸發時不顯示這一段。
   - **可以問獸醫的問題**：1–5 題。
   - 資料不連續或不足時，在最後附上說明（例如「近 6 個月有 40 天有紀錄」）。
5. 區塊標題標示「AI 產生」與產生時間；區塊**正下方**顯示比賽指定的提示文字（見 [醫療免責聲明](../99-reference/medical-disclaimer.md)）。
6. 「重新產生」按鈕會再產生一次，並計入次數。摘要**不保存**，離開頁面後就消失，下次要重新產生。

### 列印

- 區塊上方有「列印時包含 AI 整理」勾選框，預設不勾選。
- 勾選時，摘要與提示文字一起印在報告最後一頁，標題保留「AI 產生（僅供參考）」。
- 未產生摘要時，勾選框不顯示。

### 使用次數與錯誤狀態

- 每隻貓每天最多 5 次（Asia/Taipei 日期），飼主與協作者共用；按鈕旁顯示剩餘次數，用完時停用。
- 近 6 個月有紀錄的天數少於 7 天、而且沒有任何血檢時，不送出，直接顯示「資料不足，至少需要 7 天的照護紀錄或 1 筆血檢」，不計入次數。
- 產生失敗（逾時、服務異常）時，顯示「目前無法產生摘要，請稍後再試」，不計入次數。
- 內容沒有通過檢查（見 [care-summary.md](../02-data-contract/care-summary.md) Validation）時，同樣顯示「目前無法產生摘要，請稍後再試」，但**計入次數**，因為 AI 服務已經處理並收費。
- 不論成功或失敗，每天的總嘗試次數最多 15 次（見 [ai-usage-log.md](../02-data-contract/ai-usage-log.md)），超過後顯示與次數用完相同的訊息。
- 離線時按鈕停用。
- AI 服務無法使用時，報告其餘部分照常顯示與列印。

### 權限

飼主與 accepted caregiver 都能使用，與檢視回診報告的權限相同。

## Related Documents

- AI 摘要：[../02-data-contract/care-summary.md](../02-data-contract/care-summary.md)、[../03-domain-logic/care-summary-input.md](../03-domain-logic/care-summary-input.md)、[../02-data-contract/ai-usage-log.md](../02-data-contract/ai-usage-log.md)
- 架構：`app/(export)/report/[petId]/page.tsx`，詳見 [../04-architecture/frontend.md](../04-architecture/frontend.md)
