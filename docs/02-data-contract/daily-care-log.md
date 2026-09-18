# DailyCareLog

Status: Implemented
Introduced: v1.0.0

## Purpose

記錄貓咪每日居家照護數據。

## Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | No | Record ID |
| petId | UUID | Yes | Cat profile ID |
| recordedAt | datetime | Yes | 精確打卡時間點，同一天可有多筆記錄 |
| date | YYYY-MM-DD | Yes | 由 `recordedAt` 依裝置本地時區派生（非 UTC） |
| weightKg | number | No | 體重 |
| subQFluidMl | number | No | 皮下輸液量，預設 0 |
| waterIntakeMl | number | No | 飲水量，預設 0 |
| appetiteLevel | enum | No | `GREAT` \| `NORMAL` \| `POOR` \| `FORCE_FEED`，預設 `NORMAL` |
| vomitCount | integer | No | 嘔吐次數，預設 0 |
| notes | string | No | 備註 |
| createdAt | datetime | No | 建立時間 |

## Validation

- `weightKg`：1.0–15.0 kg
- `subQFluidMl`：0–600 ml（輸入手滑防呆上限，非醫療處方上限）
- `waterIntakeMl`：0–1000 ml
- `vomitCount`：0–20 的整數
- `notes`：最多 100 字
- `date`：格式須為 `YYYY-MM-DD`，且必須是實際存在的日期（例如擋掉 2026-02-30）

## Business Rules

- 同一天允許多筆紀錄（含精確打卡時間），支援一天多次輸液的情境。
- `date` 由 `recordedAt` 依本地時區派生，避免深夜打卡時因時區換算跨日，導致 `date` 與使用者實際感知的日期不一致。
- 離線狀態不可新增紀錄（見 [../04-architecture/pwa.md](../04-architecture/pwa.md)）。
- `subQFluidMl` 超過該貓醫囑量（`CatProfile.subQFluidPrescribedMl`）時僅提示，不阻止儲存——防呆上限（600ml）與醫療處方上限是分開的兩件事。

## Related Domain Logic

- [Weight Loss Alert](../03-domain-logic/weight-alert.md)
- [Fluid Prescription Check](../03-domain-logic/fluid-check.md)
- [Daily Progress](../03-domain-logic/daily-progress.md)
- [Daily Aggregation](../03-domain-logic/daily-aggregation.md)
