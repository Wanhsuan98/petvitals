# AiUsageLog

Status: Planned
Introduced: 未定
決策：[ADR-010](../05-decisions/ADR-010-ai-blood-test-extraction-and-care-summary.md)

## Purpose

記錄每一次 AI 功能呼叫，用來在伺服器端執行「每隻貓每天的使用上限」，並追蹤失敗率與 token 用量（費用）。**不保存任何照片、prompt 或 AI 輸出內容**，只保存次數與狀態。

## Fields

| Field                 | Type     | Required | Description                                                                                                                                                                        |
| :-------------------- | :------- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                    | UUID     | Yes      | Record ID                                                                                                                                                                          |
| petId                 | UUID     | Yes      | 用在哪一隻貓（上限以貓為單位計算）                                                                                                                                                 |
| userId                | UUID     | Yes      | 由誰發起（飼主或 accepted caregiver）                                                                                                                                              |
| feature               | enum     | Yes      | `BLOOD_TEST_EXTRACTION` \| `CARE_SUMMARY`                                                                                                                                          |
| usedOn                | date     | Yes      | Asia/Taipei 日期，上限依這個日期計算                                                                                                                                               |
| status                | enum     | Yes      | `PENDING` \| `SUCCEEDED` \| `REFUSED` \| `INVALID` \| `FAILED`。`INVALID`：API 有回應，但輸出沒通過 schema 或內容檢查                                                              |
| model                 | string   | No       | 實際回應的模型 ID（有 fallback 時記錄最後回應的模型），最多 50 字                                                                                                                  |
| inputTokens           | integer  | No       | 輸入 token 數，供費用追蹤                                                                                                                                                          |
| outputTokens          | integer  | No       | 輸出 token 數                                                                                                                                                                      |
| errorCode             | string   | No       | 失敗原因代碼。`FAILED` 時例如 `RATE_LIMITED`、`TIMEOUT`；`INVALID` 時例如 `SCHEMA_MISMATCH`、`BANNED_PATTERN`、`UNTRIGGERED_ALERT`。最多 50 字，不存錯誤訊息全文，也不存命中的內容 |
| createdAt / updatedAt | datetime | Yes      | 建立／最後更新時間                                                                                                                                                                 |

## Daily Limits

| feature                 | 每隻貓每天上限 | 每天總嘗試上限（含失敗） |
| :---------------------- | -------------: | -----------------------: |
| `BLOOD_TEST_EXTRACTION` |             10 |                       30 |
| `CARE_SUMMARY`          |              5 |                       15 |

- **每天上限**：使用者看到的「今天還剩幾次」。
- **總嘗試上限**：所有狀態都計入，包含 `FAILED`，訂為每天上限的 3 倍。這是費用的硬上限：API 持續逾時或出錯時，使用者仍可以重試，但不會無限次重試。到達總嘗試上限時，顯示與次數用完相同的訊息。

兩組上限在 `lib/schemas.ts`（`AI_DAILY_LIMITS`）與資料庫函式 `claim_ai_usage` 各寫一份。Postgres 無法引用 TypeScript 常數，調整上限時兩邊要一起改（與 `MAX_CAREGIVERS_PER_PET` 同樣的維護方式）。

## Business Rules

- **先占名額，再呼叫 AI**：伺服器呼叫 Claude API 前，先呼叫 `claim_ai_usage(pet_id, feature)` 新增一筆 `PENDING`，回傳 `id`；超過每天上限或總嘗試上限時回傳錯誤，不呼叫 AI。呼叫結束後用 `finish_ai_usage(id, status, ...)` 更新狀態與 token 數。
- **計入每天上限的狀態**：`PENDING`、`SUCCEEDED`、`REFUSED`、`INVALID`。判斷原則是「API 有沒有處理並收費」：`REFUSED` 和 `INVALID` 時 API 都已經處理並收費，所以要計入，否則重複產生不合格的輸出會讓費用沒有上限。只有 `FAILED`（逾時、連線錯誤、限流、API 5xx 這類 API 沒有完成處理的情況）不計入，避免使用者因為系統問題被扣次數；`FAILED` 仍然受總嘗試上限限制。
- **`PENDING` 一律計入**，包括中途中斷、永遠停在 `PENDING` 的紀錄。寧可保守少給一次，也不要讓同時送出的請求繞過上限。
- **併發**：`claim_ai_usage` 用 `pg_advisory_xact_lock` 依 `(pet_id, feature)` 序列化，避免兩個同時送出的請求都通過檢查（與 `enforce_caregiver_cap` 同樣的做法，見 [../04-architecture/backend.md](../04-architecture/backend.md)）。
- **權限**：`claim_ai_usage` 是 `security definer` 函式，內部以 `owns_cat_profile(pet_id, auth.uid())` 或 `is_accepted_caregiver(pet_id, auth.uid())` 確認權限，沒有權限時拒絕。`userId` 一律取自 `auth.uid()`，不接受呼叫端傳入。
- **RLS**：飼主與 accepted caregiver 可以 `select` 自己這隻貓的紀錄，用於顯示「今天還剩幾次」。`authenticated` 角色不能直接 `insert`／`update`／`delete`，所有寫入都透過上述兩個函式。新表記得補 `authenticated`、`service_role` 的 GRANT。
- **保留期間**：90 天，每天清除一次更早的紀錄，可沿用推播清除的排程。
- `finish_ai_usage` 只能把 `PENDING` 改成其他狀態，而且只能由建立那筆紀錄的同一個使用者呼叫。

## Related

- [blood-test-extraction.md](./blood-test-extraction.md)
- [care-summary.md](./care-summary.md)
- [../01-requirements/blood-test.md](../01-requirements/blood-test.md#ai-血檢報告辨識)
- [../01-requirements/report.md](../01-requirements/report.md#ai-回診前照護摘要)
