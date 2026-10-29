# Daily Aggregation

Status: Implemented
Introduced: v1.0.0
Implementation: `groupDailyCareLogsByDate()` in `lib/clinical.ts`

> 這份文件不在原始 v1.0/v1.1 Spec 裡，是補寫的——程式碼裡已經實作但當時的文件沒有涵蓋到，趁這次拆分文件一併補上，避免「文件沒寫的邏輯」被忽略。

## Purpose

把逐筆的 `DailyCareLog` 依日期彙總成圖表可以直接使用的資料點，供 [Dashboard](../01-requirements/dashboard.md) 的體重/輸液趨勢圖使用。

## Current Rule

- 依 `date` 分組。
- 同一天的 `subQFluidMl`、`waterIntakeMl` 加總。
- 同一天的 `weightKg` 採當天最後一筆有值的記錄（依 `recordedAt` 排序後取最後一筆）。

## Behavior

回傳依日期升冪排序的資料點陣列：

```ts
type DailyCareSummaryPoint = {
  date: string
  weightKg: number | undefined
  totalFluidMl: number
  totalWaterMl: number
}
```

## Important

體重採「當天最後一筆」而非平均或加總，因為體重是狀態量（同一時刻只有一個真實值），加總或平均沒有臨床意義；輸液/飲水量是流量，加總才有意義。

## 週彙總與 7 天平均（Planned）

Status: Planned

供紀錄頁「體重 vs 輸液量」圖在不同時間篩選下使用（見 [../01-requirements/dashboard.md](../01-requirements/dashboard.md)），都以上面的每日資料點為輸入：

- **輸液 7 天平均**（近 3／6 個月）：每個日期取「含當天往前 7 個日曆日內、有紀錄的日子」的每日總輸液量平均。**沒有紀錄的日子不算成 0**：沒打卡代表沒記錄，不代表沒輸液，算成 0 會把平均拉低、誤導成輸液不足。7 天內都沒有紀錄時該點為空。
- **週彙總**（近 1 年／全部）：以週一為一週的開始分組，每週一個點，日期標在該週週一。
  - 體重：該週最後一筆有值的體重，理由同上方 Important（體重是狀態量，不平均）。
  - 輸液量：該週有紀錄日子的每日總量平均，同樣不把沒紀錄的日子算成 0。
  - 該週完全沒有紀錄時不產生資料點。

## Related Data Contract

- [daily-care-log.md](../02-data-contract/daily-care-log.md)
