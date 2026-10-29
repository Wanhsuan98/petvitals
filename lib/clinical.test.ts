import { describe, expect, it } from 'vitest'

import {
  addSevenDayFluidAverage,
  calculateDailyProgress,
  checkFluidOverPrescribed,
  checkWeightLossAlert,
  compareBloodTestsChronologically,
  evaluatePhosphorusStatus,
  evaluateStageHint,
  groupDailyCareLogsByDate,
  groupDailyPointsByWeek,
  type DailyCareSummaryPoint
} from './clinical'
import type { BloodTest, DailyCareLog } from './schemas'

function makeLog(overrides: Partial<DailyCareLog> = {}): DailyCareLog {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    petId: '00000000-0000-4000-8000-000000000002',
    recordedAt: '2026-01-15T08:00:00.000Z',
    date: '2026-01-15',
    subQFluidMl: 0,
    waterIntakeMl: 0,
    appetiteLevel: 'NORMAL',
    vomitCount: 0,
    ...overrides
  }
}

describe('checkWeightLossAlert', () => {
  const today = '2026-01-20'

  it('does not alert with fewer than two weighted logs in the window', () => {
    const logs = [
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.5 })
    ]
    expect(checkWeightLossAlert(logs, today).isAlert).toBe(false)
  })

  it('alerts when weight drops 3% or more from the window high', () => {
    const logs = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: 5.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.8 })
    ]
    const result = checkWeightLossAlert(logs, today)
    expect(result.isAlert).toBe(true)
    expect(result.dropRate).toBe(4.0)
  })

  it('does not alert when the drop is under 3%', () => {
    const logs = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: 5.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(logs, today).isAlert).toBe(false)
  })

  it('ignores logs outside the window', () => {
    const logs = [
      // outside the default 7-day window relative to 2026-01-20
      makeLog({ date: '2026-01-05', recordedAt: '2026-01-05T08:00:00.000Z', weightKg: 10.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(logs, today).isAlert).toBe(false)
  })

  it('uses the latest weight of the day, not the earliest, when weighed twice', () => {
    // 輸入跟 listDailyCareLogs 一樣是由新到舊
    const logs = [
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T20:00:00.000Z', weightKg: 4.8 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 5.0 }),
      makeLog({ date: '2026-01-15', recordedAt: '2026-01-15T08:00:00.000Z', weightKg: 5.0 })
    ]
    const result = checkWeightLossAlert(logs, today)
    expect(result.isAlert).toBe(true)
    expect(result.dropRate).toBe(4.0)
  })

  it('does not alert when the later weighing of the day recovered', () => {
    const logs = [
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T20:00:00.000Z', weightKg: 5.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.8 }),
      makeLog({ date: '2026-01-15', recordedAt: '2026-01-15T08:00:00.000Z', weightKg: 5.0 })
    ]
    expect(checkWeightLossAlert(logs, today).isAlert).toBe(false)
  })

  it('counts exactly 7 calendar days including today', () => {
    const withEighthDay = [
      makeLog({ date: '2026-01-13', recordedAt: '2026-01-13T08:00:00.000Z', weightKg: 6.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(withEighthDay, today).isAlert).toBe(false)

    const withSeventhDay = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: 6.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(withSeventhDay, today).isAlert).toBe(true)
  })

  it('ignores logs without a recorded weight', () => {
    const logs = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: undefined }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(logs, today).isAlert).toBe(false)
  })

  it('recomputes the window from the date the caller passes, e.g. after midnight', () => {
    const logs = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: 6.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(logs, '2026-01-20').isAlert).toBe(true)
    // 跨過午夜到 1/21，1/14 那筆掉出 7 天窗口
    expect(checkWeightLossAlert(logs, '2026-01-21').isAlert).toBe(false)
  })

  it('does not alert before the local date is known (SSR)', () => {
    const logs = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: 6.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(logs, '')).toEqual({ isAlert: false, dropRate: 0 })
  })
})

describe('compareBloodTestsChronologically', () => {
  function makeBloodTest(overrides: Partial<BloodTest>): BloodTest {
    return {
      petId: '00000000-0000-4000-8000-000000000002',
      testDate: '2026-01-15',
      bun: 30,
      creatinine: 2.0,
      phosphorus: 4.0,
      ...overrides
    }
  }

  it('uses the later-created test as the newest when two share a date', () => {
    const morning = makeBloodTest({
      id: 'a',
      createdAt: '2026-01-15T01:00:00.000Z',
      creatinine: 2.0
    })
    const evening = makeBloodTest({
      id: 'b',
      createdAt: '2026-01-15T10:00:00.000Z',
      creatinine: 3.2
    })
    for (const input of [
      [morning, evening],
      [evening, morning]
    ]) {
      const sorted = [...input].sort(compareBloodTestsChronologically)
      expect(sorted.map((test) => test.id)).toEqual(['a', 'b'])
    }
  })

  it('orders by test date before creation time', () => {
    const older = makeBloodTest({
      id: 'old',
      testDate: '2026-01-10',
      createdAt: '2026-01-20T00:00:00.000Z'
    })
    const newer = makeBloodTest({
      id: 'new',
      testDate: '2026-01-15',
      createdAt: '2026-01-15T00:00:00.000Z'
    })
    expect([newer, older].sort(compareBloodTestsChronologically).map((test) => test.id)).toEqual([
      'old',
      'new'
    ])
  })
})

describe('evaluatePhosphorusStatus', () => {
  it('flags STAGE_1/STAGE_2 phosphorus above 4.5 mg/dL as high', () => {
    expect(evaluatePhosphorusStatus('STAGE_1', 4.6).isHigh).toBe(true)
    expect(evaluatePhosphorusStatus('STAGE_2', 4.6).isHigh).toBe(true)
  })

  it('treats the threshold value itself as within target', () => {
    const result = evaluatePhosphorusStatus('STAGE_1', 4.5)
    expect(result.isHigh).toBe(false)
    // 等於上限時文字不能寫「< 4.5」，否則跟數值自相矛盾
    expect(result.message).toContain('未超過')
    expect(result.message).not.toContain('<')
  })

  it('uses the higher STAGE_3/STAGE_4 thresholds', () => {
    expect(evaluatePhosphorusStatus('STAGE_3', 4.8).isHigh).toBe(false)
    expect(evaluatePhosphorusStatus('STAGE_3', 5.1).isHigh).toBe(true)
    expect(evaluatePhosphorusStatus('STAGE_4', 5.5).isHigh).toBe(false)
    expect(evaluatePhosphorusStatus('STAGE_4', 6.1).isHigh).toBe(true)
  })
})

describe('evaluateStageHint', () => {
  it('does not suggest a review when values match the current stage', () => {
    const result = evaluateStageHint('STAGE_2', { creatinine: 2.0, sdma: 20 })
    expect(result.shouldSuggestReview).toBe(false)
    expect(result.markers).toEqual([])
  })

  it('suggests a review when creatinine falls in a higher stage', () => {
    const result = evaluateStageHint('STAGE_2', { creatinine: 3.2 })
    expect(result).toEqual({
      shouldSuggestReview: true,
      suggestedStage: 'STAGE_3',
      markers: ['creatinine']
    })
  })

  it('uses the higher stage when creatinine and SDMA disagree', () => {
    const result = evaluateStageHint('STAGE_2', { creatinine: 2.0, sdma: 30 })
    expect(result).toEqual({
      shouldSuggestReview: true,
      suggestedStage: 'STAGE_3',
      markers: ['sdma']
    })
  })

  it('reports both markers when they agree on the higher stage', () => {
    const result = evaluateStageHint('STAGE_2', { creatinine: 3.5, sdma: 30 })
    expect(result.markers).toEqual(['creatinine', 'sdma'])
  })

  it('never suggests lowering the stage', () => {
    expect(evaluateStageHint('STAGE_3', { creatinine: 1.2, sdma: 10 }).shouldSuggestReview).toBe(
      false
    )
  })

  it.each([
    [1.5, 'STAGE_1'],
    [1.6, 'STAGE_2'],
    [2.8, 'STAGE_2'],
    [2.85, 'STAGE_2'],
    [2.9, 'STAGE_3'],
    [5.0, 'STAGE_3'],
    [5.1, 'STAGE_4']
  ] as const)('maps creatinine %s mg/dL to %s', (creatinine, stage) => {
    expect(evaluateStageHint('STAGE_1', { creatinine }).suggestedStage).toBe(stage)
  })

  it.each([
    [17, 'STAGE_1'],
    [18, 'STAGE_2'],
    [25, 'STAGE_2'],
    [25.5, 'STAGE_2'],
    [26, 'STAGE_3'],
    [38, 'STAGE_3'],
    [39, 'STAGE_4']
  ] as const)('maps SDMA %s µg/dL to %s', (sdma, stage) => {
    expect(evaluateStageHint('STAGE_1', { creatinine: 1.0, sdma }).suggestedStage).toBe(stage)
  })
})

describe('checkFluidOverPrescribed', () => {
  it('flags a dose above the prescribed amount', () => {
    const result = checkFluidOverPrescribed(120, 100)
    expect(result.isOverPrescribed).toBe(true)
    expect(result.message).not.toBeNull()
  })

  it('does not flag a dose at or below the prescribed amount', () => {
    expect(checkFluidOverPrescribed(100, 100).isOverPrescribed).toBe(false)
    expect(checkFluidOverPrescribed(100, 100).message).toBeNull()
    expect(checkFluidOverPrescribed(80, 100).isOverPrescribed).toBe(false)
  })
})

describe('calculateDailyProgress', () => {
  const cat = { subQFluidPrescribedMl: 100, subQFluidFrequencyPerDay: 2, dailyFluidTargetMl: 200 }

  it('returns zero progress with no logs', () => {
    expect(calculateDailyProgress([], cat)).toEqual({
      fluidProgressPercent: 0,
      waterProgressPercent: 0
    })
  })

  it('sums fluid and water across multiple logs against the daily target', () => {
    const logs = [
      makeLog({ subQFluidMl: 100, waterIntakeMl: 50 }),
      makeLog({ subQFluidMl: 50, waterIntakeMl: 50 })
    ]
    // fluid target = 100 * 2 = 200ml; total fluid = 150ml -> 75%
    // water target = 200ml; total water = 100ml -> 50%
    expect(calculateDailyProgress(logs, cat)).toEqual({
      fluidProgressPercent: 75,
      waterProgressPercent: 50
    })
  })

  it('caps progress at 100% even if the recorded amount exceeds the target', () => {
    const logs = [makeLog({ subQFluidMl: 500, waterIntakeMl: 500 })]
    const result = calculateDailyProgress(logs, cat)
    expect(result.fluidProgressPercent).toBe(100)
    expect(result.waterProgressPercent).toBe(100)
  })

  it('does not divide by zero when no fluid is prescribed', () => {
    const result = calculateDailyProgress([makeLog({ subQFluidMl: 50 })], {
      ...cat,
      subQFluidPrescribedMl: 0
    })
    expect(result.fluidProgressPercent).toBe(0)
  })
})

describe('groupDailyCareLogsByDate', () => {
  it('sums fluid and water per day and keeps the latest weight for that day', () => {
    const logs = [
      makeLog({
        date: '2026-01-15',
        recordedAt: '2026-01-15T08:00:00.000Z',
        subQFluidMl: 50,
        waterIntakeMl: 30,
        weightKg: 4.5
      }),
      makeLog({
        date: '2026-01-15',
        recordedAt: '2026-01-15T20:00:00.000Z',
        subQFluidMl: 50,
        waterIntakeMl: 30,
        weightKg: 4.6
      })
    ]
    const [point] = groupDailyCareLogsByDate(logs)
    expect(point.totalFluidMl).toBe(100)
    expect(point.totalWaterMl).toBe(60)
    expect(point.weightKg).toBe(4.6)
  })

  it('does not let a later log without a weight erase an earlier weight for the same day', () => {
    const logs = [
      makeLog({
        date: '2026-01-15',
        recordedAt: '2026-01-15T08:00:00.000Z',
        weightKg: 4.5
      }),
      makeLog({
        date: '2026-01-15',
        recordedAt: '2026-01-15T20:00:00.000Z',
        weightKg: undefined
      })
    ]
    const [point] = groupDailyCareLogsByDate(logs)
    expect(point.weightKg).toBe(4.5)
  })

  it('returns points sorted ascending by date regardless of input order', () => {
    const logs = [
      makeLog({ date: '2026-01-17', recordedAt: '2026-01-17T08:00:00.000Z' }),
      makeLog({ date: '2026-01-15', recordedAt: '2026-01-15T08:00:00.000Z' }),
      makeLog({ date: '2026-01-16', recordedAt: '2026-01-16T08:00:00.000Z' })
    ]
    expect(groupDailyCareLogsByDate(logs).map((point) => point.date)).toEqual([
      '2026-01-15',
      '2026-01-16',
      '2026-01-17'
    ])
  })
})

function makePoint(date: string, totalFluidMl: number, weightKg?: number): DailyCareSummaryPoint {
  return { date, weightKg, totalFluidMl, totalWaterMl: 0 }
}

describe('addSevenDayFluidAverage', () => {
  it('averages the recorded days within the 7 calendar days ending on each date', () => {
    const result = addSevenDayFluidAverage([
      makePoint('2026-10-01', 100),
      makePoint('2026-10-02', 120),
      makePoint('2026-10-07', 80),
      // 10/08 的窗口是 10/02–10/08，10/01 已經掉出去
      makePoint('2026-10-08', 100)
    ])
    expect(result.map((point) => point.fluidAvgMl)).toEqual([100, 110, 100, 100])
  })

  it('does not count days without records as 0', () => {
    // 7 天內只有兩天有紀錄：平均是 (100 + 120) / 2，不是 / 7
    const result = addSevenDayFluidAverage([
      makePoint('2026-10-01', 100),
      makePoint('2026-10-05', 120)
    ])
    expect(result[1].fluidAvgMl).toBe(110)
  })

  it('keeps the daily weight as-is', () => {
    const result = addSevenDayFluidAverage([makePoint('2026-10-01', 100, 4.2)])
    expect(result[0]).toEqual({ date: '2026-10-01', weightKg: 4.2, fluidAvgMl: 100 })
  })
})

describe('groupDailyPointsByWeek', () => {
  it('groups by Monday-start weeks with the last weight and the average daily fluid', () => {
    const result = groupDailyPointsByWeek([
      // 2026-10-05 是週一，10-11 是週日，屬於同一週
      makePoint('2026-10-05', 100, 4.3),
      makePoint('2026-10-08', 120, 4.2),
      makePoint('2026-10-11', 80),
      makePoint('2026-10-12', 100, 4.1)
    ])
    expect(result).toEqual([
      { date: '2026-10-05', weightKg: 4.2, fluidAvgMl: 100 },
      { date: '2026-10-12', weightKg: 4.1, fluidAvgMl: 100 }
    ])
  })

  it('skips weeks without any records', () => {
    const result = groupDailyPointsByWeek([
      makePoint('2026-10-05', 100),
      makePoint('2026-10-26', 100)
    ])
    expect(result.map((point) => point.date)).toEqual(['2026-10-05', '2026-10-26'])
  })
})
