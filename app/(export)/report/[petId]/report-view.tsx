'use client'

import { useMemo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  checkWeightLossAlert,
  evaluatePhosphorusStatus,
  groupDailyCareLogsByDate
} from '@/lib/clinical'
import type { BloodTest, CatProfile, DailyCareLog } from '@/lib/schemas'
import { toLocalDateString } from '@/lib/utils'

const RECENT_CARE_WINDOW_DAYS = 14

const IRIS_STAGE_LABELS: Record<CatProfile['irisStage'], string> = {
  STAGE_1: 'IRIS 第 1 期',
  STAGE_2: 'IRIS 第 2 期',
  STAGE_3: 'IRIS 第 3 期',
  STAGE_4: 'IRIS 第 4 期'
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1 rounded-lg border p-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function ReportView({
  catProfile,
  dailyCareLogs,
  bloodTests
}: {
  catProfile: CatProfile
  dailyCareLogs: DailyCareLog[]
  bloodTests: BloodTest[]
}) {
  const sortedBloodTests = useMemo(
    () => [...bloodTests].sort((a, b) => a.testDate.localeCompare(b.testDate)),
    [bloodTests]
  )

  const weightAlert = useMemo(() => checkWeightLossAlert(dailyCareLogs), [dailyCareLogs])

  const recentSummary = useMemo(() => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - RECENT_CARE_WINDOW_DAYS)
    const cutoff = toLocalDateString(cutoffDate)

    const points = groupDailyCareLogsByDate(dailyCareLogs).filter((point) => point.date >= cutoff)
    const latestWeightPoint = [...points]
      .reverse()
      .find((point) => typeof point.weightKg === 'number')

    return {
      daysRecorded: points.length,
      avgFluidMl: average(points.map((point) => point.totalFluidMl)),
      avgWaterMl: average(points.map((point) => point.totalWaterMl)),
      latestWeightKg: latestWeightPoint?.weightKg
    }
  }, [dailyCareLogs])

  const latestBloodTest = sortedBloodTests[sortedBloodTests.length - 1]
  const latestPhosphorusStatus = latestBloodTest
    ? evaluatePhosphorusStatus(catProfile.irisStage, latestBloodTest.phosphorus)
    : null

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-lg font-semibold">回診摘要報告預覽</h1>
        <Button onClick={() => window.print()}>列印 / 匯出 PDF</Button>
      </div>

      <div className="space-y-4 rounded-lg border p-6 print:rounded-none print:border-none print:p-0">
        <header className="flex items-start justify-between border-b pb-3">
          <div>
            <h2 className="text-xl font-semibold">{catProfile.name} — 回診摘要報告</h2>
            <p className="text-sm text-muted-foreground">
              {IRIS_STAGE_LABELS[catProfile.irisStage]}・目標體重 {catProfile.targetWeightKg}
              kg
            </p>
          </div>
          <p className="text-xs text-muted-foreground">產出日期：{toLocalDateString(new Date())}</p>
        </header>

        {weightAlert.isAlert && (
          <div
            role="alert"
            className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm font-medium text-destructive print:bg-transparent"
          >
            體重在近期窗口內下滑了 {weightAlert.dropRate}%，建議優先與獸醫師討論。
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard title="最新體重">
            <p className="text-lg font-semibold">
              {typeof recentSummary.latestWeightKg === 'number'
                ? `${recentSummary.latestWeightKg} kg`
                : '尚無紀錄'}
            </p>
          </SummaryCard>

          <SummaryCard
            title={`近 ${RECENT_CARE_WINDOW_DAYS} 天平均每日照護量（依 ${recentSummary.daysRecorded}/${RECENT_CARE_WINDOW_DAYS} 天記錄計算）`}
          >
            <p className="text-sm">
              輸液 {recentSummary.avgFluidMl} ml・飲水 {recentSummary.avgWaterMl} ml
            </p>
            <p className="text-xs text-muted-foreground">
              醫囑單次輸液 {catProfile.subQFluidPrescribedMl} ml，每日
              {catProfile.subQFluidFrequencyPerDay} 次・飲水目標 {catProfile.dailyFluidTargetMl} ml
            </p>
          </SummaryCard>

          <SummaryCard title="最新血磷狀態">
            {latestBloodTest && latestPhosphorusStatus ? (
              <>
                <p className="text-lg font-semibold">{latestBloodTest.phosphorus} mg/dL</p>
                <p
                  className={
                    latestPhosphorusStatus.isHigh
                      ? 'text-xs text-destructive'
                      : 'text-xs text-muted-foreground'
                  }
                >
                  {latestPhosphorusStatus.isHigh ? '高於建議上限' : '符合建議目標'}（
                  {latestBloodTest.testDate}）
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">尚無血檢紀錄</p>
            )}
          </SummaryCard>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">血檢趨勢</h3>
          {sortedBloodTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚無血檢紀錄。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      日期
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      醫院
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      BUN
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      Creatinine
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      SDMA
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      血磷
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-medium">
                      HCT
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBloodTests.map((test) => {
                    const status = evaluatePhosphorusStatus(catProfile.irisStage, test.phosphorus)
                    return (
                      <tr key={test.id} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">{test.testDate}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">
                          {test.hospitalName ?? '—'}
                        </td>
                        <td className="py-1.5 pr-3">{test.bun}</td>
                        <td className="py-1.5 pr-3">{test.creatinine}</td>
                        <td className="py-1.5 pr-3">{test.sdma ?? '—'}</td>
                        <td
                          className={`py-1.5 pr-3 ${status.isHigh ? 'font-medium text-destructive' : ''}`}
                        >
                          {test.phosphorus}
                        </td>
                        <td className="py-1.5 pr-3">{test.hct ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="border-t pt-3 text-xs text-muted-foreground">
          本系統（PetVitals）僅作為飼主居家健康數據記錄、歷史趨勢可視化與日常照護之輔助工具，不具備獸醫臨床診斷功能，
          亦不構成任何醫療處方與治療建議。系統提供之 IRIS
          分期標準與警戒提示僅供參考，毛孩之確切病情、輸液劑量與處方用藥，
          請務必遵循執業獸醫師之醫囑與指導。
        </footer>
      </div>
    </div>
  )
}
