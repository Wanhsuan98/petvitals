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
import {
  Bell,
  ClipboardCheck,
  Droplets,
  FileText,
  FlaskConical,
  Syringe,
  TriangleAlert
} from 'lucide-react'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { calculateDailyProgress, checkWeightLossAlert } from '@/lib/clinical'
import type { CatProfile, DailyCareLog } from '@/lib/schemas'
import { useLocalTime } from '@/lib/use-local-time'
import { toLocalDateString } from '@/lib/utils'

import { QuickActionCard } from './quick-action-card'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const WEIGHT_TREND_WINDOW_DAYS = 7

function getGreeting(localTime: number | null): string {
  if (localTime === null) return '你好'
  const hour = new Date(localTime).getHours()
  if (hour < 5) return '夜深了'
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
}

export function DashboardHomeClient({
  catProfile,
  dailyCareLogs
}: {
  catProfile: CatProfile
  dailyCareLogs: DailyCareLog[]
}) {
  const localTime = useLocalTime()
  const todayDate = localTime === null ? '' : toLocalDateString(new Date(localTime))
  const todayLogs = useMemo(
    () => dailyCareLogs.filter((log) => log.date === todayDate),
    [dailyCareLogs, todayDate]
  )

  const progress = useMemo(
    () => calculateDailyProgress(todayLogs, catProfile),
    [todayLogs, catProfile]
  )
  const weightAlert = useMemo(() => checkWeightLossAlert(dailyCareLogs), [dailyCareLogs])

  // 跟 calculateDailyProgress 算百分比用的是同一組原始數值，這裡只是額外算出來顯示
  // 「80% · 120/150ml」這種含實際毫升數的格式，不值得為了這個display-only的需求
  // 去改 calculateDailyProgress 的回傳型別
  const totalFluidMl = useMemo(
    () => todayLogs.reduce((sum, log) => sum + log.subQFluidMl, 0),
    [todayLogs]
  )
  const totalWaterMl = useMemo(
    () => todayLogs.reduce((sum, log) => sum + log.waterIntakeMl, 0),
    [todayLogs]
  )
  const fluidTargetMl = catProfile.subQFluidPrescribedMl * catProfile.subQFluidFrequencyPerDay

  // 近 7 天每天最後一筆有效體重，用來畫趨勢圖
  const weightTrend = useMemo(() => {
    if (!todayDate) return []
    const cutoffDate = new Date(`${todayDate}T00:00:00`)
    cutoffDate.setDate(cutoffDate.getDate() - WEIGHT_TREND_WINDOW_DAYS)
    const cutoff = toLocalDateString(cutoffDate)

    const byDate = new Map<string, number>()
    for (const log of [...dailyCareLogs].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
      if (log.date < cutoff || typeof log.weightKg !== 'number') continue
      byDate.set(log.date, log.weightKg)
    }

    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [dailyCareLogs, todayDate])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-[26px] font-bold tracking-tight">
            {getGreeting(localTime)}，{catProfile.name} 今天還好嗎？
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            慢慢來，你已經照顧得很棒了。
          </p>
        </div>
        <button
          type="button"
          aria-label="通知"
          className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
        >
          <Bell className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard
          href="/log"
          icon={ClipboardCheck}
          tint="sage"
          title="完成今日打卡"
          description="記下今天的照護"
        />
        <QuickActionCard
          href="/records/new"
          icon={FlaskConical}
          tint="terracotta"
          title="新增血檢紀錄"
          description="保存重要數值"
        />
        <QuickActionCard
          href="/records"
          icon={FileText}
          tint="gold"
          title="回診摘要報告"
          description="帶著紀錄去看診"
        />
        <QuickActionCard
          href="/settings/reminders"
          icon={Bell}
          tint="lavender"
          title="提醒排程"
          description="準時做好每一步"
        />
      </div>

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
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>今日狀態</CardTitle>
            <CardDescription className="mt-1">{todayDate || '載入本地日期…'}</CardDescription>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            進行中
          </span>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress value={progress.fluidProgressPercent}>
            <div className="flex w-full items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Syringe className="size-4 text-muted-foreground" aria-hidden="true" />
                <ProgressLabel>皮下輸液</ProgressLabel>
              </div>
              <strong className="font-semibold text-primary">
                <ProgressValue>{(_, value) => `${value}%`}</ProgressValue>{' '}
                <span className="font-normal text-muted-foreground">
                  · {totalFluidMl} / {fluidTargetMl} ml
                </span>
              </strong>
            </div>
          </Progress>

          <Progress value={progress.waterProgressPercent} indicatorClassName="bg-accent">
            <div className="flex w-full items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Droplets className="size-4 text-muted-foreground" aria-hidden="true" />
                <ProgressLabel>飲水量</ProgressLabel>
              </div>
              <strong className="font-semibold text-accent-text">
                <ProgressValue>{(_, value) => `${value}%`}</ProgressValue>{' '}
                <span className="font-normal text-muted-foreground">
                  · {totalWaterMl} / {catProfile.dailyFluidTargetMl} ml
                </span>
              </strong>
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
                    borderColor: '#557a63',
                    backgroundColor: '#557a63'
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
