import type { SupabaseClient } from '@supabase/supabase-js'

import { CatProfileSchema, type CatProfile } from '@/lib/schemas'

type CatProfileRow = {
  id: string
  owner_id: string
  name: string
  birth_year: number
  target_weight_kg: number
  iris_stage: CatProfile['irisStage']
  daily_fluid_target_ml: number
  sub_q_fluid_prescribed_ml: number
  sub_q_fluid_frequency_per_day: number
  created_at: string
}

export type CatProfileInput = Omit<CatProfile, 'id' | 'ownerId' | 'createdAt'>

function toCatProfile(row: CatProfileRow): CatProfile {
  return CatProfileSchema.parse({
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    birthYear: row.birth_year,
    targetWeightKg: row.target_weight_kg,
    irisStage: row.iris_stage,
    dailyFluidTargetMl: row.daily_fluid_target_ml,
    subQFluidPrescribedMl: row.sub_q_fluid_prescribed_ml,
    subQFluidFrequencyPerDay: row.sub_q_fluid_frequency_per_day,
    // Postgres timestamptz 回傳的是帶數字時區偏移的格式（如 +00:00），
    // 不是 zod z.string().datetime() 預設要求的 'Z' 結尾格式，需要先正規化
    createdAt: new Date(row.created_at).toISOString()
  })
}

// 目前一位使用者僅對應一隻貓（MVP 範圍），沒有資料時回傳 null 交由呼叫端導去設定頁建立
// userId 可能是貓的 owner，也可能只是被邀請的協作者（自己沒有貓）——
// 先找自己擁有的貓，找不到才找自己是 accepted caregiver 的貓（取最早接受邀請的一筆）。
// 一個人同時擁有自己的貓又是別人協作者的情況，目前只會回傳自己的貓，跟多隻貓咪管理是
// 同一個未來要解的問題（見 docs/00-product/roadmap.md），v1.2 先不處理。
export async function getCatProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CatProfile | null> {
  const { data: ownedRow, error: ownedError } = await supabase
    .from('cat_profiles')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle()

  if (ownedError) throw new Error(`讀取貓咪資料失敗：${ownedError.message}`)
  if (ownedRow) return toCatProfile(ownedRow as CatProfileRow)

  const { data: caregiverLink, error: caregiverLinkError } = await supabase
    .from('pet_caregivers')
    .select('pet_id')
    .eq('user_id', userId)
    .eq('status', 'ACCEPTED')
    .order('accepted_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (caregiverLinkError) throw new Error(`讀取協作貓咪資料失敗：${caregiverLinkError.message}`)
  if (!caregiverLink) return null

  const { data: caregiverCat, error: caregiverCatError } = await supabase
    .from('cat_profiles')
    .select('*')
    .eq('id', caregiverLink.pet_id)
    .maybeSingle()

  if (caregiverCatError) throw new Error(`讀取協作貓咪資料失敗：${caregiverCatError.message}`)
  return caregiverCat ? toCatProfile(caregiverCat as CatProfileRow) : null
}

// 邀請/移除協作者等 owner-only 操作共用的檢查：回傳這個使用者「自己擁有」的貓，
// 如果他其實只是別人的協作者（或根本沒有可存取的貓），一律回傳 null，
// 不需要呼叫端每次都自己重複寫 `catProfile.ownerId !== user.id` 這段判斷
export async function getOwnedCatProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<CatProfile | null> {
  const catProfile = await getCatProfile(supabase, userId)
  return catProfile && catProfile.ownerId === userId ? catProfile : null
}

// 沒有資料就新增，已有資料就更新——靠 DB 的 owner_id 唯一約束 + upsert 做原子操作，
// 避免併發送出表單（例如手機雙擊）時，先讀後寫的競態條件造成同一位使用者出現兩筆資料
export async function saveCatProfile(
  supabase: SupabaseClient,
  ownerId: string,
  input: CatProfileInput
): Promise<CatProfile> {
  const payload = {
    owner_id: ownerId,
    name: input.name,
    birth_year: input.birthYear,
    target_weight_kg: input.targetWeightKg,
    iris_stage: input.irisStage,
    daily_fluid_target_ml: input.dailyFluidTargetMl,
    sub_q_fluid_prescribed_ml: input.subQFluidPrescribedMl,
    sub_q_fluid_frequency_per_day: input.subQFluidFrequencyPerDay
  }

  const { data, error } = await supabase
    .from('cat_profiles')
    .upsert(payload, { onConflict: 'owner_id' })
    .select()
    .single()

  if (error) throw new Error(`儲存貓咪資料失敗：${error.message}`)
  return toCatProfile(data as CatProfileRow)
}
