# BloodTest

Status: Implemented
Introduced: v1.0.0

## Purpose

記錄每次回診的生化血檢指標，是 IRIS 分期血磷警示的資料來源。

## Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | No | Record ID |
| petId | UUID | Yes | Cat profile ID |
| testDate | YYYY-MM-DD | Yes | 檢驗日期 |
| hospitalName | string | No | 醫院名稱，最多 30 字 |
| bun | number | Yes | 尿素氮 (mg/dL) |
| creatinine | number | Yes | 肌酸酐 (mg/dL) |
| sdma | number | No | 早期腎指標 (ug/dL) |
| phosphorus | number | Yes | 血磷 (mg/dL) |
| hct | number | No | 紅血球容積比 (%) |
| notes | string | No | 備註，最多 100 字 |
| createdAt | datetime | No | 建立時間 |

## Validation

- `bun`：大於 0，最多 300
- `creatinine`：大於 0，最多 30
- `sdma`：大於 0，最多 100（optional）
- `phosphorus`：大於 0，最多 30
- `hct`：大於 0，最多 70（optional）
- `testDate`：格式須為 `YYYY-MM-DD`，且必須是實際存在的日期

### 數值必須大於 0（v1.2 修正）

- `bun`、`creatinine`、`phosphorus` 改為大於 0（上限不變）；`sdma`、`hct` 有填時也必須大於 0。這些指標在活體上不可能為 0，0 幾乎一定是「沒填」或輸入錯誤，而 0 會被血磷判斷為「正常」，造成錯誤的臨床提示。
- Zod 與資料庫 CHECK 一起改（`20261030000000_require_positive_blood_test_values.sql`）。新增表單這三個必填欄位預設為空白，不再預設 0。
- **寫入與讀取用不同的 schema**：新增、編輯用嚴格的 `BloodTestSchema`；從資料庫讀取用 `StoredBloodTestSchema`，仍接受 0。讀取若也用嚴格規則，既有的 0 值紀錄會讓紀錄頁、報告、甚至該筆的編輯頁都拋錯，使用者就無法在 App 裡把它改正。
- **套用 migration 前要先處理既有的 0 值資料**，否則加上 CHECK 會失敗；migration 開頭會先檢查，有 0 值資料時以清楚的訊息中止。2026-10-29 唯讀查詢時，正式資料庫有 1 筆（BUN 0、血磷 0），需由使用者編輯成正確數值或刪除。

## Business Rules

- 所有數值需以標示單位輸入（mg/dL、ug/dL、%）；若醫院報告使用其他單位制（例如 SI 制 umol/L），需自行換算後填入。目前不做單位偵測與自動換算，未來如需支援須在 schema 補充 `unit` 欄位。
- 紀錄建立後可由飼主或協作者編輯、刪除；編輯不能更改 `petId`（不能把紀錄搬到另一隻貓）。
- 「最新一筆血檢」先依 `testDate`、同一天再依 `createdAt` 判斷，以後建立的那筆為準（`compareBloodTestsChronologically()`；讀取時資料庫也用同樣的雙排序鍵）。v1.2 前只依日期排序，同一天兩筆時分期提示與報告用哪一筆不確定。
- 血磷是否超標由 [Phosphorus Status](../03-domain-logic/phosphorus.md) 依 `CatProfile.irisStage` 計算，非本 schema 自帶邏輯。

## Related Domain Logic

- [Phosphorus Status](../03-domain-logic/phosphorus.md)

## Related Reference

- [IRIS Reference](../99-reference/iris.md)
