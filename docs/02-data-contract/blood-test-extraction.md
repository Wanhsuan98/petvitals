# BloodTestExtraction

Status: Planned
Introduced: 未定
Implementation: `lib/ai/blood-test-extraction.ts`（Zod schema、`toBloodTestPrefill()`，前後端共用）、`lib/ai/blood-test-extraction-prompt.ts`（system prompt 與 JSON schema，`server-only`，不打包進瀏覽器）、`lib/ai/extract-blood-test.ts`（呼叫 API）、`lib/image-compress.ts`（前端壓縮）、`app/(dashboard)/records/new/extract-actions.ts`（Server Action）
Tests: `lib/ai/blood-test-extraction.test.ts`、`lib/ai/image-limits.test.ts`、`app/(dashboard)/records/blood-test-prefill-plan.test.ts`
決策：[ADR-010](../05-decisions/ADR-010-ai-blood-test-extraction-and-care-summary.md)

## Purpose

定義「血檢報告照片 → AI 辨識結果 → 預填表單」這段流程的輸入、AI 輸出格式，以及轉成表單預填值的規則。辨識結果**不會直接寫入** `blood_tests`，使用者確認並送出後，才會走 [BloodTest](./blood-test.md) 的 `BloodTestSchema` 驗證與寫入。

## Input

| 項目     | 規則                                                                                                                                                                                                                                                                                                                                                                                      |
| :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 張數     | 每次 1 張。多頁報告要分次拍，第二次起只填入仍是空白的欄位（見 Business Rules）                                                                                                                                                                                                                                                                                                            |
| 格式     | `<input type="file" accept="image/*">`，手機可以直接拍照。前端用 canvas 重新編碼成 JPEG 後才上傳，**目的之一是去除 EXIF**：手機照片的 EXIF 可能含有 GPS 位置與裝置資訊，不能送出去                                                                                                                                                                                                        |
| 大小     | 前端壓縮到長邊最多 1600 px、檔案 **900 KB 以下**。Server Action 的 request body 預設上限是 1MB（含 multipart 的額外欄位，見 `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`），所以要保留空間。之後若要放寬，必須同時設定 `serverActions.bodySizeLimit`，並確認部署平台的 request 大小上限。API 單張圖片的上限以實作當時的官方文件為準 |
| 傳送方式 | base64 直接放進 Messages API 請求，不使用 Files API（Files API 的檔案會保存到刪除為止）                                                                                                                                                                                                                                                                                                   |
| 保存     | 不保存。照片只存在這次請求的記憶體裡，不寫入 Supabase Storage，也不寫入 log                                                                                                                                                                                                                                                                                                               |

## AI Output Schema

用 structured output（JSON schema）固定格式，伺服器收到後再用 Zod（`BloodTestExtractionSchema`）驗證一次；不符合時記為 `INVALID`，計入使用次數（API 已經處理並收費，見 [ai-usage-log.md](./ai-usage-log.md)）。

```ts
type ExtractedValue = {
  value: number | null // 報告上的數字原樣，不換算
  unit: string | null // 報告上的單位原文，例如 'mg/dL'、'umol/L'、'%'
  sourceLabel: string | null // 報告上的項目名稱原文，例如 'CREA'、'Cre'、'肌酸酐'
}

type BloodTestExtraction = {
  isBloodTestReport: boolean // 照片不是血檢報告（例如拍到貓）時為 false，其餘欄位全部 null
  testDate: string | null // YYYY-MM-DD；報告上只有民國年時換算成西元
  hospitalName: string | null
  bun: ExtractedValue
  creatinine: ExtractedValue
  sdma: ExtractedValue
  phosphorus: ExtractedValue
  hct: ExtractedValue
}
```

**模型實際輸出的格式（wire format）與上面的型別不同**：structured output 限制「可為 null 或聯集型別的參數」最多 16 個，超過時 API 直接回 400（2026-11-27 實測，原本的設計有 17 個）。所以只有 `value` 用 `null` 表示「沒有」，`unit`、`sourceLabel`、`testDate`、`hospitalName` 改用空字串，Zod 驗證時再轉回 `null`，上面的型別是轉換後的結果。單元測試會檢查 JSON schema 的聯集參數不超過 16 個。

Prompt 要求：看不清楚、找不到的項目，數值回 `null`、文字回空字串，不推測；同一項目出現多次（例如前後兩次檢驗並列）時取最新日期那一欄；不做單位換算。

## 轉成表單預填值

每個欄位**各自判斷**，任何一步不通過，該欄就留白並顯示原因，不影響其他欄位：

| 欄位       | 接受的單位（不分大小寫、忽略空白） | 不通過時顯示                                                 |
| :--------- | :--------------------------------- | :----------------------------------------------------------- |
| bun        | `mg/dL`                            | 單位不同：「報告使用 {unit}，請自行換算成 mg/dL 後填入」     |
| creatinine | `mg/dL`                            | 同上                                                         |
| sdma       | `ug/dL`、`µg/dL`、`μg/dL`          | 同上（換算成 ug/dL）                                         |
| phosphorus | `mg/dL`                            | 同上                                                         |
| hct        | `%`                                | 例如報告寫 `L/L`（0.35）時：「報告使用 L/L，請自行換算成 %」 |

1. `value` 為 `null` → 留白，標示「未辨識到」。
2. 單位不在上表 → 留白，顯示換算提示。`unit` 為 `null`（報告沒寫單位）也留白，不假設單位。
3. 數值不符合 `BloodTestSchema` 該欄的範圍（例如肌酸酐大於 30）→ 留白，標示「辨識到的數值超出合理範圍，請對照報告」。
4. 通過 → 預填，欄位旁標示「AI 辨識，請核對」，並顯示 `sourceLabel` 與原始單位，方便使用者對照報告。
5. `testDate` 不是實際存在的日期或晚於今天 → 留白；`hospitalName` 超過 30 字時截斷。

## Business Rules

- **第二次辨識（多頁報告）只填空白欄位**：使用者已經手動輸入或修改過的欄位，不會被新的辨識結果覆蓋。
- `isBloodTestReport` 為 `false` 時，不預填任何欄位，顯示「這張照片看起來不是血檢報告」。這一次仍計入使用次數（API 已處理）。
- 模型拒答（整條 fallback 鏈都拒答）時記為 `REFUSED`，顯示「目前無法辨識這張照片，請手動輸入」。
- 單位換算一律不交給 AI，也不由程式自動換算。資料契約維持「自行換算」（見 [blood-test.md](./blood-test.md) Business Rules）。

## Related

- [blood-test.md](./blood-test.md)
- [ai-usage-log.md](./ai-usage-log.md)
- [../01-requirements/blood-test.md](../01-requirements/blood-test.md#ai-血檢報告辨識)
