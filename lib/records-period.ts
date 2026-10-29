// 紀錄頁的時間篩選（見 docs/01-requirements/blood-test.md、ADR-009）。
// 圖表與血檢清單共用同一個篩選，狀態放在網址 /records?range=
export const RECORDS_PERIODS = ['3m', '6m', '1y', 'all'] as const
export type RecordsPeriod = (typeof RECORDS_PERIODS)[number]

export const DEFAULT_RECORDS_PERIOD: RecordsPeriod = '6m'

export const RECORDS_PERIOD_LABELS: Record<RecordsPeriod, string> = {
  '3m': '近 3 個月',
  '6m': '近 6 個月',
  '1y': '近 1 年',
  all: '全部'
}

const PERIOD_MONTHS: Record<Exclude<RecordsPeriod, 'all'>, number> = {
  '3m': 3,
  '6m': 6,
  '1y': 12
}

function isRecordsPeriod(value: string): value is RecordsPeriod {
  return (RECORDS_PERIODS as readonly string[]).includes(value)
}

// 網址沒有帶、或帶了不合法的值（使用者手改網址）一律回到預設值，不報錯
export function parseRecordsPeriod(value: string | null | undefined): RecordsPeriod {
  return value && isRecordsPeriod(value) ? value : DEFAULT_RECORDS_PERIOD
}

// 篩選區間的第一天（YYYY-MM-DD，含當天）；「全部」沒有下限回傳 null。
// 「近 N 個月」是今天往前推 N 個日曆月：目標月份沒有同一天時取該月最後一天
// （例如 8/31 往前 6 個月是 2/28），不用 Date#setMonth，它會溢位到下個月（變成 3/3）
export function getPeriodStartDate(period: RecordsPeriod, today: string): string | null {
  if (period === 'all') return null

  const [year, month, day] = today.split('-').map(Number)
  const monthIndex = year * 12 + (month - 1) - PERIOD_MONTHS[period]
  const startYear = Math.floor(monthIndex / 12)
  const startMonth = (monthIndex % 12) + 1
  const lastDayOfMonth = new Date(startYear, startMonth, 0).getDate()
  const startDay = Math.min(day, lastDayOfMonth)

  return `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
}

export function isOnOrAfter(date: string, startDate: string | null): boolean {
  return startDate === null || date >= startDate
}
