# Daily Progress

Status: Implemented
Introduced: v1.0.0
Implementation: `calculateDailyProgress()` in `lib/clinical.ts`
Tests: `lib/clinical.test.ts`

## Purpose

把當天所有打卡記錄彙總成「輸液達成度」與「飲水達成度」兩個百分比，讓照顧者一眼看出今天還缺多少。

## Current Rule

```
fluidTarget = subQFluidPrescribedMl × subQFluidFrequencyPerDay

fluidProgressPercent = min(100, round(totalFluidMl / fluidTarget × 100))
waterProgressPercent = min(100, round(totalWaterMl / dailyFluidTargetMl × 100))
```

`totalFluidMl` / `totalWaterMl` 為當天所有 `DailyCareLog` 的加總。

## Behavior

- 兩個達成度分開計算、分開呈現，不合併為單一總水分進度條——因為皮下輸液與飲水在臨床意義上是不同的兩件事，混在一起會讓照顧者誤判。
- 兩者都上限封頂在 100%，超過目標不會顯示超過 100 的數字。
- `fluidTarget` 為 0 時（理論上不應發生，因 schema 有下限），`fluidProgressPercent` 回傳 0 避免除以零。

## Important

此為單日彙總指標，非累積指標；跨日趨勢請見 [daily-aggregation.md](./daily-aggregation.md)。

## Related Data Contract

- [cat-profile.md](../02-data-contract/cat-profile.md)（`subQFluidPrescribedMl`、`subQFluidFrequencyPerDay`、`dailyFluidTargetMl`）
- [daily-care-log.md](../02-data-contract/daily-care-log.md)
