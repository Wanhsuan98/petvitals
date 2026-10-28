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
    // 同一天有多筆時以後建立的為準，跟 compareBloodTestsChronologically 的排序一致
    .order('created_at', { ascending: false })

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

export class BloodTestNotFoundError extends Error {
  constructor() {
    super('找不到這筆血檢紀錄，可能已被刪除或沒有權限，請重新整理頁面')
    this.name = 'BloodTestNotFoundError'
  }
}

export async function getBloodTest(
  supabase: SupabaseClient,
  id: string
): Promise<BloodTest | null> {
  const { data, error } = await supabase.from('blood_tests').select('*').eq('id', id).maybeSingle()

  if (error) throw new Error(`讀取血檢紀錄失敗：${error.message}`)
  return data ? toBloodTest(data as BloodTestRow) : null
}

// 不更新 pet_id：紀錄不能被搬到另一隻貓。RLS 擋下時 Supabase 不會回傳 error 而是 0 筆，
// 必須用 .select() 確認真的有更新到，否則呼叫端會誤以為儲存成功
export async function updateBloodTest(
  supabase: SupabaseClient,
  id: string,
  input: Omit<BloodTestInput, 'petId'>
): Promise<BloodTest> {
  const { data, error } = await supabase
    .from('blood_tests')
    .update({
      test_date: input.testDate,
      hospital_name: input.hospitalName ?? null,
      bun: input.bun,
      creatinine: input.creatinine,
      sdma: input.sdma ?? null,
      phosphorus: input.phosphorus,
      hct: input.hct ?? null,
      notes: input.notes ?? null
    })
    .eq('id', id)
    .select()

  if (error) throw new Error(`更新血檢紀錄失敗：${error.message}`)
  if (!data || data.length === 0) throw new BloodTestNotFoundError()
  return toBloodTest(data[0] as BloodTestRow)
}

export async function deleteBloodTest(supabase: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await supabase.from('blood_tests').delete().eq('id', id).select('id')

  if (error) throw new Error(`刪除血檢紀錄失敗：${error.message}`)
  if (!data || data.length === 0) throw new BloodTestNotFoundError()
}
