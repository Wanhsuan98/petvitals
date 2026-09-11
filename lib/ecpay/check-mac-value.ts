import crypto from 'node:crypto'

// 依 ECPay 官方 CheckMacValue 演算法實作（見 .claude/skills/ecpay/guides/13-checkmacvalue.md）：
// 排序參數 -> 組成 HashKey=...&k1=v1&...&HashIV=... 字串 -> ECPay 專用 URL encode -> SHA256 -> 轉大寫。
// 這個 URL encode 跟一般的 encodeURIComponent 不一樣（空白要變成 +、~ 跟 ' 也要額外處理，
// 再套用 .NET 的字元還原表），少一步都會讓雙方算出的簽章對不起來。
export type EcpayParams = Record<string, string>

function ecpayUrlEncode(source: string): string {
  let encoded = encodeURIComponent(source)
    .replace(/%20/g, '+')
    .replace(/~/g, '%7e')
    .replace(/'/g, '%27')
  encoded = encoded.toLowerCase()

  const replacements: Record<string, string> = {
    '%2d': '-',
    '%5f': '_',
    '%2e': '.',
    '%21': '!',
    '%2a': '*',
    '%28': '(',
    '%29': ')'
  }
  for (const [from, to] of Object.entries(replacements)) {
    encoded = encoded.split(from).join(to)
  }
  return encoded
}

export function generateCheckMacValue(
  params: EcpayParams,
  hashKey: string,
  hashIv: string
): string {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== 'CheckMacValue')
  )
  const sortedKeys = Object.keys(filtered).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  )
  const paramString = sortedKeys.map((key) => `${key}=${filtered[key]}`).join('&')
  const raw = `HashKey=${hashKey}&${paramString}&HashIV=${hashIv}`

  return crypto.createHash('sha256').update(ecpayUrlEncode(raw), 'utf8').digest('hex').toUpperCase()
}

// timing-safe 比較，避免用 === 比較字串洩漏時間側錄資訊
export function verifyCheckMacValue(params: EcpayParams, hashKey: string, hashIv: string): boolean {
  const received = params.CheckMacValue ?? ''
  const calculated = generateCheckMacValue(params, hashKey, hashIv)

  const receivedBuf = Buffer.from(received.toUpperCase())
  const calculatedBuf = Buffer.from(calculated)
  if (receivedBuf.length !== calculatedBuf.length) return false

  return crypto.timingSafeEqual(receivedBuf, calculatedBuf)
}
