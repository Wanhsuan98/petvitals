# Stage Review Hint

Status: Implemented
Introduced: v1.2.0
Implementation: `evaluateStageHint()` in `lib/clinical.ts`
Tests: `lib/clinical.test.ts`

## Purpose

最近一次血檢的肌酸酐或 SDMA 落在比目前設定更高的 IRIS 分期區間時，提示使用者「可能需要和獸醫師確認分期」。只是提示，**絕不自動修改 `CatProfile.irisStage`**。

## Current Rule

區間為 IRIS Staging of CKD（Modified 2026）貓的欄位，來源與驗證見 [../99-reference/iris.md](../99-reference/iris.md)。

| Stage   | 肌酸酐 (mg/dL) | SDMA (µg/dL) |
| :------ | :------------- | :----------- |
| STAGE_1 | < 1.6          | < 18         |
| STAGE_2 | 1.6–2.8        | 18–25        |
| STAGE_3 | 2.9–5.0        | 26–38        |
| STAGE_4 | > 5.0          | > 38         |

- IRIS 區間以一位小數／整數表示，2.8 與 2.9、25 與 26 之間沒有定義；實作以「小於下一期下限」切分（例如 2.85 歸 STAGE_2、25.5 歸 STAGE_2）。
- 肌酸酐與 SDMA 各自對應一個分期，取**較高者**（IRIS 兩項指標不一致時建議以較高一期為準）。
- 較高者高於目前設定的分期才提示；回傳 `markers` 標示是哪一項（或兩項）指標造成。
- **永遠不提示「降級」**：數值變好可能來自輸液、飲水狀態或治療，是否改分期由獸醫師決定。

## Behavior

- 只比對血檢紀錄頁中**最新的一筆**，不看歷史。同一天有多筆時以後建立的那筆為準，見 [../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)。
- 顯示在 `/records` 頁面頂部，語氣為「可能需要和獸醫師確認」，不使用「診斷」「應該調整為」等措辭。
- SDMA 為選填，未填時只比對肌酸酐。

## Important

- IRIS 分期需在飲水充足、狀態穩定時以多次檢驗判斷；單次數值不能決定分期。提示文字已註明這點。
- SDMA 區間依 IDEXX 檢驗方法訂定，其他廠牌不一定適用。
- 本提示僅供參考，不構成醫療建議，見 [../99-reference/medical-disclaimer.md](../99-reference/medical-disclaimer.md)。

## Related

- 決策：[ADR-006](../05-decisions/ADR-006-stage-review-hint.md)
- 資料契約：[../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)、[../02-data-contract/cat-profile.md](../02-data-contract/cat-profile.md)
