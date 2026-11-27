# CareSummary

Status: Planned
Introduced: 未定
決策：[ADR-010](../05-decisions/ADR-010-ai-blood-test-extraction-and-care-summary.md)

## Purpose

定義「回診前照護摘要」送給 AI 的輸入（已去識別化）與 AI 的輸出格式。輸入怎麼從原始紀錄算出來，見 [../03-domain-logic/care-summary-input.md](../03-domain-logic/care-summary-input.md)。摘要**不保存**到資料庫，每次按下「產生摘要」都重新產生。

## Input Schema（送給 AI 的資料）

只包含下列欄位。**不包含**貓名、出生年、飼主或協作者資訊、醫院名稱、任何 `notes` 自由文字、`petId` 等識別碼。

```ts
type CareSummaryInput = {
  period: { start: string; end: string; days: number } // YYYY-MM-DD，近 6 個月
  irisStage: 'STAGE_1' | 'STAGE_2' | 'STAGE_3' | 'STAGE_4'
  prescription: {
    targetWeightKg: number
    dailyFluidTargetMl: number
    subQFluidPrescribedMl: number
    subQFluidFrequencyPerDay: number
  }
  logging: { daysWithLogs: number; daysInPeriod: number } // 紀錄天數，讓 AI 知道資料完整度
  weight: TrendMetric | null
  subQFluid: TrendMetric | null // 每日總輸液量（只算有紀錄的日子）
  waterIntake: TrendMetric | null
  appetite: { recent30: AppetiteCounts; previous30: AppetiteCounts } | null
  vomit: { recent30Total: number; previous30Total: number } | null
  weeklySeries: {
    weekStart: string
    weightKg: number | null
    avgSubQFluidMl: number | null
    avgWaterMl: number | null
  }[]
  bloodTests: {
    testDate: string
    bun: number
    creatinine: number
    sdma: number | null
    phosphorus: number
    hct: number | null
  }[] // 期間內全部，依日期升冪
  ruleResults: {
    phosphorus: {
      status: 'LOW' | 'IN_TARGET' | 'HIGH' | 'INVALID'
      latestValue: number
      targetMin: number
      targetMax: number
    } | null
    stageHint: { suggestedStage: string } | null // 沒有提示時為 null
    weightAlert: { isAlert: boolean; dropRate: number }
  }
}

type TrendMetric = {
  first30Avg: number | null // 「有資料起點」之後 30 天的平均，起點定義見 care-summary-input.md
  recent30Avg: number | null // 最近 30 天的平均
  changePct: number | null // (recent30Avg - first30Avg) / first30Avg × 100，任一邊為 null 時為 null
}

type AppetiteCounts = { GREAT: number; NORMAL: number; POOR: number; FORCE_FEED: number }
```

## AI Output Schema

用 structured output 固定格式，伺服器端再用 Zod（`CareSummaryOutputSchema`）驗證。

```ts
type CareSummaryOutput = {
  recentChanges: {
    metric: 'WEIGHT' | 'SUBQ_FLUID' | 'WATER' | 'APPETITE' | 'VOMIT' | 'BLOOD_TEST'
    text: string
  }[] // 0–6 項，每項最多 120 字
  systemAlerts: { source: 'PHOSPHORUS' | 'STAGE_HINT' | 'WEIGHT_ALERT'; text: string }[] // 只能對應 ruleResults 中已觸發的項目，每項最多 120 字
  questionsForVet: string[] // 1–5 題，每題最多 80 字
  dataNote: string | null // 資料不足或紀錄不連續時的說明，最多 120 字
}
```

## Validation（伺服器端，AI 回傳後）

AI 的輸出要通過以下檢查才會顯示；任何一項不通過，整份摘要都不顯示，記為 `INVALID` 並提示「請稍後再試」。API 已經處理並收費，所以**計入使用次數**（見 [ai-usage-log.md](./ai-usage-log.md)）：

1. 符合 `CareSummaryOutputSchema`（格式、項目數、字數上限）。
2. `systemAlerts` 的每個 `source`，都必須在 `ruleResults` 中確實觸發：`phosphorus.status` 為 `HIGH` 或 `LOW`、`stageHint` 不為 null、`weightAlert.isAlert`。AI 不能自己新增系統提示。
3. **禁用寫法檢查**：比對的是「寫法」，不是單一詞彙。例如「輸液劑量是否需要調整？」「醫囑處方輸液量」是正常的問句或資料描述，不能被擋。初版規則如下，以正規表達式實作，放在程式常數裡，之後依測試結果增修：

   | 類別 | 擋下的寫法（示意）                                                                                          | 不擋的例子                                        |
   | :--- | :---------------------------------------------------------------------------------------------------------- | :------------------------------------------------ |
   | 診斷 | `診斷為`、`確診`、`已進入第\s*[1-4一二三四]\s*期`、`已經是第\s*[1-4一二三四]\s*期`                          | 「已進入第 3 週」、「目前設定為第 2 期」          |
   | 預後 | `存活`、`剩下.{0,6}(天\|個月\|年)`、`預後`                                                                  | 「近 30 天」                                      |
   | 處方 | `建議.{0,12}\d+(\.\d+)?\s*(ml\|mL\|毫升\|mg\|毫克\|g\|公克)`、`mg/kg`、`建議(改吃\|換成\|停用\|停藥\|加藥)` | 「輸液劑量是否需要調整？」、「醫囑輸液量 100 ml」 |
   | 產品 | 寵物食品、藥品的品牌與產品名稱清單                                                                          | —                                                 |

4. **同一份清單也寫進 system prompt**，讓模型先避開這些寫法，不只靠事後檢查擋下。

禁用寫法檢查只是最後一道保險，主要的控制仍然是 prompt 與結構化輸出。實作時要建立一組固定測試資料，包含上表「不擋的例子」，每次調整 prompt、規則或換模型後都要重跑，並追蹤 `INVALID` 的比例。

## Business Rules

- 期間固定為含今天往前 6 個月，直接使用紀錄頁的 `getPeriodStartDate('6m', today)`（`lib/records-period.ts`），計算方式見 [../01-requirements/blood-test.md](../01-requirements/blood-test.md#時間篩選)。不受紀錄頁目前選的篩選影響。
- 期間內有紀錄的天數少於 7 天、而且沒有任何血檢時，不呼叫 AI，直接顯示「資料不足，至少需要 7 天的照護紀錄或 1 筆血檢」，不計入使用次數。
- 臨床判斷（`ruleResults`）一律由現有規則計算後傳入：[phosphorus.md](../03-domain-logic/phosphorus.md)、[stage-hint.md](../03-domain-logic/stage-hint.md)、[weight-alert.md](../03-domain-logic/weight-alert.md)。AI 只能引用，不能推翻。

## Related

- [../03-domain-logic/care-summary-input.md](../03-domain-logic/care-summary-input.md)
- [ai-usage-log.md](./ai-usage-log.md)
- [../01-requirements/report.md](../01-requirements/report.md#ai-回診前照護摘要)
