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
import Link from 'next/link'
import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  checkWeightLossAlert,
  evaluatePhosphorusStatus,
  groupDailyCareLogsByDate
} from '@/lib/clinical'
import type { BloodTest, CatProfile, DailyCareLog } from '@/lib/schemas'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

type DualAxisDataset = {
  label: string
  data: (number | null)[]
  yAxisID: 'y' | 'y1'
  color: string
}

type DualAxisLineChartProps = {
  labels: string[]
  datasets: DualAxisDataset[]
  leftAxisLabel: string
  rightAxisLabel: string
}

function DualAxisLineChart({
  labels,
  datasets,
  leftAxisLabel,
  rightAxisLabel
}: DualAxisLineChartProps) {
  return (
    <Line
      role="img"
      aria-label={`${leftAxisLabel} 與 ${rightAxisLabel} 趨勢圖，詳細數值請參考下方清單`}
      data={{
        labels,
        datasets: datasets.map((dataset) => ({
          label: dataset.label,
          data: dataset.data,
          yAxisID: dataset.yAxisID,
          borderColor: dataset.color,
          backgroundColor: dataset.color,
          spanGaps: true
        }))
      }}
      options={{
        responsive: true,
        scales: {
          y: { type: 'linear', position: 'left', title: { display: true, text: leftAxisLabel } },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: rightAxisLabel },
            grid: { drawOnChartArea: false }
          }
        }
      }}
    />
  )
}

export function RecordsClient({
  catProfile,
  dailyCareLogs,
  bloodTests
}: {
  catProfile: CatProfile
  dailyCareLogs: DailyCareLog[]
  bloodTests: BloodTest[]
}) {
  const weightAlert = useMemo(() => checkWeightLossAlert(dailyCareLogs), [dailyCareLogs])
  const dailyPoints = useMemo(() => groupDailyCareLogsByDate(dailyCareLogs), [dailyCareLogs])
  const sortedBloodTests = useMemo(
    () => [...bloodTests].sort((a, b) => a.testDate.localeCompare(b.testDate)),
    [bloodTests]
  )
  const bloodTestsNewestFirst = useMemo(() => [...sortedBloodTests].reverse(), [sortedBloodTests])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">血檢紀錄</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/records/new">新增血檢</Link>} />
      </div>

      {weightAlert.isAlert && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          體重在近期窗口內下滑了 {weightAlert.dropRate}%，建議留意並諮詢獸醫師。
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>體重 vs 輸液量</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyPoints.length > 0 ? (
            <DualAxisLineChart
              labels={dailyPoints.map((point) => point.date)}
              leftAxisLabel="kg"
              rightAxisLabel="ml"
              datasets={[
                {
                  label: '體重 (kg)',
                  data: dailyPoints.map((point) => point.weightKg ?? null),
                  yAxisID: 'y',
                  color: '#0f766e'
                },
                {
                  label: '每日輸液量 (ml)',
                  data: dailyPoints.map((point) => point.totalFluidMl),
                  yAxisID: 'y1',
                  color: '#f59e0b'
                }
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              尚無照護紀錄，先到「打卡」頁記錄體重與輸液量後這裡會出現趨勢圖。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>BUN / Creatinine vs 血磷</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedBloodTests.length > 0 ? (
            <DualAxisLineChart
              labels={sortedBloodTests.map((test) => test.testDate)}
              leftAxisLabel="BUN / Creatinine (mg/dL)"
              rightAxisLabel="血磷 (mg/dL)"
              datasets={[
                {
                  label: 'BUN (mg/dL)',
                  data: sortedBloodTests.map((test) => test.bun),
                  yAxisID: 'y',
                  color: '#0f766e'
                },
                {
                  label: 'Creatinine (mg/dL)',
                  data: sortedBloodTests.map((test) => test.creatinine),
                  yAxisID: 'y',
                  color: '#2563eb'
                },
                {
                  label: '血磷 Phosphorus (mg/dL)',
                  data: sortedBloodTests.map((test) => test.phosphorus),
                  yAxisID: 'y1',
                  color: '#f59e0b'
                }
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              尚無血檢紀錄，點右上角「新增血檢」開始記錄。
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">歷史血檢清單</h2>
        {bloodTestsNewestFirst.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無血檢紀錄。</p>
        ) : (
          <div className="space-y-2">
            {bloodTestsNewestFirst.map((test: BloodTest) => {
              const phosphorusStatus = evaluatePhosphorusStatus(
                catProfile.irisStage,
                test.phosphorus
              )
              return (
                <Card key={test.id} size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between font-medium">
                      <span>{test.testDate}</span>
                      {test.hospitalName && (
                        <span className="text-xs font-normal text-muted-foreground">
                          {test.hospitalName}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-muted-foreground">
                      BUN {test.bun}・Creatinine {test.creatinine}・血磷 {test.phosphorus}
                      {typeof test.sdma === 'number' ? `・SDMA ${test.sdma}` : ''}
                      {typeof test.hct === 'number' ? `・HCT ${test.hct}` : ''}
                    </p>
                    <Badge variant={phosphorusStatus.isHigh ? 'destructive' : 'secondary'}>
                      {phosphorusStatus.isHigh ? '血磷偏高' : '血磷正常'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{phosphorusStatus.message}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
