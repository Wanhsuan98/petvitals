import { describe, expect, it } from 'vitest'

import { BloodTestSchema, CatProfileSchema, DailyCareLogSchema } from './schemas'

const VALID_UUID = '00000000-0000-4000-8000-000000000001'

describe('CatProfileSchema', () => {
  const validInput = {
    id: VALID_UUID,
    ownerId: VALID_UUID,
    name: '小橘',
    birthYear: 2019,
    targetWeightKg: 4.2
  }

  it('accepts a minimal valid profile and fills in defaults', () => {
    const result = CatProfileSchema.parse(validInput)
    expect(result.irisStage).toBe('STAGE_2')
    expect(result.dailyFluidTargetMl).toBe(200)
    expect(result.subQFluidPrescribedMl).toBe(100)
    expect(result.subQFluidFrequencyPerDay).toBe(1)
  })

  it('rejects an empty name', () => {
    expect(CatProfileSchema.safeParse({ ...validInput, name: '' }).success).toBe(false)
  })

  it('rejects a non-positive target weight', () => {
    expect(CatProfileSchema.safeParse({ ...validInput, targetWeightKg: 0 }).success).toBe(false)
  })

  it('rejects a birth year before 2000', () => {
    expect(CatProfileSchema.safeParse({ ...validInput, birthYear: 1999 }).success).toBe(false)
  })

  it('rejects an iris stage outside the defined enum', () => {
    expect(CatProfileSchema.safeParse({ ...validInput, irisStage: 'STAGE_5' }).success).toBe(false)
  })

  it('rejects a daily fluid target below the safety floor', () => {
    expect(CatProfileSchema.safeParse({ ...validInput, dailyFluidTargetMl: 10 }).success).toBe(
      false
    )
  })
})

describe('DailyCareLogSchema', () => {
  const validInput = {
    petId: VALID_UUID,
    recordedAt: '2026-01-15T08:00:00Z',
    date: '2026-01-15'
  }

  it('accepts a minimal valid log and fills in defaults', () => {
    const result = DailyCareLogSchema.parse(validInput)
    expect(result.subQFluidMl).toBe(0)
    expect(result.waterIntakeMl).toBe(0)
    expect(result.appetiteLevel).toBe('NORMAL')
    expect(result.vomitCount).toBe(0)
  })

  it('rejects a date that does not exist on the calendar (Feb 30)', () => {
    expect(DailyCareLogSchema.safeParse({ ...validInput, date: '2026-02-30' }).success).toBe(false)
  })

  it('rejects a date in the wrong format', () => {
    expect(DailyCareLogSchema.safeParse({ ...validInput, date: '2026/01/15' }).success).toBe(false)
  })

  it('accepts Feb 29 on a leap year', () => {
    expect(DailyCareLogSchema.safeParse({ ...validInput, date: '2028-02-29' }).success).toBe(true)
  })

  it('rejects Feb 29 on a non-leap year', () => {
    expect(DailyCareLogSchema.safeParse({ ...validInput, date: '2026-02-29' }).success).toBe(false)
  })

  it('rejects a weight outside the plausible range for a cat', () => {
    expect(DailyCareLogSchema.safeParse({ ...validInput, weightKg: 0.5 }).success).toBe(false)
    expect(DailyCareLogSchema.safeParse({ ...validInput, weightKg: 20 }).success).toBe(false)
  })

  it('rejects a sub-Q fluid volume above the safety ceiling', () => {
    expect(DailyCareLogSchema.safeParse({ ...validInput, subQFluidMl: 601 }).success).toBe(false)
  })

  it('rejects notes longer than 100 characters', () => {
    expect(DailyCareLogSchema.safeParse({ ...validInput, notes: 'a'.repeat(101) }).success).toBe(
      false
    )
  })
})

describe('BloodTestSchema', () => {
  const validInput = {
    petId: VALID_UUID,
    testDate: '2026-01-15',
    bun: 30,
    creatinine: 2.1,
    phosphorus: 4.0
  }

  it('accepts a minimal valid blood test', () => {
    expect(BloodTestSchema.safeParse(validInput).success).toBe(true)
  })

  it('rejects a test date that does not exist on the calendar', () => {
    expect(BloodTestSchema.safeParse({ ...validInput, testDate: '2026-04-31' }).success).toBe(false)
  })

  it('rejects values outside the plausible clinical range', () => {
    expect(BloodTestSchema.safeParse({ ...validInput, bun: 301 }).success).toBe(false)
    expect(BloodTestSchema.safeParse({ ...validInput, creatinine: 31 }).success).toBe(false)
    expect(BloodTestSchema.safeParse({ ...validInput, phosphorus: -1 }).success).toBe(false)
  })

  it('treats sdma and hct as optional', () => {
    const result = BloodTestSchema.parse(validInput)
    expect(result.sdma).toBeUndefined()
    expect(result.hct).toBeUndefined()
  })
})
