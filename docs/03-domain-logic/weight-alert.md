# Weight Loss Alert

Status: Implemented
Introduced: v1.0.0
Implementation: `checkWeightLossAlert()` in `lib/clinical.ts`
Tests: `lib/clinical.test.ts`

## Purpose

偵測近期體重是否出現顯著下降，主動提示照顧者留意，而不是要求照顧者自己盯著體重數字看。

## Current Rule

- Window：7 天（預設，可傳參數覆寫）
- Baseline：視窗內最高體重
- Alert threshold：下降 >= 3%

## Formula

```
dropRate = (maxWeight - latestWeight) / maxWeight × 100
```

## Behavior

- 若 `dropRate >= 3` → `isAlert = true`
- 否則 → `isAlert = false`
- 視窗內少於 2 筆有效體重記錄時，不判定警報（`isAlert = false, dropRate = 0`）

## Important

此規則為產品內部趨勢提醒，不代表醫療診斷。呼叫端可直接傳入完整歷史 logs，日期窗口篩選在函式內處理，不需要呼叫端自行先過濾。

## Example

最高體重：5.0 kg
最新體重：4.8 kg

```
(5.0 - 4.8) / 5.0 × 100 = 4%  →  Alert
```

## Related Data Contract

- [daily-care-log.md](../02-data-contract/daily-care-log.md)
