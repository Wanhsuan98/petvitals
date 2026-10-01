# 主動提醒排程 (Notification / Reminder Scheduling)

Status: Implemented
Introduced: v1.2.0

## Purpose

Excel 或試算表不會主動提醒使用者「該打輸液了」，照顧者必須自己記得檢查。這個功能把提醒排程做進日常使用流程，讓正確的照護行為主動發生，而不是被動等使用者查看。

## Behavior

- 可為輸液時間、用藥時間、每日打卡設定排程提醒（`/settings/reminders`），透過 Web Push API 於瀏覽器/PWA 主動推播通知。
- 排程由飼主（owner）新增/啟用停用/刪除；accepted caregiver 可以看到排程內容，但不能修改，只能在自己的裝置上開啟/關閉推播通知。
- 永久免費功能，不綁定訂閱狀態（原本規劃是訂閱 Pro 專屬功能，開發期間改為免費，見 [ADR-002](../05-decisions/ADR-002-subscription-tier-model.md) 的 Update）。
- 需使用者明確授權瀏覽器通知權限，並完成 PWA 安裝——尤其 iOS 需 16.4 以上且僅限已加入主畫面的 PWA 才支援 Web Push，這是平台限制而非本產品可控範圍，已在設定流程中明確告知使用者。
- 排程觸發用 GitHub Actions（`on: schedule`，見 `.github/workflows/send-reminders.yml`）每 5 分鐘打一次 `api/cron/send-reminders`，不是 Vercel Cron——查證後確認 Vercel Hobby 方案的 Cron 只能一天觸發一次，不夠用，Pro 方案要付費，改用免費的 GitHub Actions。
- 同一則提醒一天只會發送一次：`reminder_schedules.last_sent_on` 記錄最後發送日期，避免排程誤差或重複觸發造成同一則提醒一天內推播多次。

## Application Layer

- `app/(dashboard)/settings/reminders/`：排程管理頁、推播訂閱開關 UI。
- `app/api/push/subscribe`、`app/api/push/unsubscribe`：瀏覽器裝置的推播訂閱憑證登記/刪除。
- `app/api/cron/send-reminders`：GitHub Actions 呼叫的推播發送端點，需帶 `Authorization: Bearer $CRON_SECRET`。
- `public/sw.js`：Service Worker 的 `push`/`notificationclick` 事件監聽。

## Related Documents

- 資料契約：[../02-data-contract/reminder-schedule.md](../02-data-contract/reminder-schedule.md)、[../02-data-contract/push-subscription.md](../02-data-contract/push-subscription.md)
- 基礎設施備註（VAPID、GitHub Actions 排程、`CRON_SECRET` 驗證）：[../04-architecture/backend.md](../04-architecture/backend.md)
- 變更提案：[../06-releases/v1.2.0.md](../06-releases/v1.2.0.md)
