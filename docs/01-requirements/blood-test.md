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

## 紀錄頁時間篩選與血檢清單

Status: Implemented
Introduced: v1.2.0
決策：[ADR-009](../05-decisions/ADR-009-records-period-filter-and-charts.md)

血檢紀錄累積後清單要一直往下滑，趨勢圖也擠滿兩年的資料點，因此紀錄頁（`/records`）加上時間篩選，並讓清單分段顯示。

### 時間篩選

- 紀錄頁頂端一組篩選：「近 3 個月／近 6 個月／近 1 年／全部」，**預設近 6 個月**。
- **圖表與血檢清單共用同一個篩選**，避免「圖上有、清單找不到」的落差。
- 區間以裝置本地日期計算：「近 N 個月」為今天往前推 N 個日曆月（含今天），目標月份沒有同一天時取該月最後一天（例如 8/31 往前 6 個月是 2/28）；「全部」不設下限。頁面剛載入、還沒取得裝置日期的瞬間，先用伺服器的台北日期，避免先畫出全部資料再縮回去。
- 篩選狀態記在網址（`/records?range=3m|6m|1y|all`）：重新整理、從新增或編輯頁返回（返回鍵與儲存後）都保留原本的選擇；網址沒有或帶不合法的值時使用預設值。切換篩選只改網址，不重新向伺服器取資料，也不新增瀏覽紀錄（按上一頁不會一個一個篩選倒回去）。
- **不受篩選影響**：分期提示、體重警報、回診報告，一律使用全部資料（分期提示用其中最新的一筆血檢）。篩選只改變「看哪段期間」，不能讓臨床提示因為選了某段期間而消失。

### 血檢清單分段顯示

- 依檢驗日期由新到舊，先顯示 10 筆，底部「顯示更多」每次再多 10 筆；全部顯示完就不出現按鈕。不使用頁碼（手機上頁碼按鈕太小，也打斷往下閱讀）。
- 切換時間篩選時，顯示筆數重設為 10 筆（包括切回之前看過的篩選）。
- 篩選區間內沒有血檢時，顯示「這段期間沒有血檢紀錄」；若更早有紀錄，提示可改選「全部」查看。
- 清單標示目前顯示筆數，例如「顯示 10 / 23 筆」。

## AI 血檢報告辨識

Status: Planned
Introduced: 未定
決策：[ADR-010](../05-decisions/ADR-010-ai-blood-test-extraction-and-care-summary.md)
資料契約：[../02-data-contract/blood-test-extraction.md](../02-data-contract/blood-test-extraction.md)

拍下醫院的血檢報告，由 AI 辨識數值並預填新增血檢表單，省去逐欄輸入，也減少看錯行、打錯小數點的機會。AI 只負責「抄數字」，存檔前一定要經過使用者確認。

### 入口與流程

1. 新增血檢頁（`/records/new`）表單上方新增「拍照辨識報告」按鈕。編輯既有血檢時不提供此功能。
2. 按下後顯示**上傳前說明**，使用者勾選「我了解」後才能選擇照片，同一裝置只需勾選一次：
   - 照片會送到境外的 AI 服務（Anthropic）辨識。一般情況下 30 天內刪除（違反服務使用政策等特殊情況可能保存更久），不用於訓練模型。PetVitals 不保存照片，上傳前也會移除照片內的位置等拍攝資訊（EXIF）。
   - 建議先裁掉報告上的飼主姓名、電話、晶片號碼等資訊。
3. 選擇照片或直接拍照後開始辨識，顯示「辨識中…」。辨識期間表單仍可手動輸入。
4. 辨識完成後，依 [blood-test-extraction.md](../02-data-contract/blood-test-extraction.md) 的規則預填表單：
   - 成功預填的欄位旁標示「AI 辨識，請核對」，並顯示報告上的項目名稱與單位（例如「CREA，mg/dL」）。
   - 留白的欄位顯示原因：未辨識到、單位不同需要自行換算，或數值超出合理範圍。
   - 使用者手動修改某一欄後，該欄的「AI 辨識」標示消失。
5. 結果區塊**正下方**顯示比賽指定的提示文字（見 [醫療免責聲明](../99-reference/medical-disclaimer.md)），不能只放在頁尾。
6. 使用者核對、修改後按「儲存」，走原本的驗證與寫入流程。**AI 辨識不會自動存檔。**
7. 多頁報告可以再按一次「再拍一頁」。新的辨識結果只填入仍然空白的欄位，不覆蓋已經填好或改過的欄位。

### 使用次數與錯誤狀態

- 每隻貓每天最多 10 次（Asia/Taipei 日期），飼主與協作者共用。按鈕旁顯示「今天還可以辨識 N 次」；用完時按鈕停用，並顯示「今天的辨識次數已用完，請手動輸入或明天再試」。
- 照片不是血檢報告時，顯示「這張照片看起來不是血檢報告」，並計入次數。
- 辨識失敗（逾時、服務異常）時，顯示「辨識失敗，請再試一次或手動輸入」，**不計入**次數。AI 有回應但格式不正確時，顯示同樣的訊息，但計入次數（AI 服務已經處理並收費）。
- 不論成功或失敗，每天的總嘗試次數最多 30 次（見 [ai-usage-log.md](../02-data-contract/ai-usage-log.md)），超過後顯示與次數用完相同的訊息。
- 離線時按鈕停用，並提示需要網路連線（與打卡相同，見 [../04-architecture/pwa.md](../04-architecture/pwa.md)）。
- AI 服務完全無法使用時，新增血檢表單照常可以手動輸入，不受影響。

### 權限

飼主與 accepted caregiver 都能使用，與新增血檢的權限相同。伺服器端會確認使用者對這隻貓有權限，不只靠前端隱藏按鈕。

## Related Documents

- AI 辨識：[../02-data-contract/blood-test-extraction.md](../02-data-contract/blood-test-extraction.md)、[../02-data-contract/ai-usage-log.md](../02-data-contract/ai-usage-log.md)
- 資料契約：[../02-data-contract/blood-test.md](../02-data-contract/blood-test.md)、[../02-data-contract/cat-profile.md](../02-data-contract/cat-profile.md)
- Domain Logic：[../03-domain-logic/phosphorus.md](../03-domain-logic/phosphorus.md)、[../03-domain-logic/stage-hint.md](../03-domain-logic/stage-hint.md)
- 趨勢圖：[dashboard.md](./dashboard.md)
- 參考標準：[../99-reference/iris.md](../99-reference/iris.md)
