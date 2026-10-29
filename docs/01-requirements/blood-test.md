# 生化血檢管理 (Blood Test)

Status: Implemented
Introduced: v1.0.0

## Purpose

讓照顧者歸檔每次回診的生化血檢報告，並依貓咪目前的 IRIS 分期自動提示血磷是否超標。

## Behavior

- 支援 5 項核心指標記錄：BUN、Creatinine、SDMA、Phosphorus (P)、HCT。
- 使用者依獸醫診斷結果手動設定/更新 IRIS 分期，系統依所選分期自動比對對應血磷控制上限並提示（非系統自動診斷判定）。
- 血檢紀錄可以編輯與刪除（飼主與協作者皆可，見 [ADR-007](../05-decisions/ADR-007-caregivers-edit-delete-care-data.md)）：歷史清單每筆有「編輯」與「刪除」，編輯可修改所有數值與日期，刪除需二次確認；修改後血磷警示與分期提示會即時重新計算。
- 新增血檢表單的 BUN、肌酸酐、血磷**預設為空白**，未填寫會顯示「請輸入 BUN」等訊息、不能送出；各項數值必須大於 0（見 [../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)）。v1.2 前預設為 0，沒填就送出會存成 0，清單顯示「血磷正常」、圖表掉到 0。既有的 0 值紀錄仍然可以開啟與編輯，儲存時必須改成大於 0 的數值。
- 數值欄位的提示文字只示範輸入格式（例如「例：2.1」），不顯示參考範圍：各醫院的參考範圍不同，放在欄位裡容易被當成正常值判讀，數值以醫院報告為準。
- 最新一筆血檢的肌酸酐或 SDMA 落在比目前設定更高的 IRIS 分期區間時，血檢頁會顯示「可能需要和獸醫師確認分期」的提示，不會自動修改分期，也不會提示降級，見 [../03-domain-logic/stage-hint.md](../03-domain-logic/stage-hint.md)。

## 紀錄頁時間篩選與血檢清單（Planned）

Status: Planned
決策：[ADR-009](../05-decisions/ADR-009-records-period-filter-and-charts.md)

血檢紀錄累積後清單要一直往下滑，趨勢圖也擠滿兩年的資料點，因此紀錄頁（`/records`）加上時間篩選，並讓清單分段顯示。

### 時間篩選

- 紀錄頁頂端一組篩選：「近 3 個月／近 6 個月／近 1 年／全部」，**預設近 6 個月**。
- **圖表與血檢清單共用同一個篩選**，避免「圖上有、清單找不到」的落差。
- 區間以裝置本地日期計算：「近 N 個月」為今天往前推 N 個日曆月（含今天），「全部」不設下限。
- 篩選狀態記在網址（`/records?range=3m|6m|1y|all`）：重新整理、從編輯頁返回都保留原本的選擇；網址沒有或帶不合法的值時使用預設值。
- **不受篩選影響**：分期提示、清單上方的最新血磷狀態、回診報告，一律使用全部資料中最新的一筆。篩選只改變「看哪段期間」，不能讓臨床提示因為選了某段期間而消失。

### 血檢清單分段顯示

- 依檢驗日期由新到舊，先顯示 10 筆，底部「顯示更多」每次再多 10 筆；全部顯示完就不出現按鈕。不使用頁碼（手機上頁碼按鈕太小，也打斷往下閱讀）。
- 切換時間篩選時，顯示筆數重設為 10 筆。
- 篩選區間內沒有血檢時，顯示「這段期間沒有血檢紀錄」；若更早有紀錄，提示可改選「全部」查看。
- 清單標示目前顯示筆數，例如「顯示 10 / 23 筆」。

## Related Documents

- 資料契約：[../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)、[../02-data-contract/cat-profile.md](../02-data-contract/cat-profile.md)
- Domain Logic：[../03-domain-logic/phosphorus.md](../03-domain-logic/phosphorus.md)、[../03-domain-logic/stage-hint.md](../03-domain-logic/stage-hint.md)
- 趨勢圖：[dashboard.md](./dashboard.md)
- 參考標準：[../99-reference/iris.md](../99-reference/iris.md)
