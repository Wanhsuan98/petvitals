import type { CatProfile, DailyCareLog } from '@/lib/schemas'
import { toLocalDateString } from '@/lib/utils'

// 1. 體重急遽下降警報（預設近 7 天內，窗口內最高點 vs 最新值下滑 >= 3%）
// 日期窗口篩選在函式內處理，呼叫端可直接傳入完整歷史 logs，不需自行先過濾，避免隱性契約造成誤用
export function checkWeightLossAlert(
  logs: DailyCareLog[],
  windowDays: number = 7
): { isAlert: boolean; dropRate: number } {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - windowDays)
  const cutoff = toLocalDateString(cutoffDate)

  const recent = logs
    .filter(
      (log): log is DailyCareLog & { weightKg: number } =>
        typeof log.weightKg === 'number' && log.date >= cutoff
    )
    .sort((a, b) => a.date.localeCompare(b.date))

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
      : `血磷控制良好，符合 IRIS ${stage} 期目標 (< ${targetMax} mg/dL)。（本標準依 IRIS 分期照護建議整理，僅供參考）`
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
