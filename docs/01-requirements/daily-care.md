# 每日照護日誌 (Daily Care Log)

Status: Implemented
Introduced: v1.0.0

## Purpose

讓照顧者用最少的操作記錄每天的皮下輸液、飲水與體重，並取得當日達成度回饋。

## Behavior

- 皮下輸液量記錄，內建防手滑上限驗證，並與該貓醫囑單次量比對，超出時在輸液欄位下方即時提示但不擋存檔（新增與編輯打卡皆有）。
- 飲水達成度（飲水量 ÷ 每日飲水目標）與輸液達成度（輸液量 ÷ 醫囑單次量 × 每日次數）分開呈現，不合併為單一總水分進度條。
- 體重記錄與近 7 天下滑趨勢計算（窗口內最高點 vs 最新值；含今天共 7 個日曆日，最新值依打卡時間判斷，見 [weight-alert.md](../03-domain-logic/weight-alert.md)）。
- 嘔吐次數以數字輸入記錄精確的 0–20 次，不將 3 次以上合併為同一數值；輸入框具有標籤與關聯的驗證錯誤訊息。
- 今日紀錄依裝置本地日期顯示，首次渲染先等待本地時間；每分鐘及回到前景時更新日期，支援 PWA 跨午夜使用。
- 打卡紀錄可以編輯與刪除（飼主與協作者皆可，見 [ADR-007](../05-decisions/ADR-007-caregivers-edit-delete-care-data.md)）：編輯只能修改內容，不能改打卡時間與所屬日期；刪除需二次確認。目前入口在「今日已記錄」清單。
- 同一天可有多筆記錄（含精確打卡時間），支援一天多次輸液的情境。

## Related Documents

- 資料契約：[../02-data-contract/daily-care-log.md](../02-data-contract/daily-care-log.md)
- Domain Logic：[../03-domain-logic/fluid-check.md](../03-domain-logic/fluid-check.md)、[../03-domain-logic/daily-progress.md](../03-domain-logic/daily-progress.md)、[../03-domain-logic/weight-alert.md](../03-domain-logic/weight-alert.md)
