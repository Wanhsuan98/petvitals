import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 依「本地」年月日組出 YYYY-MM-DD，刻意不用 toISOString()（會先轉 UTC，在本地日期邊界附近可能跨日），
// 確保與 DailyCareLog.date（依裝置本地時區派生）採同一套日期定義比較，避免時區邊界誤判
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
