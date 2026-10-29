import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BloodTest, CatProfile } from '@/lib/schemas'

const mocks = vi.hoisted(() => ({ range: null as string | null }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mocks.range === null ? '' : `range=${mocks.range}`)
}))
vi.mock('./actions', () => ({ deleteBloodTestAction: vi.fn() }))

import { RecordsClient } from './records-client'

const PET_ID = '00000000-0000-4000-8000-000000000002'
const catProfile: CatProfile = {
  id: PET_ID,
  ownerId: '00000000-0000-4000-8000-000000000001',
  name: '小橘',
  birthYear: 2019,
  targetWeightKg: 4.2,
  irisStage: 'STAGE_2',
  dailyFluidTargetMl: 200,
  subQFluidPrescribedMl: 100,
  subQFluidFrequencyPerDay: 1
}

function makeBloodTest(index: number, testDate: string, creatinine = 2.0): BloodTest {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    petId: PET_ID,
    testDate,
    bun: 30,
    creatinine,
    phosphorus: 4.0,
    createdAt: `${testDate}T00:00:00.000Z`
  }
}

// 2026-10-28 往回每兩週一筆，共 15 筆：近 6 個月（2026-04-29 起，含當天）內 14 筆，另外 1 筆更早
const recentTests = Array.from({ length: 15 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 9, 28 - index * 14))
  return makeBloodTest(index + 1, date.toISOString().slice(0, 10))
})

function render(bloodTests: BloodTest[]) {
  return renderToStaticMarkup(
    createElement(RecordsClient, {
      catProfile,
      dailyCareLogs: [],
      bloodTests,
      serverToday: '2026-10-29'
    })
  )
}

function countListItems(html: string): number {
  return html.match(/aria-label="編輯 /g)?.length ?? 0
}

beforeEach(() => {
  mocks.range = null
})

describe('records period filter', () => {
  it('defaults to the last 6 months and shows the first 10 tests with a show-more button', () => {
    const html = render(recentTests)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toMatch(/aria-pressed="true"[^>]*>近 6 個月/)
    expect(html).toContain('顯示 10 / 14 筆')
    expect(countListItems(html)).toBe(10)
    expect(html).toContain('顯示更多')
  })

  it('shows every test for "all" and keeps the period on edit links', () => {
    mocks.range = 'all'
    const html = render(recentTests)
    expect(html).toContain('顯示 10 / 15 筆')
    expect(html).toContain('/edit?range=all')
    expect(html).toContain('href="/records/new?range=all"')
  })

  it('falls back to the default for an invalid range in the URL', () => {
    mocks.range = 'abc'
    expect(render(recentTests)).toContain('顯示 10 / 14 筆')
  })

  it('hides the show-more button once everything in the period is shown', () => {
    mocks.range = '3m'
    const html = render(recentTests)
    expect(countListItems(html)).toBe(7)
    expect(html).not.toContain('顯示更多')
  })

  it('offers "all" when the period has no tests but older ones exist', () => {
    const html = render([makeBloodTest(1, '2025-01-10')])
    expect(html).toContain('這段期間沒有血檢紀錄')
    expect(html).toContain('查看全部紀錄')
  })

  it('keeps the stage hint on the newest test even when it is outside the period', () => {
    mocks.range = '3m'
    const html = render([makeBloodTest(1, '2026-03-01', 3.5)])
    expect(html).toContain('這段期間沒有血檢紀錄')
    expect(html).toContain('IRIS 第 3 期範圍')
  })
})
