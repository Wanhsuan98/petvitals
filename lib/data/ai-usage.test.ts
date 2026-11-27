import { describe, expect, it } from 'vitest'

import { countRemainingAiUsage } from './ai-usage'

describe('countRemainingAiUsage', () => {
  it('starts from the daily limit', () => {
    expect(countRemainingAiUsage([], 'BLOOD_TEST_EXTRACTION')).toBe(10)
    expect(countRemainingAiUsage([], 'CARE_SUMMARY')).toBe(5)
  })

  it('counts every status the API was billed for, including refusals and invalid output', () => {
    expect(
      countRemainingAiUsage(['SUCCEEDED', 'REFUSED', 'INVALID', 'PENDING'], 'CARE_SUMMARY')
    ).toBe(1)
  })

  it('does not count failures against the daily limit', () => {
    expect(countRemainingAiUsage(['FAILED', 'FAILED', 'SUCCEEDED'], 'CARE_SUMMARY')).toBe(4)
  })

  it('stops at the attempt cap even when only failures happened', () => {
    const failures = Array.from({ length: 30 }, () => 'FAILED' as const)
    expect(countRemainingAiUsage(failures, 'BLOOD_TEST_EXTRACTION')).toBe(0)
  })

  it('returns the tighter of the two limits', () => {
    const statuses = [...Array.from({ length: 13 }, () => 'FAILED' as const), 'SUCCEEDED' as const]
    // 每天上限剩 4，總嘗試上限剩 1
    expect(countRemainingAiUsage(statuses, 'CARE_SUMMARY')).toBe(1)
  })
})
