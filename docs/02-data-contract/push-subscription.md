# PushSubscription

Status: Planned
Introduced: v1.2.0（尚未動工）

## Purpose

儲存使用者瀏覽器/裝置的 Web Push 訂閱憑證，供伺服器端推播 job 使用。

## Fields

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| id | UUID | No | Record ID |
| userId | UUID | Yes | 綁定 `auth.users.id` |
| endpoint | string (url) | Yes | 瀏覽器 Push service 的推播端點 |
| p256dh | string | Yes | Web Push 加密公鑰 |
| auth | string | Yes | Web Push 加密 auth secret |
| createdAt | datetime | No | 建立時間 |

## Validation

- `endpoint`：合法 URL 格式

## Business Rules

- 一個使用者可能有多筆訂閱（多裝置/多瀏覽器），發送提醒時需對該使用者所有有效訂閱都嘗試發送。
- `endpoint`/`p256dh`/`auth` 屬於推播憑證，不應出現在任何前端可讀的一般 API 回應中，僅供伺服器端推播 job 使用。

## Related Requirements

- [notification.md](../01-requirements/notification.md)

## Related Architecture

- [../04-architecture/backend.md](../04-architecture/backend.md)（VAPID 金鑰管理）
