# Care Summary Input

Status: Planned
Introduced: 未定
Implementation: `buildCareSummaryInput()`（預定放在 `lib/clinical.ts` 或新檔 `lib/ai/care-summary-input.ts`）
決策：[ADR-010](../05-decisions/ADR-010-ai-blood-test-extraction-and-care-summary.md)

## Purpose

把原始照護紀錄與血檢，整理成送給 AI 的去識別化輸入（格式見 [../02-data-contract/care-summary.md](../02-data-contract/care-summary.md)）。

**趨勢數字由程式先算好**，AI 只負責把算好的數字寫成白話，不自己從原始資料計算變化幅度。原因是：

- 讓摘要裡的數字可以驗證、可以測試，而且與紀錄頁圖表用同一套規則。
- 減少 AI 算錯或編出不存在的數字的機會。
- 送出的資料量固定，費用可預期。

## Current Rule

輸入參數：全部 `DailyCareLog`、全部 `BloodTest`、`CatProfile`，以及裝置本地的「今天」（與 [weight-alert.md](./weight-alert.md) 相同，由呼叫端傳入，不在函式內讀系統時間）。

### 期間

- **期間開始日**：直接呼叫紀錄頁既有的 `getPeriodStartDate('6m', today)`（`lib/records-period.ts`），不另外寫一套日期計算，確保摘要與紀錄頁「近 6 個月」永遠一致。
- **有資料起點**：期間開始日，與「期間內第一筆有紀錄的日子」，兩者取較晚的那天。這樣才能處理剛開始使用 App 的使用者：例如 2 個月前才開始記錄，起點就是 2 個月前那天，而不是 6 個月前那段完全空白的日子。
- `first30` 為從「有資料起點」起算的 30 個日曆日；`recent30` 為含今天往前 30 個日曆日。
- **有資料起點到今天不足 60 天時**，兩段會重疊，比較沒有意義：此時 `first30Avg` 與 `changePct` 都為 null，只提供 `recent30Avg`，AI 會在 `dataNote` 說明「紀錄期間較短，暫時無法比較前後變化」。
- 每個 `TrendMetric`（體重、輸液、飲水）各自依自己的資料決定起點。例如體重從 5 個月前開始量、飲水從 1 個月前才開始記，兩者的起點不同。

### 每日數值

沿用 [daily-aggregation.md](./daily-aggregation.md) 的 `groupDailyCareLogsByDate()`：

- 體重：當天最後一筆有值的紀錄。
- 輸液、飲水：當天加總。
- **沒有紀錄的日子不算成 0**（理由同 daily-aggregation.md 的 7 天平均：沒打卡代表沒記錄，不代表沒輸液）。平均只算有紀錄的日子；某一段內完全沒有紀錄時，平均為 null。

### TrendMetric

```
first30Avg  = first30 期間（從有資料起點起算）有紀錄日子的平均
recent30Avg = recent30 期間有紀錄日子的平均
changePct   = (recent30Avg - first30Avg) / first30Avg × 100，四捨五入到小數 1 位
```

### 食慾與嘔吐

- 食慾：分別計算 `recent30` 與前一段 30 天（含今天往前第 31–60 天）各等級出現的**筆數**。
- 嘔吐：同樣兩段的 `vomitCount` 加總。
- 兩段都沒有任何紀錄時，該欄為 null。

### 每週序列

沿用 `groupDailyPointsByWeek()`（週一為一週開始，體重取該週最後一筆，輸液取有紀錄日子的平均），再加上飲水的週平均。

### 血檢與規則結果

- `bloodTests`：期間內全部血檢，依 `compareBloodTestsChronologically()` 排序。只送數值與日期，不送 `hospitalName`、`notes`。
- `ruleResults.phosphorus`：對**全部資料中最新一筆**血檢（不限於期間內）呼叫 `evaluatePhosphorusStatus()`，與分期提示、回診報告的「最新一筆」一致。沒有任何血檢時為 null。
- `ruleResults.stageHint`：`evaluateStageHint()` 的結果。
- `ruleResults.weightAlert`：`checkWeightLossAlert(logs, today)` 的結果（7 天視窗，不是 6 個月）。

### 去識別化

輸出物件只能包含 care-summary.md Input Schema 列出的欄位。用 Zod `.strict()` 驗證，多出任何欄位（例如未來有人不小心把 `name` 加進去）就拋錯，不送出。

## Example

近 30 天平均體重 4.2 kg，最前 30 天平均 4.5 kg：

```
changePct = (4.2 - 4.5) / 4.5 × 100 = -6.7
```

AI 收到 `{ first30Avg: 4.5, recent30Avg: 4.2, changePct: -6.7 }`，可能寫出：「體重從約 4.5 kg 降到約 4.2 kg（約 -6.7%）」。

## Important

這裡算出的趨勢只是描述資料，不是臨床判斷，也不設任何「異常」閾值。是否異常、是否需要調整照護，交給獸醫師判斷；摘要只把變化列成「可以問獸醫的問題」。

## Related Data Contract

- [care-summary.md](../02-data-contract/care-summary.md)
- [daily-care-log.md](../02-data-contract/daily-care-log.md)
- [blood-test.md](../02-data-contract/blood-test.md)
