import 'server-only'

// 血檢報告辨識送給模型的 system prompt 與 structured output 的 JSON schema。
// 只有伺服器端呼叫 API 時需要，用 server-only 防止被前端元件引用而打包進瀏覽器。
// 回傳結果的 Zod schema 與預填規則在 blood-test-extraction.ts

// 給 structured output 用的 JSON schema。與 blood-test-extraction.ts 的 Zod schema 對應，手寫是為了
// 確定送出的格式符合 structured output 的限制：每個物件都要 additionalProperties: false、
// 欄位全部列在 required，而且聯集型別（anyOf／type 陣列）的參數最多 16 個。
// API 回傳後仍會再用 Zod 驗證一次
export const MAX_UNION_PARAMETERS = 16
const NULLABLE_NUMBER = { anyOf: [{ type: 'number' }, { type: 'null' }] }
const STRING = { type: 'string' }
const EXTRACTED_VALUE_JSON_SCHEMA = {
  type: 'object',
  properties: { value: NULLABLE_NUMBER, unit: STRING, sourceLabel: STRING },
  required: ['value', 'unit', 'sourceLabel'],
  additionalProperties: false
}

export const BLOOD_TEST_EXTRACTION_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    isBloodTestReport: { type: 'boolean' },
    testDate: STRING,
    hospitalName: STRING,
    bun: EXTRACTED_VALUE_JSON_SCHEMA,
    creatinine: EXTRACTED_VALUE_JSON_SCHEMA,
    sdma: EXTRACTED_VALUE_JSON_SCHEMA,
    phosphorus: EXTRACTED_VALUE_JSON_SCHEMA,
    hct: EXTRACTED_VALUE_JSON_SCHEMA
  },
  required: [
    'isBloodTestReport',
    'testDate',
    'hospitalName',
    'bun',
    'creatinine',
    'sdma',
    'phosphorus',
    'hct'
  ],
  additionalProperties: false
}

export const BLOOD_TEST_EXTRACTION_SYSTEM_PROMPT = `你是一個資料抄寫工具，負責把貓咪血液生化檢驗報告照片上的數值，原樣抄寫成指定的 JSON 格式。你不做任何判讀、診斷或建議。

規則：
1. 照片不是血液檢驗報告時（例如拍到動物、其他文件），isBloodTestReport 回 false，所有 value 回 null，所有文字欄位回空字串。
2. 只抄寫以下項目，項目名稱可能有不同寫法：
   - bun：尿素氮，例如 BUN、UREA、尿素氮
   - creatinine：肌酸酐，例如 CREA、Cre、CREAT、肌酸酐
   - sdma：例如 SDMA
   - phosphorus：血磷，例如 PHOS、IP、P、無機磷、血磷
   - hct：紅血球容積比，例如 HCT、PCV、血球容積比
3. value 抄寫報告上的數字本身，unit 抄寫報告上標示的單位原文，sourceLabel 抄寫報告上的項目名稱原文。
4. 不做任何單位換算。報告是 umol/L 就回 umol/L 和原本的數字。
5. 看不清楚、找不到、或不確定是哪一個項目時，value 回 null，unit 和 sourceLabel 回空字串，不要推測。報告沒有標示單位時，unit 回空字串。
6. 同一個項目出現多次（例如前後兩次檢驗並列）時，取日期最新的那一欄。
7. testDate 為檢驗日期，格式 YYYY-MM-DD；報告使用民國年時換算成西元年（民國年 + 1911）。找不到日期時回空字串。
8. hospitalName 為醫院或檢驗單位名稱，找不到時回空字串。不要抄寫飼主姓名、電話、晶片號碼等個人資料。`
