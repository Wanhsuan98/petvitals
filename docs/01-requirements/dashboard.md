# 多維度視覺化儀表板 (Dashboard)

Status: Implemented
Introduced: v1.0.0

## Purpose

把日常打卡與血檢數據轉成照顧者跟獸醫都能一眼看懂的趨勢圖，取代手動維護試算表圖表。

## Behavior

- 運用 Chart.js 呈現「體重 vs 輸液量」及「BUN/Crea vs 血磷」雙軸時間序列曲線，位於紀錄頁（`/records`），不在首頁。自 v1.0 起即是如此，先前文件未寫明位置。
- 首頁問候語依裝置本地時段顯示；伺服器與 hydration 首次渲染統一顯示「你好」，載入後才使用本地時間。今日狀態與體重趨勢每分鐘及回到前景時更新日期。
- 首頁以進度條呈現當日輸液/飲水達成度，與近 7 天體重趨勢圖（單軸）（見 [daily-care.md](./daily-care.md)）。

- 首頁鈴鐺導向 `/notifications` 通知中心；角標為本人待處理協作邀請數，0 筆不顯示，超過 99 筆顯示 `99+`，查看不會清除。詳見 [notification.md](./notification.md)。

## Related Documents

- Domain Logic：[../03-domain-logic/daily-aggregation.md](../03-domain-logic/daily-aggregation.md)、[../03-domain-logic/daily-progress.md](../03-domain-logic/daily-progress.md)
- 架構：[../04-architecture/frontend.md](../04-architecture/frontend.md)
