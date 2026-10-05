# ReminderSchedule

Status: Implemented
Introduced: v1.2.0

## Purpose

記錄使用者為某隻貓設定的提醒排程（輸液、用藥、每日打卡），供推播排程 job 掃描到期提醒。

## Fields

| Field     | Type           | Required | Description                                                |
| :-------- | :------------- | :------- | :--------------------------------------------------------- |
| id        | UUID           | No       | Record ID                                                  |
| petId     | UUID           | Yes      | Cat profile ID                                             |
| type      | enum           | Yes      | `FLUID` \| `MEDICATION` \| `DAILY_LOG`                     |
| label     | string         | Yes      | 使用者自訂顯示名稱，最多 20 字，例如「早上輸液」「降磷藥」 |
| timeOfDay | string (HH:mm) | Yes      | 本地時間；MVP 僅支援 Asia/Taipei 單一時區；分鐘只能是 5 的倍數 |
| enabled   | boolean        | Yes      | 預設 `true`                                                |
| createdAt | datetime       | No       | 建立時間                                                   |

## Validation

- `label`：最多 20 字
- `timeOfDay`：格式須為 `HH:mm`（00:00–23:59），且分鐘必須是 5 的倍數（00/05/10/.../55）——cron 比對邏輯是把現在時間無條件捨去到最近的 5 分鐘整數再比對，非 5 倍數的時間永遠不會被匹配到，所以直接在 schema 層擋掉；前端表單也用 `step={300}` 限制時間選擇器只能選 5 分鐘間隔

## Business Rules

- MVP 僅支援單一時區（Asia/Taipei），不做使用者裝置時區偵測。
- 提醒的實際發送依賴 Web Push，裝置/瀏覽器相容性限制見 [notification.md](../01-requirements/notification.md)。
- 權限模型跟 `cat_profiles` 一致：owner 可管理（新增/啟用停用/刪除），accepted caregiver 唯讀（能看到這隻貓的提醒排程，但不能修改）。
- 永久免費功能，不綁定訂閱狀態（原本規劃是訂閱 Pro 專屬功能，開發期間改為免費，見 [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md) 的 Update）。
- DB 多一個內部用的 `last_sent_on`（date，可為 null）欄位，不在上面的 Fields 清單裡、也沒有對應到 Zod schema——純粹是 cron job 用來記錄「今天是否已經發送過」，避免排程誤差造成同一則提醒一天內重複推播，不是給使用者看的資料。

## Related Requirements

- [notification.md](../01-requirements/notification.md)

## Related Architecture

- [../04-architecture/backend.md](../04-architecture/backend.md)（cron-job.org 排程觸發、`CRON_SECRET` 驗證）
