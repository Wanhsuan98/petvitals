'use client'

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js'
import { Droplets, Syringe, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { calculateDailyProgress, checkWeightLossAlert } from '@/lib/clinical'
import { STORAGE_KEYS, useLocalList } from '@/lib/local-store'
import { DailyCareLogSchema, type CatProfile } from '@/lib/schemas'
import { toLocalDateString } from '@/lib/utils'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

// TODO(Week 3): 改由已登入使用者實際設定的 CatProfile 帶入，待 Supabase 串接後由 context 提供
const DEMO_CAT: Pick<
  CatProfile,
  'subQFluidPrescribedMl' | 'subQFluidFrequencyPerDay' | 'dailyFluidTargetMl'
> = {
  subQFluidPrescribedMl: 100,
  subQFluidFrequencyPerDay: 1,
  dailyFluidTargetMl: 200
}

const WEIGHT_TREND_WINDOW_DAYS = 7

export default function DashboardHomePage() {
  const dailyCareLogs = useLocalList(STORAGE_KEYS.dailyCareLogs, DailyCareLogSchema)

  const todayDate = toLocalDateString(new Date())
  const todayLogs = useMemo(
    () => dailyCareLogs.filter((log) => log.date === todayDate),
    [dailyCareLogs, todayDate]
  )

  const progress = useMemo(() => calculateDailyProgress(todayLogs, DEMO_CAT), [todayLogs])
  const weightAlert = useMemo(() => checkWeightLossAlert(dailyCareLogs), [dailyCareLogs])

  // 近 7 天每天最後一筆有效體重，用來畫趨勢圖
  const weightTrend = useMemo(() => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - WEIGHT_TREND_WINDOW_DAYS)
    const cutoff = toLocalDateString(cutoffDate)

    const byDate = new Map<string, number>()
    for (const log of [...dailyCareLogs].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
      if (log.date < cutoff || typeof log.weightKg !== 'number') continue
      byDate.set(log.date, log.weightKg)
    }

    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [dailyCareLogs])

  return (
    <div className="space-y-4">
      {weightAlert.isAlert && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-4 text-sm font-medium text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            體重在近 {WEIGHT_TREND_WINDOW_DAYS} 天內下滑了 {weightAlert.dropRate}
            %，建議留意並諮詢獸醫師。
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>今日狀態</CardTitle>
          <CardDescription>{todayDate}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress value={progress.fluidProgressPercent}>
            <div className="flex w-full items-center gap-1.5">
              <Syringe className="size-4 text-muted-foreground" aria-hidden="true" />
              <ProgressLabel>輸液達成度</ProgressLabel>
              <ProgressValue>{(_, value) => `${value}%`}</ProgressValue>
            </div>
          </Progress>

          <Progress value={progress.waterProgressPercent}>
            <div className="flex w-full items-center gap-1.5">
              <Droplets className="size-4 text-muted-foreground" aria-hidden="true" />
              <ProgressLabel>飲水達成度</ProgressLabel>
              <ProgressValue>{(_, value) => `${value}%`}</ProgressValue>
            </div>
          </Progress>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{WEIGHT_TREND_WINDOW_DAYS} 天體重趨勢</CardTitle>
        </CardHeader>
        <CardContent>
          {weightTrend.length > 0 ? (
            <Line
              role="img"
              aria-label={`近 ${WEIGHT_TREND_WINDOW_DAYS} 天體重趨勢圖，詳細數值請至血檢紀錄頁查看`}
              data={{
                labels: weightTrend.map(([date]) => date),
                datasets: [
                  {
                    label: '體重 (kg)',
                    data: weightTrend.map(([, weightKg]) => weightKg),
                    borderColor: '#0f766e',
                    backgroundColor: '#0f766e'
                  }
                ]
              }}
              options={{ responsive: true }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              近 {WEIGHT_TREND_WINDOW_DAYS}{' '}
              天尚無體重紀錄，先到「打卡」頁記錄體重後這裡會出現趨勢圖。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
