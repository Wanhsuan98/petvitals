# 主動提醒排程 (Notification / Reminder Scheduling)

Status: Planned
Introduced: v1.2.0 (Change Proposal，尚未動工)

## Purpose

Excel 或試算表不會主動提醒使用者「該打輸液了」，照顧者必須自己記得檢查。這個功能把提醒排程做進日常使用流程，讓正確的照護行為主動發生，而不是被動等使用者查看。

## Behavior

- 可為輸液時間、用藥時間、每日打卡設定排程提醒，透過 Web Push API 於瀏覽器/PWA 主動推播通知。
- 需使用者明確授權瀏覽器通知權限，並完成 PWA 安裝——尤其 iOS 需 16.4 以上且僅限已加入主畫面的 PWA 才支援 Web Push，這是平台限制而非本產品可控範圍，需在設定流程中明確告知使用者。

## Related Documents

- 資料契約：[../02-data-contract/reminder-schedule.md](../02-data-contract/reminder-schedule.md)、[../02-data-contract/push-subscription.md](../02-data-contract/push-subscription.md)
- 基礎設施備註（VAPID、Vercel Cron 頻率限制需查證）：[../04-architecture/backend.md](../04-architecture/backend.md)
- 變更提案：[../06-releases/v1.2.0.md](../06-releases/v1.2.0.md)
