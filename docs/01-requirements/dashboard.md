# 多維度視覺化儀表板 (Dashboard)

Status: Implemented
Introduced: v1.0.0

## Purpose

把日常打卡與血檢數據轉成照顧者跟獸醫都能一眼看懂的趨勢圖，取代手動維護試算表圖表。

## Behavior

- 運用 Chart.js 呈現「體重 vs 輸液量」及「BUN/Crea vs 血磷」雙軸時間序列曲線，位於紀錄頁（`/records`），不在首頁。自 v1.0 起即是如此，先前文件未寫明位置。
- 首頁問候語依裝置本地時段顯示；伺服器與 hydration 首次渲染統一顯示「你好」，載入後才使用本地時間。今日狀態、體重趨勢與體重下滑警報每分鐘及回到前景時更新日期，App 開著跨過午夜也會換成新的一天。
- 首頁以進度條呈現當日輸液/飲水達成度，與近 7 天體重趨勢圖（單軸）（見 [daily-care.md](./daily-care.md)）。

- 首頁鈴鐺導向 `/notifications` 通知中心；角標為本人待處理協作邀請數，0 筆不顯示，超過 99 筆顯示 `99+`，查看不會清除。詳見 [notification.md](./notification.md)。

## 紀錄頁趨勢圖改版（Planned）

Status: Planned（時間篩選已實作：目前的兩張舊圖已經跟著篩選，下列改版尚未實作）
決策：[ADR-009](../05-decisions/ADR-009-records-period-filter-and-charts.md)

三張圖都跟著紀錄頁的時間篩選（見 [blood-test.md](./blood-test.md#時間篩選)），**橫軸改為真正的時間軸**：資料點依實際日期間距排列。原本的分類軸把每次血檢等距排開，隔 1 個月與隔 3 個月畫起來一樣寬，趨勢斜率會失真。

### 1. 腎指標圖（取代「BUN/Crea vs 血磷」）

- 主線為**肌酸酐**（左軸 mg/dL），背景以色帶標示 IRIS 貓的肌酸酐分期區間（< 1.6／1.6–2.8／2.9–5.0／> 5.0，來源見 [../99-reference/iris.md](../99-reference/iris.md)），一眼看出落在第幾期。
- 有任何一筆填了 SDMA 時，SDMA 畫在右軸（µg/dL）；都沒有就不顯示右軸。
- **BUN 不畫進圖表**，仍保留在血檢清單與回診報告。原本肌酸酐（約 2–3）與 BUN（30–60）共用同一個刻度，肌酸酐被壓成一條平線，但它才是分期最主要的指標；BUN 受飲食與脫水影響大，趨勢參考價值較低。
- 色帶是參考區間，圖下方註明「區間依 IRIS 2026，僅供參考；分期需由獸醫師判斷」。

### 2. 血磷圖（新增，從原雙軸圖拆出）

- 血磷折線，加一條虛線標示**目前設定分期**的血磷建議上限（例如第 2 期 4.5 mg/dL，數值同 [../03-domain-logic/phosphorus.md](../03-domain-logic/phosphorus.md)）。
- 虛線用的是「目前」分期，不是每次檢驗當時的分期（系統沒有保存分期變更歷史），圖例標示為「目前分期建議上限」。

### 3. 體重 vs 輸液量

- 篩選為「近 3 個月／近 6 個月」時：每天一個點；體重為當天最後一筆，輸液量改畫**7 天平均**（原本每日總量在 80–120 間跳動，看不出趨勢）。
- 篩選為「近 1 年／全部」時：改為**每週一個點**，彙總規則見 [../03-domain-logic/daily-aggregation.md](../03-domain-logic/daily-aggregation.md#週彙總與-7-天平均planned)。
- 資料點超過 60 個時不畫圓點，只畫線，避免擠成一團；滑過或點擊仍可看到該點數值。

## Related Documents

- Domain Logic：[../03-domain-logic/daily-aggregation.md](../03-domain-logic/daily-aggregation.md)、[../03-domain-logic/daily-progress.md](../03-domain-logic/daily-progress.md)
- 架構：[../04-architecture/frontend.md](../04-architecture/frontend.md)
