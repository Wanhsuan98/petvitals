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

## Related Data Contract

- [daily-care-log.md](../02-data-contract/daily-care-log.md)
