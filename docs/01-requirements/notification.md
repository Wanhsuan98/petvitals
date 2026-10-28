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
- 排程觸發用 [cron-job.org](https://cron-job.org/) 每 1 分鐘打一次 `api/cron/send-reminders`。原本改用 GitHub Actions（`on: schedule`）取代 Vercel Cron，但實測 GitHub Actions 的排程間隔嚴重不準（設定 5 分鐘一次，實測間隔卻是 4-5 小時），完全無法滿足健康提醒需要的時效性，因此再改用 cron-job.org 這類專職的排程觸發服務，見 [backend.md](../04-architecture/backend.md) 的詳細記錄。
- 排程時間只能設定 5 分鐘整數倍（00/05/10/.../55）：cron 比對邏輯是把現在時間捨去到最近的 5 分鐘再比對，非整數倍的時間永遠不會被匹配到；新增表單用下拉選單（而非原生時間選擇器）從選項源頭排除非法值，因為手機瀏覽器對原生 `<input type="time">` 的 `step` 屬性支援不一致。
- 同一則提醒一天只會發送一次：`reminder_schedules.last_sent_on` 記錄最後發送日期，避免排程誤差或重複觸發造成同一則提醒一天內推播多次。
- **至少一個裝置被推播服務接受才記錄已發送**（v1.2 修正：原本不論結果都記錄，全部裝置失敗時當天就不會再送、也查不出原因）。全部失敗或沒有任何已訂閱裝置時不記錄，同一個 5 分鐘區間內 cron 的下一次觸發會自動重試。「被推播服務接受」不保證手機一定有顯示（例如系統通知被關閉）。
- 已開啟推播的裝置可以在通知中心按「傳送測試通知」，對本人所有已訂閱裝置送一則測試推播，畫面顯示送出到幾個裝置；伺服器只能確認推播服務收下，手機是否跳出通知要使用者自己確認（Web Push 本身的限制）。收件人固定是登入者本人（`POST /api/push/test`）。
- cron 回應會帶出 `sent`、`delivered`、`failed`、`expired` 與每則提醒的明細，可在 cron-job.org 的執行紀錄查看。

## 通知中心第一版

Status: Implemented
Introduced: v1.2.0

- `/notifications` 為登入者的通知中心，不要求先建立貓咪資料；未登入導向 `/login`。
- 首頁鈴鐺前往通知中心，角標代表「目前登入者待處理的協作邀請數」，0 筆時不顯示，超過 99 筆顯示 `99+`；無障礙名稱仍提供實際數量。
- 角標不是未讀數；查看通知中心不會清除角標，接受邀請或飼主撤回邀請後，重新讀取時才更新。不提供即時訂閱，重新進入或按「重新整理」取得最新清單。
- 顯示目前登入者所有待接受邀請（不限目前顯示的貓），沿用既有接受邀請流程與 RLS；設定頁保留原入口，沒有貓咪資料的人仍可從設定頁前往通知中心。
- 沒有邀請時顯示「目前沒有待處理的協作邀請」，資料讀取失敗顯示可重試的錯誤畫面，載入時顯示骨架。
- 顯示本裝置的瀏覽器推播訂閱狀態與開關。檢查中有明確提示；不支援時提供平台說明；權限遭拒時提示至瀏覽器或系統設定調整；操作失敗保留錯誤訊息。
- 本裝置已訂閱只代表瀏覽器端具有推播憑證，不保證每次通知送達；有可存取的貓才顯示提醒設定入口，owner 管理排程、accepted caregiver 唯讀。
- 沒有可存取的貓時，仍可查看邀請及管理本裝置推播，提醒區顯示先建檔或接受邀請的說明。
- 第一版不新增資料表，不提供提醒歷史、已讀狀態或全部已讀；取捨見 [ADR-004](../05-decisions/ADR-004-notification-center-mvp.md)。

## Application Layer

- `app/(dashboard)/notifications/`：通知中心、重新整理、載入骨架與讀取錯誤重試。
- `app/(dashboard)/settings/reminders/`：排程管理頁、推播訂閱開關 UI。
- `app/api/push/subscribe`、`app/api/push/unsubscribe`：瀏覽器裝置的推播訂閱憑證登記/刪除。
- `app/api/cron/send-reminders`：cron-job.org 呼叫的推播發送端點，需帶 `Authorization: Bearer $CRON_SECRET`。
- `public/sw.js`：Service Worker 的 `push`/`notificationclick` 事件監聽。

## Related Documents

- 資料契約：[../02-data-contract/reminder-schedule.md](../02-data-contract/reminder-schedule.md)、[../02-data-contract/push-subscription.md](../02-data-contract/push-subscription.md)
- 基礎設施備註（VAPID、cron-job.org 排程、`CRON_SECRET` 驗證）：[../04-architecture/backend.md](../04-architecture/backend.md)
- 變更提案：[../06-releases/v1.2.0.md](../06-releases/v1.2.0.md)
