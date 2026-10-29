'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { ConfirmDeleteButton } from '@/components/confirm-delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  addSevenDayFluidAverage,
  checkWeightLossAlert,
  compareBloodTestsChronologically,
  evaluatePhosphorusStatus,
  evaluateStageHint,
  groupDailyCareLogsByDate,
  groupDailyPointsByWeek
} from '@/lib/clinical'
import {
  getPeriodStartDate,
  isOnOrAfter,
  parseRecordsPeriod,
  RECORDS_PERIOD_LABELS,
  RECORDS_PERIODS,
  type RecordsPeriod
} from '@/lib/records-period'
import type { BloodTest, CatProfile, DailyCareLog } from '@/lib/schemas'
import { useLocalTime } from '@/lib/use-local-time'
import { toLocalDateString } from '@/lib/utils'

import { deleteBloodTestAction } from './actions'
import { KidneyMarkersChart, PhosphorusChart, WeightFluidChart } from './trend-charts'

function formatStageNumber(stage: CatProfile['irisStage']): string {
  return `第 ${stage.replace('STAGE_', '')} 期`
}

const BLOOD_TEST_PAGE_SIZE = 10

function PeriodFilter({
  period,
  onChange
}: {
  period: RecordsPeriod
  onChange: (period: RecordsPeriod) => void
}) {
  return (
    <div role="group" aria-label="時間範圍" className="flex flex-wrap gap-2">
      {RECORDS_PERIODS.map((option) => (
        <Button
          key={option}
          size="sm"
          variant={option === period ? 'default' : 'outline'}
          aria-pressed={option === period}
          onClick={() => onChange(option)}
        >
          {RECORDS_PERIOD_LABELS[option]}
        </Button>
      ))}
    </div>
  )
}

function BloodTestActions({
  id,
  testDate,
  period
}: {
  id: string
  testDate: string
  period: RecordsPeriod
}) {
  return (
    <div className="flex flex-wrap items-start gap-2 pt-1">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={
          // 帶著目前的篩選，編輯完回到紀錄頁時保留原本的時間範圍
          <Link
            href={`/records/${id}/edit?range=${period}`}
            aria-label={`編輯 ${testDate} 的血檢紀錄`}
          >
            編輯
          </Link>
        }
      />
      <ConfirmDeleteButton
        itemLabel={`${testDate} 的血檢紀錄`}
        onDelete={() => deleteBloodTestAction({ status: 'idle' }, id)}
      />
    </div>
  )
}

export function RecordsClient({
  catProfile,
  dailyCareLogs,
  bloodTests,
  serverToday
}: {
  catProfile: CatProfile
  dailyCareLogs: DailyCareLog[]
  bloodTests: BloodTest[]
  // 伺服器端的台北日期：還沒取得裝置本地日期（SSR 與 hydration 首次渲染）時當作篩選基準，
  // 避免圖表與清單先畫出全部資料再縮回去。最多差一天，對「近 N 個月」的篩選沒有影響
  serverToday: string
}) {
  const localTime = useLocalTime()
  const todayDate = localTime === null ? '' : toLocalDateString(new Date(localTime))

  // 篩選狀態以網址為準：重新整理、從編輯頁返回都保留。切換時用 replaceState 只改網址，
  // 不重新向伺服器取資料（篩選在 client 端對已取得的資料計算），也不在瀏覽紀錄多塞一筆
  const period = parseRecordsPeriod(useSearchParams().get('range'))
  const periodStart = getPeriodStartDate(period, todayDate || serverToday)

  // 顯示筆數跟著篩選走：記下是哪個篩選的筆數，篩選不同就回到 10 筆（例如網址被其他方式改掉）
  const [shownBloodTests, setShownBloodTests] = useState({
    period,
    count: BLOOD_TEST_PAGE_SIZE
  })
  const shownCount =
    shownBloodTests.period === period ? shownBloodTests.count : BLOOD_TEST_PAGE_SIZE

  // 每次切換都重設為 10 筆：只靠上面的比對的話，「6 個月按顯示更多 → 全部 → 切回 6 個月」
  // 會恢復成之前的 20 筆
  function changePeriod(nextPeriod: RecordsPeriod) {
    setShownBloodTests({ period: nextPeriod, count: BLOOD_TEST_PAGE_SIZE })
    window.history.replaceState(null, '', `?range=${nextPeriod}`)
  }
  const weightAlert = useMemo(
    () => checkWeightLossAlert(dailyCareLogs, todayDate),
    [dailyCareLogs, todayDate]
  )
  const dailyPoints = useMemo(() => groupDailyCareLogsByDate(dailyCareLogs), [dailyCareLogs])
  const sortedBloodTests = useMemo(
    () => [...bloodTests].sort(compareBloodTestsChronologically),
    [bloodTests]
  )
  const bloodTestsNewestFirst = useMemo(() => [...sortedBloodTests].reverse(), [sortedBloodTests])

  // 圖表與清單用篩選後的資料；分期提示與體重警報仍用全部資料（見下方與 ADR-009）
  // 近 3／6 個月每天一個點（輸液畫 7 天平均），近 1 年／全部改成每週一個點。
  // 7 天平均要先用全部資料算再篩選，區間開頭幾天才不會只平均到區間內的資料
  const isWeeklyTrend = period === '1y' || period === 'all'
  const weightFluidTrend = useMemo(() => {
    if (isWeeklyTrend) {
      return groupDailyPointsByWeek(
        dailyPoints.filter((point) => isOnOrAfter(point.date, periodStart))
      )
    }
    return addSevenDayFluidAverage(dailyPoints).filter((point) =>
      isOnOrAfter(point.date, periodStart)
    )
  }, [dailyPoints, periodStart, isWeeklyTrend])
  const periodBloodTests = useMemo(
    () => sortedBloodTests.filter((test) => isOnOrAfter(test.testDate, periodStart)),
    [sortedBloodTests, periodStart]
  )
  const periodBloodTestsNewestFirst = useMemo(
    () => [...periodBloodTests].reverse(),
    [periodBloodTests]
  )
  const visibleBloodTests = periodBloodTestsNewestFirst.slice(0, shownCount)
  // 分期提示永遠看全部資料中最新的一筆，不受時間篩選影響
  const stageReviewHint = useMemo(() => {
    const latestTest = bloodTestsNewestFirst[0]
    if (!latestTest) return null
    const hint = evaluateStageHint(catProfile.irisStage, {
      creatinine: latestTest.creatinine,
      sdma: latestTest.sdma
    })
    if (!hint.shouldSuggestReview) return null

    const markerText = hint.markers
      .map((marker) =>
        marker === 'creatinine'
          ? `肌酸酐 ${latestTest.creatinine} mg/dL`
          : `SDMA ${latestTest.sdma} µg/dL`
      )
      .join('、')
    return `最近一次血檢（${latestTest.testDate}）的${markerText}落在 IRIS ${formatStageNumber(hint.suggestedStage)}範圍，高於目前設定的${formatStageNumber(catProfile.irisStage)}。單次數值不能決定分期，可能需要和獸醫師確認分期是否要調整。`
  }, [bloodTestsNewestFirst, catProfile.irisStage])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">血檢紀錄</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href={`/report/${catProfile.id}`}>回診報告</Link>}
          />
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href={`/records/new?range=${period}`}>新增血檢</Link>}
          />
        </div>
      </div>

      {weightAlert.isAlert && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          體重在近期窗口內下滑了 {weightAlert.dropRate}%，建議留意並諮詢獸醫師。
        </div>
      )}

      {stageReviewHint && (
        <div role="status" className="rounded-lg border bg-secondary p-3 text-sm">
          {stageReviewHint}
        </div>
      )}

      <PeriodFilter period={period} onChange={changePeriod} />

      <Card>
        <CardHeader>
          <CardTitle>體重 vs 輸液量</CardTitle>
        </CardHeader>
        <CardContent>
          {weightFluidTrend.length > 0 ? (
            <WeightFluidChart points={weightFluidTrend} isWeekly={isWeeklyTrend} />
          ) : dailyPoints.length > 0 ? (
            <p className="text-sm text-muted-foreground">這段期間沒有照護紀錄。</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              尚無照護紀錄，先到「打卡」頁記錄體重與輸液量後這裡會出現趨勢圖。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>腎指標</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {periodBloodTests.length > 0 ? (
            <>
              <KidneyMarkersChart tests={periodBloodTests} />
              <p className="text-xs text-muted-foreground">
                背景色帶只對應左軸的肌酸酐（IRIS 2026
                貓的分期區間），SDMA（虛線）的分期切點不同，請勿對照色帶判讀。區間僅供參考，分期需由獸醫師判斷；BUN
                請見下方清單。
              </p>
            </>
          ) : sortedBloodTests.length > 0 ? (
            <p className="text-sm text-muted-foreground">這段期間沒有血檢紀錄。</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              尚無血檢紀錄，點右上角「新增血檢」開始記錄。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>血磷</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {periodBloodTests.length > 0 ? (
            <>
              <PhosphorusChart tests={periodBloodTests} irisStage={catProfile.irisStage} />
              <p className="text-xs text-muted-foreground">
                {`紅色虛線：目前設定的${formatStageNumber(catProfile.irisStage)}血磷建議上限 ${evaluatePhosphorusStatus(catProfile.irisStage, 0).targetMax} mg/dL。較早的檢驗若在不同分期時做的，虛線不代表當時的目標。`}
              </p>
            </>
          ) : sortedBloodTests.length > 0 ? (
            <p className="text-sm text-muted-foreground">這段期間沒有血檢紀錄。</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              尚無血檢紀錄，點右上角「新增血檢」開始記錄。
            </p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">歷史血檢清單</h2>
          {periodBloodTests.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {`顯示 ${visibleBloodTests.length} / ${periodBloodTests.length} 筆`}
            </p>
          )}
        </div>
        {bloodTestsNewestFirst.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無血檢紀錄。</p>
        ) : periodBloodTests.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">這段期間沒有血檢紀錄。</p>
            {period !== 'all' && (
              <Button size="sm" variant="outline" onClick={() => changePeriod('all')}>
                查看全部紀錄
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleBloodTests.map((test: BloodTest) => {
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
                    {test.id && (
                      <BloodTestActions id={test.id} testDate={test.testDate} period={period} />
                    )}
                  </CardContent>
                </Card>
              )
            })}
            {visibleBloodTests.length < periodBloodTests.length && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  setShownBloodTests({ period, count: shownCount + BLOOD_TEST_PAGE_SIZE })
                }
              >
                顯示更多
              </Button>
            )}
          </div>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        警示與分期提示僅供參考，不構成醫療建議。
        <Link href="/service#medical-disclaimer" className="underline underline-offset-4">
          醫療免責聲明
        </Link>
      </p>
    </div>
  )
}
