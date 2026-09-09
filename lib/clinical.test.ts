import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateDailyProgress,
  checkFluidOverPrescribed,
  checkWeightLossAlert,
  evaluatePhosphorusStatus,
  groupDailyCareLogsByDate
} from './clinical'
import type { DailyCareLog } from './schemas'

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
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not alert with fewer than two weighted logs in the window', () => {
    const logs = [
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.5 })
    ]
    expect(checkWeightLossAlert(logs).isAlert).toBe(false)
  })

  it('alerts when weight drops 3% or more from the window high', () => {
    const logs = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: 5.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.8 })
    ]
    const result = checkWeightLossAlert(logs)
    expect(result.isAlert).toBe(true)
    expect(result.dropRate).toBe(4.0)
  })

  it('does not alert when the drop is under 3%', () => {
    const logs = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: 5.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(logs).isAlert).toBe(false)
  })

  it('ignores logs outside the window', () => {
    const logs = [
      // outside the default 7-day window relative to 2026-01-20
      makeLog({ date: '2026-01-05', recordedAt: '2026-01-05T08:00:00.000Z', weightKg: 10.0 }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(logs).isAlert).toBe(false)
  })

  it('ignores logs without a recorded weight', () => {
    const logs = [
      makeLog({ date: '2026-01-14', recordedAt: '2026-01-14T08:00:00.000Z', weightKg: undefined }),
      makeLog({ date: '2026-01-19', recordedAt: '2026-01-19T08:00:00.000Z', weightKg: 4.9 })
    ]
    expect(checkWeightLossAlert(logs).isAlert).toBe(false)
  })
})

describe('evaluatePhosphorusStatus', () => {
  it('flags STAGE_1/STAGE_2 phosphorus above 4.5 mg/dL as high', () => {
    expect(evaluatePhosphorusStatus('STAGE_1', 4.6).isHigh).toBe(true)
    expect(evaluatePhosphorusStatus('STAGE_2', 4.6).isHigh).toBe(true)
  })

  it('treats the threshold value itself as within target', () => {
    expect(evaluatePhosphorusStatus('STAGE_1', 4.5).isHigh).toBe(false)
  })

  it('uses the higher STAGE_3/STAGE_4 thresholds', () => {
    expect(evaluatePhosphorusStatus('STAGE_3', 4.8).isHigh).toBe(false)
    expect(evaluatePhosphorusStatus('STAGE_3', 5.1).isHigh).toBe(true)
    expect(evaluatePhosphorusStatus('STAGE_4', 5.5).isHigh).toBe(false)
    expect(evaluatePhosphorusStatus('STAGE_4', 6.1).isHigh).toBe(true)
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
