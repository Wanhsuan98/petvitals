import { format, parseISO, startOfISOWeek, subDays } from 'date-fns'

import type { BloodTest, CatProfile, DailyCareLog } from '@/lib/schemas'
import { toLocalDateString } from '@/lib/utils'

// 1. 體重急遽下降警報（預設近 7 天內，窗口內最高點 vs 最新值下滑 >= 3%）
// 日期窗口篩選在函式內處理，呼叫端可直接傳入完整歷史 logs，不需自行先過濾，避免隱性契約造成誤用。
// 「近 7 天」含今天共 7 個日曆日，所以下限是今天往前推 windowDays - 1 天
// today 由呼叫端傳入裝置本地日期（YYYY-MM-DD），不在函式內讀 new Date()：
// 這樣 App 開著跨過午夜時，呼叫端的 useMemo 會因為 today 改變而重算，
// SSR 也不會拿伺服器的時鐘與時區（UTC）算出差一天的窗口。today 為空字串（尚未取得本地時間）時不判定
export function checkWeightLossAlert(
  logs: DailyCareLog[],
  today: string,
  windowDays: number = 7
): { isAlert: boolean; dropRate: number } {
  if (!today) return { isAlert: false, dropRate: 0 }

  const cutoffDate = new Date(`${today}T00:00:00`)
  cutoffDate.setDate(cutoffDate.getDate() - (windowDays - 1))
  const cutoff = toLocalDateString(cutoffDate)

  const recent = logs
    .filter(
      (log): log is DailyCareLog & { weightKg: number } =>
        typeof log.weightKg === 'number' && log.date >= cutoff
    )
    // 依精確打卡時間排序，不能只看 date：同一天量了兩次體重時，
    // 只依 date 排序會讓「最新值」變成當天最早的那筆（輸入資料是由新到舊、排序又是穩定排序）
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))

  if (recent.length < 2) return { isAlert: false, dropRate: 0 }

  const maxWeight = Math.max(...recent.map((log) => log.weightKg))
  const latest = recent[recent.length - 1].weightKg

  const dropRate = ((maxWeight - latest) / maxWeight) * 100
  return {
    isAlert: dropRate >= 3.0,
    dropRate: Number(dropRate.toFixed(1))
  }
}

// 2. IRIS 各期血磷控制標準比對（irisStage 為使用者依獸醫診斷手動設定值，非系統診斷判定）
// 血磷控制上限整理自 IRIS (International Renal Interest Society) 分期照護建議，僅供參考，
// 實際數值可能隨指引版本更新而調整，正式引用前請與獸醫師核對當前版本的臨床指引。
export function evaluatePhosphorusStatus(
  stage: CatProfile['irisStage'],
  pValue: number
): {
  isHigh: boolean
  targetMax: number
  message: string
} {
  const thresholdMap: Record<CatProfile['irisStage'], number> = {
    STAGE_1: 4.5,
    STAGE_2: 4.5,
    STAGE_3: 5.0,
    STAGE_4: 6.0
  }

  const targetMax = thresholdMap[stage]
  const isHigh = pValue > targetMax

  return {
    isHigh,
    targetMax,
    message: isHigh
      ? `當前血磷 (${pValue} mg/dL) 已高於 IRIS ${stage} 期建議上限 (${targetMax} mg/dL)，請諮詢獸醫師是否調整降磷策略。（本標準依 IRIS 分期照護建議整理，僅供參考）`
      : `血磷控制良好，未超過 IRIS ${stage} 期建議上限 ${targetMax} mg/dL。（本標準依 IRIS 分期照護建議整理，僅供參考）`
  }
}

// 2b. 血檢數值是否落在比目前設定更高的 IRIS 分期區間（僅提示，絕不自動修改分期）
// 區間為 IRIS Staging of CKD (Modified 2026) 貓的欄位，見 docs/99-reference/iris.md。
// IRIS 區間在整數位以一位小數表示（肌酸酐 2.8 與 2.9、SDMA 25 與 26 之間沒有定義），
// 這裡以「小於下一期的下限」切分，避免落在空隙的數值（例如 2.85）無法歸類
const STAGE_ORDER: CatProfile['irisStage'][] = ['STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4']

function stageFromCreatinine(creatinine: number): CatProfile['irisStage'] {
  if (creatinine < 1.6) return 'STAGE_1'
  if (creatinine < 2.9) return 'STAGE_2'
  if (creatinine <= 5.0) return 'STAGE_3'
  return 'STAGE_4'
}

function stageFromSdma(sdma: number): CatProfile['irisStage'] {
  if (sdma < 18) return 'STAGE_1'
  if (sdma < 26) return 'STAGE_2'
  if (sdma <= 38) return 'STAGE_3'
  return 'STAGE_4'
}

// 血檢由舊到新排序：先比檢驗日期，同一天再比建立時間。
// 只比日期的話，同一天有兩筆血檢時誰算「最新一筆」是不確定的（取決於資料庫回傳順序），
// 分期提示與報告的最新血磷就可能用錯筆；以後建立的那筆為準，符合「補登正確數值」的直覺
export function compareBloodTestsChronologically(a: BloodTest, b: BloodTest): number {
  return (
    a.testDate.localeCompare(b.testDate) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
  )
}

export function evaluateStageHint(
  currentStage: CatProfile['irisStage'],
  values: { creatinine: number; sdma?: number }
): {
  shouldSuggestReview: boolean
  suggestedStage: CatProfile['irisStage']
  markers: ('creatinine' | 'sdma')[]
} {
  const stageByMarker: { marker: 'creatinine' | 'sdma'; stage: CatProfile['irisStage'] }[] = [
    { marker: 'creatinine', stage: stageFromCreatinine(values.creatinine) }
  ]
  if (typeof values.sdma === 'number') {
    stageByMarker.push({ marker: 'sdma', stage: stageFromSdma(values.sdma) })
  }

  // 兩項指標不一致時 IRIS 建議以較高的一期為準，因此取兩者中較高者
  const highestIndex = Math.max(...stageByMarker.map((item) => STAGE_ORDER.indexOf(item.stage)))
  const suggestedStage = STAGE_ORDER[highestIndex]
  const shouldSuggestReview = highestIndex > STAGE_ORDER.indexOf(currentStage)

  return {
    shouldSuggestReview,
    suggestedStage,
    markers: shouldSuggestReview
      ? stageByMarker
          .filter((item) => STAGE_ORDER.indexOf(item.stage) === highestIndex)
          .map((item) => item.marker)
      : []
  }
}

// 3. 單次輸液量軟性比對（超出醫囑量僅提示，不擋存檔——防呆上限與醫療處方上限分離）
export function checkFluidOverPrescribed(
  subQFluidMl: number,
  prescribedMl: number
): {
  isOverPrescribed: boolean
  message: string | null
} {
  const isOverPrescribed = subQFluidMl > prescribedMl
  return {
    isOverPrescribed,
    message: isOverPrescribed
      ? `本次記錄 (${subQFluidMl}ml) 超出醫囑單次量 (${prescribedMl}ml)，請確認是否手誤或已與獸醫師確認調整。`
      : null
  }
}

// 4. 當日輸液與飲水達成度（分開計算，不合併為單一總水分進度條）
export function calculateDailyProgress(
  todayLogs: DailyCareLog[],
  cat: Pick<CatProfile, 'subQFluidPrescribedMl' | 'subQFluidFrequencyPerDay' | 'dailyFluidTargetMl'>
): { fluidProgressPercent: number; waterProgressPercent: number } {
  const totalFluidMl = todayLogs.reduce((sum, log) => sum + log.subQFluidMl, 0)
  const totalWaterMl = todayLogs.reduce((sum, log) => sum + log.waterIntakeMl, 0)

  const fluidTarget = cat.subQFluidPrescribedMl * cat.subQFluidFrequencyPerDay

  return {
    fluidProgressPercent:
      fluidTarget > 0 ? Math.min(100, Math.round((totalFluidMl / fluidTarget) * 100)) : 0,
    waterProgressPercent: Math.min(100, Math.round((totalWaterMl / cat.dailyFluidTargetMl) * 100))
  }
}

export type DailyCareSummaryPoint = {
  date: string
  weightKg: number | undefined
  totalFluidMl: number
  totalWaterMl: number
}

// 5. 依日期彙總照護日誌：同一天可能有多筆打卡紀錄，輸液/飲水量依當日加總，體重採當天最後一筆
export function groupDailyCareLogsByDate(logs: DailyCareLog[]): DailyCareSummaryPoint[] {
  const byDate = new Map<string, DailyCareSummaryPoint>()

  for (const log of [...logs].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    const point = byDate.get(log.date) ?? {
      date: log.date,
      weightKg: undefined,
      totalFluidMl: 0,
      totalWaterMl: 0
    }
    point.totalFluidMl += log.subQFluidMl
    point.totalWaterMl += log.waterIntakeMl
    if (typeof log.weightKg === 'number') point.weightKg = log.weightKg
    byDate.set(log.date, point)
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

// 紀錄頁「體重 vs 輸液量」圖用的資料點（見 docs/03-domain-logic/daily-aggregation.md）
export type WeightFluidTrendPoint = {
  date: string
  weightKg: number | undefined
  // 有紀錄日子的每日總輸液量平均；沒有可平均的日子時為 undefined（圖上斷開，不畫成 0）
  fluidAvgMl: number | undefined
}

function averageOf(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

// 6. 輸液 7 天平均：每個日期取「含當天往前 7 個日曆日內、有紀錄的日子」的每日總輸液量平均。
// 沒有紀錄的日子不算成 0：沒打卡代表沒記錄，不代表沒輸液，算成 0 會把平均拉低、誤導成輸液不足。
// points 須為 groupDailyCareLogsByDate 的輸出（依日期升冪、一天一個點）
export function addSevenDayFluidAverage(points: DailyCareSummaryPoint[]): WeightFluidTrendPoint[] {
  let windowStartIndex = 0
  return points.map((point, index) => {
    const windowStart = format(subDays(parseISO(point.date), 6), 'yyyy-MM-dd')
    while (points[windowStartIndex].date < windowStart) windowStartIndex += 1
    const windowPoints = points.slice(windowStartIndex, index + 1)
    return {
      date: point.date,
      weightKg: point.weightKg,
      fluidAvgMl: averageOf(windowPoints.map((windowPoint) => windowPoint.totalFluidMl))
    }
  })
}

// 7. 週彙總：以週一為一週的開始，每週一個點、日期標在該週週一。
// 體重取該週最後一筆有值的體重（狀態量不平均，理由同 groupDailyCareLogsByDate）；
// 輸液量取該週有紀錄日子的每日總量平均；完全沒有紀錄的週不產生資料點
export function groupDailyPointsByWeek(points: DailyCareSummaryPoint[]): WeightFluidTrendPoint[] {
  const byWeek = new Map<string, { weightKg: number | undefined; dailyFluidMl: number[] }>()

  for (const point of points) {
    const weekStart = format(startOfISOWeek(parseISO(point.date)), 'yyyy-MM-dd')
    const week = byWeek.get(weekStart) ?? { weightKg: undefined, dailyFluidMl: [] }
    if (typeof point.weightKg === 'number') week.weightKg = point.weightKg
    week.dailyFluidMl.push(point.totalFluidMl)
    byWeek.set(weekStart, week)
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, week]) => ({
      date: weekStart,
      weightKg: week.weightKg,
      fluidAvgMl: averageOf(week.dailyFluidMl)
    }))
}
