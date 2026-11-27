// 跟 app/globals.css 的 --primary 保持一致（Sleek 設計定案的鼠尾草綠）
export const BRAND_COLOR = '#557a63'

// AI 結果區塊正下方的提示文字（ADR-010、docs/99-reference/medical-disclaimer.md）。
// 參加「AI for Pets 創新徵件計畫」時，必須改成注意事項「使用者提示與專業諮詢」段落指定的文字（逐字複製），
// 或主辦單位同意的同等意旨文字。目前是依專案醫療免責聲明自行撰寫的版本
export const AI_HEALTH_NOTICE =
  '以上內容由 AI 整理，僅供輔助參考，不能取代獸醫師的診斷、治療或專業建議。每隻貓的狀況不同，如有健康疑慮或需要調整照護方式，請諮詢獸醫師。'

// 照片送出前的告知文字。保存期間依 Anthropic 官方說明，不能寫得比官方更絕對（見 ADR-010 第 5 節）
export const AI_PHOTO_CONSENT_ITEMS = [
  '照片會送到境外的 AI 服務（Anthropic）辨識。一般情況下 30 天內刪除（違反服務使用政策等特殊情況可能保存更久），不用於訓練模型。',
  'PetVitals 不保存照片，上傳前也會移除照片內的位置等拍攝資訊（EXIF）。',
  '建議先裁掉報告上的飼主姓名、電話、晶片號碼等個人資料。'
] as const
