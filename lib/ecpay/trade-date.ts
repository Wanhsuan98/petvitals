// ECPay 要求 MerchantTradeDate 是「Y/m/d H:i:s」格式的台灣本地時間，
// 不能直接用 server 的本地時區（Vercel 預設 UTC），需要明確轉換成 Asia/Taipei。
export function formatMerchantTradeDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date)

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}
