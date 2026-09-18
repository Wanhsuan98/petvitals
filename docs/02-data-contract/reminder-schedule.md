# ReminderSchedule

Status: Planned
Introduced: v1.2.0（尚未動工）

## Purpose

記錄使用者為某隻貓設定的提醒排程（輸液、用藥、每日打卡），供推播排程 job 掃描到期提醒。

## Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | No | Record ID |
| petId | UUID | Yes | Cat profile ID |
| type | enum | Yes | `FLUID` \| `MEDICATION` \| `DAILY_LOG` |
| label | string | Yes | 使用者自訂顯示名稱，最多 20 字，例如「早上輸液」「降磷藥」 |
| timeOfDay | string (HH:mm) | Yes | 本地時間；MVP 僅支援 Asia/Taipei 單一時區 |
| enabled | boolean | Yes | 預設 `true` |
| createdAt | datetime | No | 建立時間 |

## Validation

- `label`：最多 20 字
- `timeOfDay`：格式須為 `HH:mm`（00:00–23:59）

## Business Rules

- MVP 僅支援單一時區（Asia/Taipei），不做使用者裝置時區偵測。
- 提醒的實際發送依賴 Web Push，裝置/瀏覽器相容性限制見 [notification.md](../01-requirements/notification.md)。

## Related Requirements

- [notification.md](../01-requirements/notification.md)

## Related Architecture

- [../04-architecture/backend.md](../04-architecture/backend.md)（Vercel Cron 掃描與發送機制）
