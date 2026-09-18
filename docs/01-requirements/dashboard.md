# 多維度視覺化儀表板 (Dashboard)

Status: Implemented
Introduced: v1.0.0

## Purpose

把日常打卡與血檢數據轉成照顧者跟獸醫都能一眼看懂的趨勢圖，取代手動維護試算表圖表。

## Behavior

- 運用 Chart.js 呈現「體重 vs 輸液量」及「BUN/Crea vs 血磷」多軸時間序列曲線。
- 首頁另以進度條呈現當日輸液/飲水達成度，與近 7 天體重趨勢圖（見 [daily-care.md](./daily-care.md)）。

## Related Documents

- Domain Logic：[../03-domain-logic/daily-aggregation.md](../03-domain-logic/daily-aggregation.md)、[../03-domain-logic/daily-progress.md](../03-domain-logic/daily-progress.md)
- 架構：[../04-architecture/frontend.md](../04-architecture/frontend.md)
