# 多維度視覺化儀表板 (Dashboard)

Status: Implemented
Introduced: v1.0.0

## Purpose

把日常打卡與血檢數據轉成照顧者跟獸醫都能一眼看懂的趨勢圖，取代手動維護試算表圖表。

## Behavior

- 運用 Chart.js 在紀錄頁（`/records`）呈現「體重 vs 輸液量」「腎指標」「血磷」三張時間序列圖，不在首頁（v1.2 前為「體重 vs 輸液量」與「BUN/Crea vs 血磷」兩張，改版內容見下方）。
- 首頁問候語依裝置本地時段顯示；伺服器與 hydration 首次渲染統一顯示「你好」，載入後才使用本地時間。今日狀態、體重趨勢與體重下滑警報每分鐘及回到前景時更新日期，App 開著跨過午夜也會換成新的一天。
- 首頁以進度條呈現當日輸液/飲水達成度，與近 7 天體重趨勢圖（單軸）（見 [daily-care.md](./daily-care.md)）。

- 首頁鈴鐺導向 `/notifications` 通知中心；角標為本人待處理協作邀請數，0 筆不顯示，超過 99 筆顯示 `99+`，查看不會清除。詳見 [notification.md](./notification.md)。

## 紀錄頁趨勢圖改版

Status: Implemented
Introduced: v1.2.0
Implementation: `app/(dashboard)/records/trend-charts.tsx`
決策：[ADR-009](../05-decisions/ADR-009-records-period-filter-and-charts.md)

三張圖都跟著紀錄頁的時間篩選（見 [blood-test.md](./blood-test.md#時間篩選)），**橫軸改為真正的時間軸**：資料點依實際日期間距排列。原本的分類軸把每次血檢等距排開，隔 1 個月與隔 3 個月畫起來一樣寬，趨勢斜率會失真。

### 1. 腎指標圖（取代「BUN/Crea vs 血磷」）

- 主線為**肌酸酐**（左軸 mg/dL），背景以綠、黃、橘、紅四段色帶標示 IRIS 貓的肌酸酐分期區間（< 1.6／1.6–2.8／2.9–5.0／> 5.0，來源見 [../99-reference/iris.md](../99-reference/iris.md)），色帶左上角標示「1期」～「4期」。切點與分期提示相同：小於下一期下限就算前一期（例如 2.85 歸第 2 期）。
- 左軸至少顯示到 3.5 mg/dL，即使數值都很低也看得到第 3 期色帶，知道離下一期多遠。
- 有任何一筆填了 SDMA 時，SDMA 以**虛線**畫在右軸（µg/dL）；都沒有就不顯示右軸。色帶只對應左軸的肌酸酐，SDMA 的分期切點不同，用虛線區隔，避免拿 SDMA 去對色帶（不另拆成獨立一張圖：SDMA 為選填，很多使用者沒有這項數據，獨立圖會常常是空的）。
- **BUN 不畫進圖表**，仍保留在血檢清單與回診報告。原本肌酸酐（約 2–3）與 BUN（30–60）共用同一個刻度，肌酸酐被壓成一條平線，但它才是分期最主要的指標；BUN 受飲食與脫水影響大，趨勢參考價值較低。
- 色帶是參考區間，圖下方註明色帶只對應肌酸酐、SDMA 請勿對照色帶，區間僅供參考、分期需由獸醫師判斷，並提示 BUN 請見清單。

### 2. 血磷圖（新增，從原雙軸圖拆出）

- 血磷折線，加一條虛線標示**目前設定分期**的血磷建議上限（例如第 2 期 4.5 mg/dL，數值同 [../03-domain-logic/phosphorus.md](../03-domain-logic/phosphorus.md)）。
- 虛線用的是「目前」分期，不是每次檢驗當時的分期（系統沒有保存分期變更歷史）。圖下方說明「紅色虛線：目前設定的第 N 期血磷建議上限 X mg/dL；較早的檢驗若在不同分期時做的，虛線不代表當時的目標」。
- 虛線橫跨整張圖，只有一筆血檢時也看得到；縱軸範圍一定包含上限值。

### 3. 體重 vs 輸液量

- 篩選為「近 3 個月／近 6 個月」時：每天一個點；體重為當天最後一筆，輸液量改畫**7 天平均**（原本每日總量在 80–120 間跳動，看不出趨勢）。
- 篩選為「近 1 年／全部」時：改為**每週一個點**，彙總規則見 [../03-domain-logic/daily-aggregation.md](../03-domain-logic/daily-aggregation.md#週彙總與-7-天平均)。
- 週彙總時圖例標示「每週的每日平均」。
- 7 天平均先用全部資料計算再依篩選裁切，區間開頭幾天的平均才不會只算到區間內的資料。
- 資料點超過 60 個時不畫圓點，只畫線，避免擠成一團；點擊或滑過圖上任一處，會顯示同一日期的所有數值。沒量體重的日子把前後連起來，不讓線斷成一段一段。

### 三張圖共通

- 曲線使用 monotone 內插，不會在兩次檢驗之間畫出高於或低於實際數值的弧線。
- 每張圖都有無障礙名稱（`aria-label`），說明是哪張圖、虛線或色帶的意義，並指引數值請見下方血檢清單。

## Related Documents

- Domain Logic：[../03-domain-logic/daily-aggregation.md](../03-domain-logic/daily-aggregation.md)、[../03-domain-logic/daily-progress.md](../03-domain-logic/daily-progress.md)
- 架構：[../04-architecture/frontend.md](../04-architecture/frontend.md)
