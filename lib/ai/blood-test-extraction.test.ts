import { describe, expect, it } from 'vitest'

import {
  BloodTestExtractionSchema,
  toBloodTestPrefill,
  type BloodTestExtraction,
  type ExtractedValue
} from './blood-test-extraction'
import {
  BLOOD_TEST_EXTRACTION_JSON_SCHEMA,
  MAX_UNION_PARAMETERS
} from './blood-test-extraction-prompt'

const EMPTY: ExtractedValue = { value: null, unit: null, sourceLabel: null }

function makeExtraction(overrides: Partial<BloodTestExtraction> = {}): BloodTestExtraction {
  return {
    isBloodTestReport: true,
    testDate: '2026-11-20',
    hospitalName: '安家貓專科動物醫院',
    bun: { value: 32.5, unit: 'mg/dL', sourceLabel: 'BUN' },
    creatinine: { value: 2.1, unit: 'mg/dL', sourceLabel: 'CREA' },
    sdma: { value: 18, unit: 'μg/dL', sourceLabel: 'SDMA' },
    phosphorus: { value: 4.6, unit: 'mg/dL', sourceLabel: 'PHOS' },
    hct: { value: 35, unit: '%', sourceLabel: 'HCT' },
    ...overrides
  }
}

const TODAY = '2026-11-27'

describe('toBloodTestPrefill', () => {
  it('fills every metric whose unit and range are valid', () => {
    const prefill = toBloodTestPrefill(makeExtraction(), TODAY)
    expect(prefill.testDate).toBe('2026-11-20')
    expect(prefill.hospitalName).toBe('安家貓專科動物醫院')
    expect(prefill.metrics.creatinine).toEqual({
      status: 'filled',
      value: 2.1,
      unit: 'mg/dL',
      sourceLabel: 'CREA'
    })
    expect(prefill.metrics.sdma.status).toBe('filled')
    expect(prefill.metrics.hct.status).toBe('filled')
  })

  it('accepts unit variants regardless of case, spacing and micro sign', () => {
    const prefill = toBloodTestPrefill(
      makeExtraction({
        bun: { value: 30, unit: 'MG / DL', sourceLabel: 'BUN' },
        sdma: { value: 15, unit: 'µg/dL', sourceLabel: 'SDMA' }
      }),
      TODAY
    )
    expect(prefill.metrics.bun.status).toBe('filled')
    expect(prefill.metrics.sdma.status).toBe('filled')
  })

  it('never converts SI units and leaves the field blank instead', () => {
    const prefill = toBloodTestPrefill(
      makeExtraction({ creatinine: { value: 185, unit: 'umol/L', sourceLabel: 'CREA' } }),
      TODAY
    )
    expect(prefill.metrics.creatinine).toEqual({
      status: 'unit_mismatch',
      unit: 'umol/L',
      expectedUnit: 'mg/dL'
    })
  })

  it('does not assume a unit when the report shows none', () => {
    const prefill = toBloodTestPrefill(
      makeExtraction({ phosphorus: { value: 4.6, unit: null, sourceLabel: 'P' } }),
      TODAY
    )
    expect(prefill.metrics.phosphorus).toEqual({ status: 'no_unit' })
  })

  it('treats HCT reported as a fraction (L/L) as a unit mismatch', () => {
    const prefill = toBloodTestPrefill(
      makeExtraction({ hct: { value: 0.35, unit: 'L/L', sourceLabel: 'HCT' } }),
      TODAY
    )
    expect(prefill.metrics.hct.status).toBe('unit_mismatch')
  })

  it('rejects values outside the form validation range', () => {
    const prefill = toBloodTestPrefill(
      makeExtraction({
        creatinine: { value: 210, unit: 'mg/dL', sourceLabel: 'CREA' },
        bun: { value: 0, unit: 'mg/dL', sourceLabel: 'BUN' }
      }),
      TODAY
    )
    expect(prefill.metrics.creatinine).toEqual({ status: 'out_of_range', value: 210 })
    expect(prefill.metrics.bun).toEqual({ status: 'out_of_range', value: 0 })
  })

  it('marks missing values without guessing', () => {
    const prefill = toBloodTestPrefill(makeExtraction({ sdma: EMPTY }), TODAY)
    expect(prefill.metrics.sdma).toEqual({ status: 'missing' })
  })

  it('drops invalid or future test dates', () => {
    expect(toBloodTestPrefill(makeExtraction({ testDate: '2026-02-30' }), TODAY).testDate).toBe(
      undefined
    )
    expect(toBloodTestPrefill(makeExtraction({ testDate: '2026-11-28' }), TODAY).testDate).toBe(
      undefined
    )
    expect(toBloodTestPrefill(makeExtraction({ testDate: '115/11/20' }), TODAY).testDate).toBe(
      undefined
    )
  })

  it('truncates long hospital names to the 30-character limit', () => {
    const prefill = toBloodTestPrefill(makeExtraction({ hospitalName: '院'.repeat(40) }), TODAY)
    expect(prefill.hospitalName).toHaveLength(30)
  })

  it('prefills nothing when the photo is not a blood test report', () => {
    const prefill = toBloodTestPrefill(
      makeExtraction({ isBloodTestReport: false, testDate: '2026-11-20' }),
      TODAY
    )
    expect(prefill.isBloodTestReport).toBe(false)
    expect(prefill.testDate).toBe(undefined)
    expect(Object.values(prefill.metrics).every((metric) => metric.status === 'missing')).toBe(true)
  })
})

describe('BloodTestExtractionSchema', () => {
  it('rejects output missing a metric', () => {
    const withoutHct: Partial<BloodTestExtraction> = { ...makeExtraction() }
    delete withoutHct.hct
    expect(BloodTestExtractionSchema.safeParse(withoutHct).success).toBe(false)
  })
})

// API 限制 structured output 的聯集型別參數最多 16 個，超過會直接回 400（實測踩過）
function countUnionParameters(schema: unknown): number {
  if (typeof schema !== 'object' || schema === null) return 0
  const node = schema as Record<string, unknown>
  const isUnion = Array.isArray(node.anyOf) || Array.isArray(node.type)
  return (
    (isUnion ? 1 : 0) +
    Object.values(node).reduce<number>((sum, child) => sum + countUnionParameters(child), 0)
  )
}

describe('BLOOD_TEST_EXTRACTION_JSON_SCHEMA', () => {
  it('stays within the structured output union parameter limit', () => {
    expect(countUnionParameters(BLOOD_TEST_EXTRACTION_JSON_SCHEMA)).toBeLessThanOrEqual(
      MAX_UNION_PARAMETERS
    )
  })

  it('maps blank text fields from the model back to null', () => {
    const parsed = BloodTestExtractionSchema.parse({
      isBloodTestReport: true,
      testDate: '',
      hospitalName: ' ',
      bun: { value: 30, unit: 'mg/dL', sourceLabel: 'BUN' },
      creatinine: { value: null, unit: '', sourceLabel: '' },
      sdma: { value: null, unit: '', sourceLabel: '' },
      phosphorus: { value: 4.6, unit: '', sourceLabel: 'P' },
      hct: { value: null, unit: '', sourceLabel: '' }
    })
    expect(parsed.testDate).toBe(null)
    expect(parsed.hospitalName).toBe(null)
    expect(parsed.creatinine.unit).toBe(null)
    expect(toBloodTestPrefill(parsed, TODAY).metrics.phosphorus).toEqual({ status: 'no_unit' })
  })
})
