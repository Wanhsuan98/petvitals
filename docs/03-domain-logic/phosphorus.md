# Phosphorus Status

Status: Implemented
Introduced: v1.0.0
Implementation: `evaluatePhosphorusStatus()` in `lib/clinical.ts`
Tests: `lib/clinical.test.ts`

## Purpose

依貓咪目前的 IRIS 分期，比對本次血磷檢驗值是否超出建議控制上限。

## Current Rule

血磷控制上限整理自 IRIS (International Renal Interest Society) 分期照護建議，僅供參考，實際數值可能隨指引版本更新而調整，正式引用前請與獸醫師核對當前版本的臨床指引。目前使用的閾值來源與版本追蹤見 [../99-reference/iris.md](../99-reference/iris.md)。

| Stage | Target Max (mg/dL) |
| :--- | ---: |
| STAGE_1 | 4.5 |
| STAGE_2 | 4.5 |
| STAGE_3 | 5.0 |
| STAGE_4 | 6.0 |

## Behavior

- `pValue > targetMax` → `isHigh = true`，回傳建議諮詢獸醫師的訊息
- 否則 → `isHigh = false`，回傳「控制良好」訊息

## Important

`irisStage` 為使用者依獸醫診斷結果手動設定值，非系統自動判定。本比對僅供參考，不構成醫療建議，訊息文字本身也明確標註「僅供參考」。

## Related Data Contract

- [cat-profile.md](../02-data-contract/cat-profile.md)（`irisStage` 欄位）
- [blood-test.md](../02-data-contract/blood-test.md)（`phosphorus` 欄位）

## Related Reference

- [../99-reference/iris.md](../99-reference/iris.md)
