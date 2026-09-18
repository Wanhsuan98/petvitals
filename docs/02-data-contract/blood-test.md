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

- `bun`：0–300
- `creatinine`：0–30
- `sdma`：0–100（optional）
- `phosphorus`：0–30
- `hct`：0–70（optional）
- `testDate`：格式須為 `YYYY-MM-DD`，且必須是實際存在的日期

## Business Rules

- 所有數值需以標示單位輸入（mg/dL、ug/dL、%）；若醫院報告使用其他單位制（例如 SI 制 umol/L），需自行換算後填入。目前不做單位偵測與自動換算，未來如需支援須在 schema 補充 `unit` 欄位。
- 血磷是否超標由 [Phosphorus Status](../03-domain-logic/phosphorus.md) 依 `CatProfile.irisStage` 計算，非本 schema 自帶邏輯。

## Related Domain Logic

- [Phosphorus Status](../03-domain-logic/phosphorus.md)

## Related Reference

- [IRIS Reference](../99-reference/iris.md)
