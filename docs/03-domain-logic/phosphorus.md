# Phosphorus Status

Status: Implemented
Introduced: v1.0.0（下限與四種狀態：未定，見 [ADR-011](../05-decisions/ADR-011-kidney-monitoring-data-model.md) 第 1 階段）
Implementation: `evaluatePhosphorusStatus()`、`getPhosphorusTarget()` in `lib/clinical.ts`
Tests: `lib/clinical.test.ts`

## Purpose

依貓咪目前的 IRIS 分期，比對血磷檢驗值是否落在**腎病控制目標**內，偏高或偏低都提示和獸醫師討論。

## 腎病控制目標 ≠ 檢驗室參考區間

- **腎病控制目標**：IRIS 對腎貓的治療目標，依分期不同，例如第 2 期為 2.7–4.5 mg/dL。本文件的判讀只用這個。
- **檢驗室參考區間**：報告上印的一般健康貓範圍，例如 IDEXX Catalyst 的 3.1–7.5 mg/dL。各實驗室和儀器不同。

兩者用途不同，畫面上必須分開呈現，不能混用。例如血磷 5.5 落在檢驗室參考區間內，但對第 2 期的腎貓來說，已經高於控制目標。檢驗室參考區間會在 ADR-011 第 2 階段跟著每筆檢驗結果一起保存。

## Current Rule

數值整理自 IRIS 2026 Treatment Recommendation for CKD In Cats，僅供參考。閾值來源與版本追蹤見 [../99-reference/iris.md](../99-reference/iris.md)。

| Stage   | Target Min (mg/dL) | Target Max (mg/dL) |
| :------ | -----------------: | -----------------: |
| STAGE_1 |                2.7 |                4.5 |
| STAGE_2 |                2.7 |                4.5 |
| STAGE_3 |                2.7 |                5.0 |
| STAGE_4 |                2.7 |                6.0 |

## Behavior

回傳四種狀態之一，以及這個分期的控制目標（`target.min`、`target.max`）：

| 狀態        | 條件                        | 畫面文字                                                               |
| :---------- | :-------------------------- | :--------------------------------------------------------------------- |
| `HIGH`      | `pValue > max`              | 高於控制目標，請和獸醫師討論是否需要調整降磷方式                       |
| `LOW`       | `pValue < 2.7`              | 低於控制目標，血磷過低也需要留意，請和獸醫師討論目前的降磷方式是否合適 |
| `IN_TARGET` | `2.7 ≤ pValue ≤ max`        | 在控制目標內，並列出目標範圍                                           |
| `INVALID`   | `pValue ≤ 0` 或不是有限數值 | 數值無效，請編輯這筆紀錄                                               |

- **邊界值**：等於上限或等於 2.7 都算「在控制目標內」。上限沿用 IRIS 的「above」寫法；下限 IRIS 寫「不要低於 2.7」，所以 2.7 本身不算偏低。
- **`INVALID` 的由來**：v1.2 前表單預設為 0，舊資料可能還有血磷 0（讀取用的 `StoredBloodTestSchema` 仍接受）。0 代表「沒填」，判成「偏低」會誤導，所以另外處理。
- `HIGH`、`LOW` 在畫面上使用相同的醒目樣式（`isPhosphorusOutOfTarget()`），`INVALID` 用中性樣式。
- 訊息裡的分期顯示為「第 N 期」，不再顯示 `STAGE_N` 代碼。
- **v1.2 前的問題**：只判斷是否高於上限，所以血磷 2.0 也會顯示「血磷控制良好」。

## 趨勢圖

血磷圖畫兩條虛線：紅色是目前分期的上限，灰色是下限 2.7。圖下方說明這是腎病控制目標，不是檢驗室參考區間（見 [../01-requirements/dashboard.md](../01-requirements/dashboard.md)）。

## Important

`irisStage` 為使用者依獸醫診斷結果手動設定值，非系統自動判定。本比對僅供參考，不構成醫療建議，訊息文字本身也明確標註「僅供參考」。訊息只建議「和獸醫師討論」，不建議具體的藥物或飲食調整。

## Related Data Contract

- [cat-profile.md](../02-data-contract/cat-profile.md)（`irisStage` 欄位）
- [blood-test.md](../02-data-contract/blood-test.md)（`phosphorus` 欄位）

## Related Reference

- [../99-reference/iris.md](../99-reference/iris.md)
