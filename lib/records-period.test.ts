import { describe, expect, it } from 'vitest'

import { getPeriodStartDate, isOnOrAfter, parseRecordsPeriod } from './records-period'

describe('parseRecordsPeriod', () => {
  it.each(['3m', '6m', '1y', 'all'])('accepts %s', (value) => {
    expect(parseRecordsPeriod(value)).toBe(value)
  })

  it.each([null, undefined, '', '2y', 'ALL'])(
    'falls back to the 6-month default for %j',
    (value) => {
      expect(parseRecordsPeriod(value)).toBe('6m')
    }
  )
})

describe('getPeriodStartDate', () => {
  it('goes back whole calendar months from today', () => {
    expect(getPeriodStartDate('3m', '2026-10-29')).toBe('2026-07-29')
    expect(getPeriodStartDate('6m', '2026-10-29')).toBe('2026-04-29')
    expect(getPeriodStartDate('1y', '2026-10-29')).toBe('2025-10-29')
  })

  it('crosses the year boundary', () => {
    expect(getPeriodStartDate('6m', '2026-02-15')).toBe('2025-08-15')
  })

  it('clamps to the last day of a shorter month instead of overflowing', () => {
    expect(getPeriodStartDate('6m', '2026-08-31')).toBe('2026-02-28')
    expect(getPeriodStartDate('1y', '2028-02-29')).toBe('2027-02-28')
  })

  it('has no lower bound for all', () => {
    expect(getPeriodStartDate('all', '2026-10-29')).toBeNull()
  })
})

describe('isOnOrAfter', () => {
  it('includes the start date itself', () => {
    expect(isOnOrAfter('2026-07-29', '2026-07-29')).toBe(true)
    expect(isOnOrAfter('2026-07-28', '2026-07-29')).toBe(false)
    expect(isOnOrAfter('2020-01-01', null)).toBe(true)
  })
})
