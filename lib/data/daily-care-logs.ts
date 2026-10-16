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

export class DailyCareLogNotFoundError extends Error {
  constructor() {
    super('找不到這筆照護紀錄，可能已被刪除或沒有權限，請重新整理頁面')
    this.name = 'DailyCareLogNotFoundError'
  }
}

export async function getDailyCareLog(
  supabase: SupabaseClient,
  id: string
): Promise<DailyCareLog | null> {
  const { data, error } = await supabase
    .from('daily_care_logs')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`讀取照護紀錄失敗：${error.message}`)
  return data ? toDailyCareLog(data as DailyCareLogRow) : null
}

// 不更新 pet_id、recorded_at、date：紀錄的打卡時間與所屬日期不能被改動，
// 否則會打亂「今日達成度」與體重趨勢的時序。RLS 擋下時 Supabase 回傳 0 筆而非 error，
// 必須用 .select() 確認真的有更新到
export async function updateDailyCareLog(
  supabase: SupabaseClient,
  id: string,
  input: Pick<
    DailyCareLogInput,
    'weightKg' | 'subQFluidMl' | 'waterIntakeMl' | 'appetiteLevel' | 'vomitCount' | 'notes'
  >
): Promise<DailyCareLog> {
  const { data, error } = await supabase
    .from('daily_care_logs')
    .update({
      weight_kg: input.weightKg ?? null,
      sub_q_fluid_ml: input.subQFluidMl,
      water_intake_ml: input.waterIntakeMl,
      appetite_level: input.appetiteLevel,
      vomit_count: input.vomitCount,
      notes: input.notes ?? null
    })
    .eq('id', id)
    .select()

  if (error) throw new Error(`更新照護紀錄失敗：${error.message}`)
  if (!data || data.length === 0) throw new DailyCareLogNotFoundError()
  return toDailyCareLog(data[0] as DailyCareLogRow)
}

export async function deleteDailyCareLog(supabase: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await supabase.from('daily_care_logs').delete().eq('id', id).select('id')

  if (error) throw new Error(`刪除照護紀錄失敗：${error.message}`)
  if (!data || data.length === 0) throw new DailyCareLogNotFoundError()
}
