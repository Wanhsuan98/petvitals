# CatProfile

Status: Implemented
Introduced: v1.0.0

## Purpose

貓咪基本檔案：身分資料與醫囑設定，是其他所有資料（日誌、血檢）的錨點。

## Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | Yes | Record ID |
| ownerId | UUID | Yes | 綁定 Supabase `auth.users.id`，供 RLS 權限隔離使用 |
| name | string | Yes | 貓咪名字，1–20 字 |
| birthYear | int | Yes | 出生年份，2000 ~ 今年+1 |
| targetWeightKg | number | Yes | 目標體重，必須 > 0 |
| irisStage | enum | Yes | `STAGE_1` \| `STAGE_2` \| `STAGE_3` \| `STAGE_4`，預設 `STAGE_2` |
| dailyFluidTargetMl | number | Yes | 每日飲水目標（不含輸液），50–1000，預設 200 |
| subQFluidPrescribedMl | number | Yes | 醫囑單次皮下輸液量，0–500，預設 100 |
| subQFluidFrequencyPerDay | int | Yes | 醫囑每日輸液次數，1–3，預設 1 |
| createdAt | datetime | No | 建立時間 |

## Validation

- `name`：1–20 字
- `birthYear`：2000 到今年 + 1 之間的整數。Zod 在每次驗證時才計算「今年」（v1.2 前在模組載入時就固定，長時間執行的程序跨年後會擋掉新的上限）；資料庫也有相同的 CHECK，以台北時區計算年份
- `targetWeightKg`：必須大於 0
- `irisStage`：僅限四個 IRIS 分期字串
- `dailyFluidTargetMl`：50–1000
- `subQFluidPrescribedMl`：0–500
- `subQFluidFrequencyPerDay`：1–3 的整數

## Business Rules

- `irisStage` 由使用者依獸醫診斷結果手動設定/更新，系統不做自動診斷判定。設定頁的分期選單會在每個選項旁顯示 IRIS 2026 貓的肌酸酐與 SDMA 參考區間，並在選單下方附警語（需獸醫師診斷、單一數值不能自行決定、SDMA 區間依 IDEXX 方法訂定）。區間來源與驗證紀錄見 [../99-reference/iris.md](../99-reference/iris.md)。最新血檢落在更高分期區間時，血檢頁會提示確認分期，但不會自動修改，見 [Stage Review Hint](../03-domain-logic/stage-hint.md)。
- 設定頁平時以唯讀摘要顯示貓咪資料，按「編輯」才切成表單（儲存／取消）；尚未建立貓咪資料時直接顯示表單。協作者只看得到唯讀摘要。
- `ownerId` 目前有資料庫層級 `unique` 約束，一個帳號只能有一筆 `cat_profiles`（一人一貓），詳見 [ADR-001](../05-decisions/ADR-001-single-cat-mvp.md)。

## Related Domain Logic

- [Phosphorus Status](../03-domain-logic/phosphorus.md)（依 `irisStage` 判斷血磷閾值）
- [Daily Progress](../03-domain-logic/daily-progress.md)（依醫囑量計算當日達成度）

## Related Requirements

- [blood-test.md](../01-requirements/blood-test.md)
- [daily-care.md](../01-requirements/daily-care.md)
