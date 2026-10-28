# PushDelivery

Status: Implemented
Introduced: v1.2.0

## Purpose

逐台裝置記錄每一次推播的結果，用來避免重複推播、重試失敗的裝置，並讓使用者在通知中心排查「為什麼沒收到提醒」。決策見 [ADR-008](../05-decisions/ADR-008-push-delivery-log.md)。

## Fields

| Field                 | Type     | Required | Description                                                          |
| :-------------------- | :------- | :------- | :------------------------------------------------------------------- |
| id                    | UUID     | Yes      | Record ID，同時是推播內容裡的 `deliveryId`                           |
| kind                  | enum     | Yes      | `REMINDER` \| `TEST`                                                 |
| userId                | UUID     | Yes      | 收件人（裝置擁有者）                                                 |
| subscriptionId        | UUID     | No       | 對應的 `push_subscriptions.id`，訂閱刪除後變成 null，紀錄保留        |
| reminderId            | UUID     | 條件     | `kind = REMINDER` 時必填、`TEST` 時必為 null；排程刪除時紀錄一併刪除 |
| sentOn                | date     | Yes      | Asia/Taipei 日期                                                     |
| status                | enum     | Yes      | `SENDING` \| `DELIVERED` \| `FAILED` \| `EXPIRED`                    |
| attemptCount          | integer  | Yes      | 嘗試次數，重試時遞增                                                 |
| statusCode            | integer  | No       | 推播服務回應的 HTTP 狀態碼                                           |
| errorMessage          | string   | No       | 推播服務回傳的原因，最多 300 字                                      |
| endpointHost          | string   | No       | 推播服務主機名稱，不存完整 endpoint                                  |
| subscriptionCreatedAt | datetime | No       | 訂閱建立時間，讓使用者分辨是哪一台裝置                               |
| receivedAt            | datetime | No       | 手機 Service Worker 回報收到的時間                                   |
| createdAt / updatedAt | datetime | Yes      | 建立／最後更新時間                                                   |

## Business Rules

- `(reminderId, subscriptionId, sentOn)` 唯一：同一則提醒、同一台裝置、同一天只有一列。`TEST` 的 `reminderId` 為 null，不受此限制。
- 搶投遞權：沒有紀錄時新增；`FAILED`、或 `SENDING` 超過 2 分鐘（視為中途中斷）時可重新搶下並遞增 `attemptCount`；`DELIVERED`、`EXPIRED`、進行中的 `SENDING` 不重送。
- `EXPIRED`（404／410）時同時刪除 `push_subscriptions` 該筆訂閱。
- `receivedAt` 只寫入第一次，重複回報不覆蓋。
- 只有本人能讀自己的紀錄（RLS）；寫入一律經 service role。保留 30 天。

## Related

- [push-subscription.md](./push-subscription.md)
- [reminder-schedule.md](./reminder-schedule.md)
- [../01-requirements/notification.md](../01-requirements/notification.md)
