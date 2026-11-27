import { describe, expect, it } from 'vitest'

import type { BloodTestPrefill } from '@/lib/ai/blood-test-extraction'

import { planPrefill, type CurrentFormValues } from './blood-test-prefill-plan'

const PREFILL: BloodTestPrefill = {
  isBloodTestReport: true,
  testDate: '2026-11-20',
  hospitalName: '安家貓專科動物醫院',
  metrics: {
    bun: { status: 'filled', value: 32.5, unit: 'mg/dL', sourceLabel: 'BUN' },
    creatinine: { status: 'unit_mismatch', unit: 'umol/L', expectedUnit: 'mg/dL' },
    sdma: { status: 'missing' },
    phosphorus: { status: 'missing' },
    hct: { status: 'filled', value: 35, unit: '%', sourceLabel: 'HCT' }
  }
}

function makeCurrent(overrides: Partial<CurrentFormValues> = {}): CurrentFormValues {
  return {
    testDate: '2026-11-27',
    isTestDateDirty: false,
    hospitalName: '',
    bun: Number.NaN,
    creatinine: Number.NaN,
    sdma: undefined,
    phosphorus: Number.NaN,
    hct: undefined,
    ...overrides
  }
}

describe('planPrefill', () => {
  it('fills blank fields and explains the ones it could not fill', () => {
    const plan = planPrefill(PREFILL, makeCurrent())
    expect(plan.values).toEqual({
      bun: 32.5,
      hct: 35,
      testDate: '2026-11-20',
      hospitalName: '安家貓專科動物醫院'
    })
    expect(plan.notes.bun).toContain('報告上為 BUN')
    expect(plan.notes.creatinine).toBe('報告使用 umol/L，請自行換算成 mg/dL 後填入')
    expect(plan.notes.phosphorus).toBe('未辨識到，請手動輸入')
  })

  it('stays quiet about optional metrics the report does not include', () => {
    const plan = planPrefill(PREFILL, makeCurrent())
    expect(plan.notes.sdma).toBe(undefined)
  })

  it('never overwrites fields the user already filled or a previous page filled', () => {
    const plan = planPrefill(
      PREFILL,
      makeCurrent({ bun: 40, hospitalName: '其他醫院', isTestDateDirty: true })
    )
    expect(plan.values.bun).toBe(undefined)
    expect(plan.notes.bun).toBe(undefined)
    expect(plan.values.hospitalName).toBe(undefined)
    expect(plan.values.testDate).toBe(undefined)
  })

  it('treats a manually entered 0 as filled, not blank', () => {
    const plan = planPrefill(PREFILL, makeCurrent({ bun: 0 }))
    expect(plan.values.bun).toBe(undefined)
  })
})
