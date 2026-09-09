import type { SupabaseClient } from '@supabase/supabase-js'

import { BloodTestSchema, type BloodTest } from '@/lib/schemas'

type BloodTestRow = {
  id: string
  pet_id: string
  test_date: string
  hospital_name: string | null
  bun: number
  creatinine: number
  sdma: number | null
  phosphorus: number
  hct: number | null
  notes: string | null
  created_at: string
}

export type BloodTestInput = Omit<BloodTest, 'id' | 'createdAt'>

function toBloodTest(row: BloodTestRow): BloodTest {
  return BloodTestSchema.parse({
    id: row.id,
    petId: row.pet_id,
    testDate: row.test_date,
    hospitalName: row.hospital_name ?? undefined,
    bun: row.bun,
    creatinine: row.creatinine,
    sdma: row.sdma ?? undefined,
    phosphorus: row.phosphorus,
    hct: row.hct ?? undefined,
    notes: row.notes ?? undefined,
    // Postgres timestamptz 回傳的是帶數字時區偏移的格式（如 +00:00），
    // 不是 zod z.string().datetime() 預設要求的 'Z' 結尾格式，需要先正規化
    createdAt: new Date(row.created_at).toISOString()
  })
}

export async function listBloodTests(
  supabase: SupabaseClient,
  petId: string
): Promise<BloodTest[]> {
  const { data, error } = await supabase
    .from('blood_tests')
    .select('*')
    .eq('pet_id', petId)
    .order('test_date', { ascending: false })

  if (error) throw new Error(`讀取血檢紀錄失敗：${error.message}`)
  return (data as BloodTestRow[]).map(toBloodTest)
}

export async function createBloodTest(
  supabase: SupabaseClient,
  input: BloodTestInput
): Promise<BloodTest> {
  const { data, error } = await supabase
    .from('blood_tests')
    .insert({
      pet_id: input.petId,
      test_date: input.testDate,
      hospital_name: input.hospitalName ?? null,
      bun: input.bun,
      creatinine: input.creatinine,
      sdma: input.sdma ?? null,
      phosphorus: input.phosphorus,
      hct: input.hct ?? null,
      notes: input.notes ?? null
    })
    .select()
    .single()

  if (error) throw new Error(`新增血檢紀錄失敗：${error.message}`)
  return toBloodTest(data as BloodTestRow)
}
