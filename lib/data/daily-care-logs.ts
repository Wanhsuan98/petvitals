import type { SupabaseClient } from '@supabase/supabase-js'

import { DailyCareLogSchema, type DailyCareLog } from '@/lib/schemas'

type DailyCareLogRow = {
  id: string
  pet_id: string
  recorded_at: string
  date: string
  weight_kg: number | null
  sub_q_fluid_ml: number
  water_intake_ml: number
  appetite_level: string
  vomit_count: number
  notes: string | null
  created_at: string
}

export type DailyCareLogInput = Omit<DailyCareLog, 'id' | 'createdAt'>

function toDailyCareLog(row: DailyCareLogRow): DailyCareLog {
  return DailyCareLogSchema.parse({
    id: row.id,
    petId: row.pet_id,
    // Postgres timestamptz 回傳的是帶數字時區偏移的格式（如 +00:00），
    // 不是 zod z.string().datetime() 預設要求的 'Z' 結尾格式，需要先正規化
    recordedAt: new Date(row.recorded_at).toISOString(),
    date: row.date,
    weightKg: row.weight_kg ?? undefined,
    subQFluidMl: row.sub_q_fluid_ml,
    waterIntakeMl: row.water_intake_ml,
    appetiteLevel: row.appetite_level,
    vomitCount: row.vomit_count,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at).toISOString()
  })
}

// 依 recordedAt 由新到舊排序，呼叫端可依需求自行再篩選日期區間
export async function listDailyCareLogs(
  supabase: SupabaseClient,
  petId: string
): Promise<DailyCareLog[]> {
  const { data, error } = await supabase
    .from('daily_care_logs')
    .select('*')
    .eq('pet_id', petId)
    .order('recorded_at', { ascending: false })

  if (error) throw new Error(`讀取照護紀錄失敗：${error.message}`)
  return (data as DailyCareLogRow[]).map(toDailyCareLog)
}

export async function createDailyCareLog(
  supabase: SupabaseClient,
  input: DailyCareLogInput
): Promise<DailyCareLog> {
  const { data, error } = await supabase
    .from('daily_care_logs')
    .insert({
      pet_id: input.petId,
      recorded_at: input.recordedAt,
      date: input.date,
      weight_kg: input.weightKg ?? null,
      sub_q_fluid_ml: input.subQFluidMl,
      water_intake_ml: input.waterIntakeMl,
      appetite_level: input.appetiteLevel,
      vomit_count: input.vomitCount,
      notes: input.notes ?? null
    })
    .select()
    .single()

  if (error) throw new Error(`新增照護紀錄失敗：${error.message}`)
  return toDailyCareLog(data as DailyCareLogRow)
}
