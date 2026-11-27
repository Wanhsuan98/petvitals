// 血檢報告照片的上傳限制，前端壓縮與 Server Action 驗證共用同一組數字。
// Server Action 的 request body 預設上限是 1MB（含 multipart 的額外欄位，
// 見 node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md），
// 所以照片上限訂在 900 KB，保留空間。要放寬時必須同時設定 serverActions.bodySizeLimit
export const MAX_REPORT_IMAGE_BYTES = 900_000
export const MAX_REPORT_IMAGE_EDGE = 1600

// 依長邊上限等比例縮小，不放大
export function fitWithinEdge(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

// JPEG 檔頭固定以 FF D8 FF 開頭；伺服器端不相信瀏覽器回報的 MIME type，自己再檢查一次
export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}
