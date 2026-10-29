'use client'

import {
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type Plugin
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { Line } from 'react-chartjs-2'

import { evaluatePhosphorusStatus, type WeightFluidTrendPoint } from '@/lib/clinical'
import type { BloodTest, CatProfile } from '@/lib/schemas'

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

// 紀錄頁的三張趨勢圖（見 docs/01-requirements/dashboard.md、ADR-009）。
// 橫軸一律是時間軸：資料點依實際日期間距排列，隔 1 個月與隔 3 個月的血檢不會被畫成等距
type TimePoint = { x: string; y: number | null }
type TimeLineData = ChartData<'line', TimePoint[]>

const COLORS = {
  weight: '#557a63',
  fluid: '#c98255',
  creatinine: '#c98255',
  sdma: '#557a63',
  phosphorus: '#d4a84f',
  limit: '#b4463c'
}

// 資料點超過這個數量就不畫圓點，避免擠成一團；點擊或滑過仍會顯示該日期的數值
const MAX_POINTS_WITH_MARKERS = 60

function pointRadiusFor(pointCount: number): number {
  return pointCount > MAX_POINTS_WITH_MARKERS ? 0 : 3
}

const TIME_AXIS: NonNullable<ChartOptions<'line'>['scales']>[string] = {
  type: 'time',
  time: {
    tooltipFormat: 'yyyy-MM-dd',
    displayFormats: { day: 'M/d', week: 'M/d', month: 'yyyy/M', quarter: 'yyyy/M', year: 'yyyy' }
  },
  ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }
}

function baseOptions(scales: NonNullable<ChartOptions<'line'>['scales']>): ChartOptions<'line'> {
  return {
    responsive: true,
    // 點在任何位置都顯示同一日期的所有數值，資料點沒有圓點時也能查看
    interaction: { mode: 'index', intersect: false },
    // monotone 曲線不會在兩個資料點之間「過衝」：預設算法在數值急升急降時會畫出比實際更高或
    // 更低的弧線，等於在沒有檢驗的日期畫出不存在的數值，不適合臨床數據
    elements: { line: { cubicInterpolationMode: 'monotone' } },
    plugins: { legend: { position: 'top' } },
    scales: { x: TIME_AXIS, ...scales }
  }
}

// IRIS 貓的肌酸酐分期區間（mg/dL），切點與 evaluateStageHint 一致：
// 小於下一期下限就算前一期（例如 2.85 歸第 2 期），來源見 docs/99-reference/iris.md
const CREATININE_STAGE_BANDS = [
  // 綠 → 黃 → 橘 → 紅，相鄰兩期的顏色要拉得夠開，否則看不出分界
  { label: '1期', from: 0, to: 1.6, color: 'rgba(85, 160, 110, 0.12)' },
  { label: '2期', from: 1.6, to: 2.9, color: 'rgba(235, 200, 80, 0.20)' },
  { label: '3期', from: 2.9, to: 5.0, color: 'rgba(230, 130, 60, 0.20)' },
  { label: '4期', from: 5.0, to: Number.POSITIVE_INFINITY, color: 'rgba(200, 60, 50, 0.18)' }
]

// 在資料線之前畫背景色帶，色帶左上角標示分期
const creatinineBandsPlugin: Plugin<'line'> = {
  id: 'creatinineStageBands',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart
    const yScale = scales.y
    if (!yScale) return

    ctx.save()
    for (const band of CREATININE_STAGE_BANDS) {
      if (band.from >= yScale.max) continue
      const top = yScale.getPixelForValue(Math.min(band.to, yScale.max))
      const bottom = yScale.getPixelForValue(Math.max(band.from, yScale.min))
      ctx.fillStyle = band.color
      ctx.fillRect(chartArea.left, top, chartArea.right - chartArea.left, bottom - top)
      if (bottom - top >= 14) {
        ctx.fillStyle = 'rgba(60, 60, 60, 0.55)'
        ctx.font = '11px sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText(band.label, chartArea.left + 4, top + 2)
      }
    }
    ctx.restore()
  }
}

// 血磷上限虛線：畫成橫跨整個圖的水平線，只有一筆血檢時也看得到
function phosphorusLimitPlugin(limit: number): Plugin<'line'> {
  return {
    id: 'phosphorusLimit',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart
      const yScale = scales.y
      if (!yScale) return
      const y = yScale.getPixelForValue(limit)
      ctx.save()
      ctx.strokeStyle = COLORS.limit
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(chartArea.left, y)
      ctx.lineTo(chartArea.right, y)
      ctx.stroke()
      ctx.restore()
    }
  }
}

export function WeightFluidChart({
  points,
  isWeekly
}: {
  points: WeightFluidTrendPoint[]
  isWeekly: boolean
}) {
  const radius = pointRadiusFor(points.length)
  const data: TimeLineData = {
    datasets: [
      {
        label: isWeekly ? '體重（每週最後一筆，kg）' : '體重 (kg)',
        data: points.map((point) => ({ x: point.date, y: point.weightKg ?? null })),
        yAxisID: 'y',
        borderColor: COLORS.weight,
        backgroundColor: COLORS.weight,
        pointRadius: radius,
        tension: 0.2,
        // 沒量體重的日子跳過、把前後連起來，不讓線斷成一段一段
        spanGaps: true
      },
      {
        label: isWeekly ? '輸液量（每週的每日平均，ml）' : '輸液量（7 天平均，ml）',
        data: points.map((point) => ({ x: point.date, y: point.fluidAvgMl ?? null })),
        yAxisID: 'y1',
        borderColor: COLORS.fluid,
        backgroundColor: COLORS.fluid,
        pointRadius: radius,
        tension: 0.2
      }
    ]
  }

  return (
    <Line
      // react-chartjs-2 預設把 canvas 標成 role="img"，要給名稱螢幕閱讀器才知道是哪張圖
      aria-label={
        isWeekly ? '體重與輸液量趨勢圖，每週一個資料點' : '體重與輸液量趨勢圖，輸液量為 7 天平均'
      }
      data={data}
      options={baseOptions({
        y: { type: 'linear', position: 'left', title: { display: true, text: 'kg' } },
        y1: {
          type: 'linear',
          position: 'right',
          min: 0,
          title: { display: true, text: 'ml' },
          grid: { drawOnChartArea: false }
        }
      })}
    />
  )
}

export function KidneyMarkersChart({ tests }: { tests: BloodTest[] }) {
  const hasSdma = tests.some((test) => typeof test.sdma === 'number')
  const radius = pointRadiusFor(tests.length)
  const maxCreatinine = Math.max(...tests.map((test) => test.creatinine))

  const data: TimeLineData = {
    datasets: [
      {
        label: '肌酸酐 (mg/dL)',
        data: tests.map((test) => ({ x: test.testDate, y: test.creatinine })),
        yAxisID: 'y',
        borderColor: COLORS.creatinine,
        backgroundColor: COLORS.creatinine,
        pointRadius: radius,
        tension: 0.2
      },
      ...(hasSdma
        ? [
            {
              label: 'SDMA (µg/dL)',
              data: tests.map((test) => ({ x: test.testDate, y: test.sdma ?? null })),
              yAxisID: 'y1',
              borderColor: COLORS.sdma,
              backgroundColor: COLORS.sdma,
              // 虛線：背景色帶只對應左軸的肌酸酐，SDMA 的分期切點不同，
              // 用不同線型提醒不要拿 SDMA 線去對色帶
              borderDash: [6, 4],
              pointRadius: radius,
              tension: 0.2,
              spanGaps: true
            }
          ]
        : [])
    ]
  }

  return (
    <Line
      aria-label={`肌酸酐${hasSdma ? '與 SDMA ' : ''}趨勢圖，背景色帶為肌酸酐的 IRIS 分期區間，各次數值請見下方血檢清單`}
      data={data}
      plugins={[creatinineBandsPlugin]}
      options={baseOptions({
        // 至少顯示到第 3 期的範圍，讓使用者看得出目前離下一期多遠
        y: {
          type: 'linear',
          position: 'left',
          min: 0,
          suggestedMax: Math.max(3.5, maxCreatinine + 0.5),
          title: { display: true, text: '肌酸酐 (mg/dL)' }
        },
        ...(hasSdma
          ? {
              y1: {
                type: 'linear' as const,
                position: 'right' as const,
                min: 0,
                title: { display: true, text: 'SDMA (µg/dL)' },
                grid: { drawOnChartArea: false }
              }
            }
          : {})
      })}
    />
  )
}

export function PhosphorusChart({
  tests,
  irisStage
}: {
  tests: BloodTest[]
  irisStage: CatProfile['irisStage']
}) {
  const { targetMax } = evaluatePhosphorusStatus(irisStage, 0)
  const maxPhosphorus = Math.max(...tests.map((test) => test.phosphorus))

  const data: TimeLineData = {
    datasets: [
      {
        label: '血磷 (mg/dL)',
        data: tests.map((test) => ({ x: test.testDate, y: test.phosphorus })),
        yAxisID: 'y',
        borderColor: COLORS.phosphorus,
        backgroundColor: COLORS.phosphorus,
        pointRadius: pointRadiusFor(tests.length),
        tension: 0.2
      }
    ]
  }

  return (
    <Line
      // plugins 只在建立圖表時讀取一次：分期改變（上限改變）時用 key 重建圖表，虛線才會跟著更新
      key={targetMax}
      aria-label={`血磷趨勢圖，虛線為目前分期建議上限 ${targetMax} mg/dL，各次數值請見下方血檢清單`}
      data={data}
      plugins={[phosphorusLimitPlugin(targetMax)]}
      options={baseOptions({
        // 上限虛線一定要在圖內
        y: {
          type: 'linear',
          position: 'left',
          min: 0,
          suggestedMax: Math.max(targetMax, maxPhosphorus) + 1,
          title: { display: true, text: '血磷 (mg/dL)' }
        }
      })}
    />
  )
}
