import type { SupabaseClient } from '@supabase/supabase-js'

import type { PetCaregiver } from '@/lib/schemas'

type PetCaregiverRow = {
  id: string
  pet_id: string
  user_id: string
  status: PetCaregiver['status']
  invited_email: string
  invited_at: string
  accepted_at: string | null
}

function toPetCaregiver(row: PetCaregiverRow): PetCaregiver {
  return {
    id: row.id,
    petId: row.pet_id,
    userId: row.user_id,
    status: row.status,
    invitedEmail: row.invited_email,
    invitedAt: new Date(row.invited_at).toISOString(),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at).toISOString() : undefined
  }
}

// 用 owner 自己的 session 查（RLS 只讓 owner 看到自己貓的完整名單），供 settings/caregivers 頁面顯示
export async function listCaregiversForPet(
  supabase: SupabaseClient,
  petId: string
): Promise<PetCaregiver[]> {
  const { data, error } = await supabase
    .from('pet_caregivers')
    .select('*')
    .eq('pet_id', petId)
    .order('invited_at', { ascending: true })

  if (error) throw new Error(`讀取協作者名單失敗：${error.message}`)
  return (data as PetCaregiverRow[]).map(toPetCaregiver)
}

export type PendingInvitation = PetCaregiver & { catName: string }

// 用被邀請者自己的 session 查自己收到的邀請（RLS 讓被邀請者看到自己的邀請紀錄，
// 也讓他在接受前就能讀到被邀請那隻貓的基本資料，才能在畫面上顯示貓的名字）
export async function listPendingInvitationsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<PendingInvitation[]> {
  const { data, error } = await supabase
    .from('pet_caregivers')
    .select('*, cat_profiles(name)')
    .eq('user_id', userId)
    .eq('status', 'PENDING')

  if (error) throw new Error(`讀取邀請通知失敗：${error.message}`)

  return (data as (PetCaregiverRow & { cat_profiles: { name: string } | null })[]).map((row) => ({
    ...toPetCaregiver(row),
    catName: row.cat_profiles?.name ?? '（貓咪資料已不存在）'
  }))
}

// 用來判斷人數上限：PENDING 跟 ACCEPTED 都算，避免邀請中的名額之後全部被接受時超過上限。
// owner 本人不算在這個計數裡（呼叫端要自己 +1）。
export async function countActiveCaregiverSeats(
  supabase: SupabaseClient,
  petId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('pet_caregivers')
    .select('*', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .in('status', ['PENDING', 'ACCEPTED'])

  if (error) throw new Error(`讀取協作者人數失敗：${error.message}`)
  return count ?? 0
}

// auth.users 不對外開放查詢，找不找得到帳號要透過 service-role 呼叫這個
// migration 裡定義的 security definer function（見 20260918020000_caregiver_invite_lookup.sql）
export async function findUserIdByEmail(
  serviceRoleSupabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data, error } = await serviceRoleSupabase.rpc('find_user_id_by_email', {
    lookup_email: email
  })

  if (error) throw new Error(`查詢帳號失敗：${error.message}`)
  return (data as string | null) ?? null
}

export class CaregiverAlreadyInvitedError extends Error {
  constructor() {
    super('這個帳號已經被邀請過這隻貓')
    this.name = 'CaregiverAlreadyInvitedError'
  }
}

// countActiveCaregiverSeats 只是先做一次友善的預先檢查，真正擋住併發邀請超過上限的
// 是 DB trigger（見 20260922010000_enforce_caregiver_cap_in_db.sql）——兩個併發請求
// 都可能通過應用層的預先檢查，但 trigger 用 advisory lock 把同一隻貓的寫入序列化，
// 只有一筆會真的成功，另一筆會撞到這裡攔截的例外
export class CaregiverCapReachedError extends Error {
  constructor() {
    super('這隻貓的協作者名額已滿')
    this.name = 'CaregiverCapReachedError'
  }
}

// 寫入用 owner 自己的 session（RLS 只讓 owner 寫這張表），user_id 要先在呼叫端解析好
export async function createCaregiverInvitation(
  supabase: SupabaseClient,
  input: { petId: string; userId: string; invitedEmail: string }
): Promise<PetCaregiver> {
  const { data, error } = await supabase
    .from('pet_caregivers')
    .insert({
      pet_id: input.petId,
      user_id: input.userId,
      invited_email: input.invitedEmail,
      status: 'PENDING'
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new CaregiverAlreadyInvitedError()
    if (error.message.includes('CAREGIVER_CAP_REACHED')) throw new CaregiverCapReachedError()
    throw new Error(`建立邀請失敗：${error.message}`)
  }
  return toPetCaregiver(data as PetCaregiverRow)
}

export class CaregiverInvitationNotFoundError extends Error {
  constructor() {
    super('這筆邀請可能已經被處理過或不存在，請重新整理頁面')
    this.name = 'CaregiverInvitationNotFoundError'
  }
}

// 用被邀請者自己的 session（RLS 只讓他把自己那筆從 PENDING 改成 ACCEPTED）。
// 用 .select() 確認真的有更新到資料列——如果邀請已經被 owner 移除或已經處理過，
// RLS 會讓這個 UPDATE 精準比對 0 筆，但 Supabase 不會回傳 error，
// 不檢查回傳筆數的話，呼叫端會誤以為接受成功，但使用者其實完全沒有拿到存取權。
export async function acceptCaregiverInvitation(
  supabase: SupabaseClient,
  invitationId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('pet_caregivers')
    .update({ status: 'ACCEPTED', accepted_at: new Date().toISOString() })
    .eq('id', invitationId)
    .select('id')

  if (error) throw new Error(`接受邀請失敗：${error.message}`)
  if (!data || data.length === 0) throw new CaregiverInvitationNotFoundError()
}

// 用 owner 自己的 session（RLS 只讓 owner 刪除自己貓的協作者資料列）
export async function removeCaregiver(
  supabase: SupabaseClient,
  caregiverId: string
): Promise<void> {
  const { error } = await supabase.from('pet_caregivers').delete().eq('id', caregiverId)
  if (error) throw new Error(`移除協作者失敗：${error.message}`)
}
