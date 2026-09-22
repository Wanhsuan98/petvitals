'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getOwnedCatProfile } from '@/lib/data/cat-profile'
import {
  CaregiverAlreadyInvitedError,
  CaregiverCapReachedError,
  countActiveCaregiverSeats,
  createCaregiverInvitation,
  findUserIdByEmail,
  removeCaregiver
} from '@/lib/data/pet-caregivers'
import { MAX_CAREGIVERS_PER_PET } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export type InviteCaregiverState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

// trim + email 格式驗證都在這裡做；大小寫正規化交給 find_user_id_by_email 內部的
// lower() 比對，這裡不用再重複轉小寫
const inviteEmailSchema = z.string().trim().email('請輸入有效的 email')

export async function inviteCaregiverAction(
  _prevState: InviteCaregiverState,
  email: string
): Promise<InviteCaregiverState> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  const catProfile = await getOwnedCatProfile(supabase, user.id)
  if (!catProfile) {
    return { status: 'error', message: '只有飼主本人可以邀請協作者' }
  }

  const parsedEmail = inviteEmailSchema.safeParse(email)
  if (!parsedEmail.success) {
    return {
      status: 'error',
      message: parsedEmail.error.issues[0]?.message ?? '請輸入有效的 email'
    }
  }

  // 這裡只是先做一次友善的預先檢查，避免明顯超過上限時還浪費一次 email 查詢；
  // 真正擋住併發邀請超過上限的是 DB trigger，見下面 createCaregiverInvitation 的 catch
  const seatCount = await countActiveCaregiverSeats(supabase, catProfile.id)
  if (seatCount + 1 >= MAX_CAREGIVERS_PER_PET) {
    return {
      status: 'error',
      message: `每隻貓最多 ${MAX_CAREGIVERS_PER_PET} 位協作者（含飼主本人），目前已達上限`
    }
  }

  // auth.users 不對外開放查詢，用只給 service_role 呼叫的函式把 email 換成 user id
  const serviceRoleSupabase = createServiceRoleClient()
  const invitedUserId = await findUserIdByEmail(serviceRoleSupabase, parsedEmail.data)
  if (!invitedUserId) {
    return {
      status: 'error',
      message: '找不到這個 email 對應的帳號，請對方先註冊/登入 PetVitals 後再邀請'
    }
  }
  if (invitedUserId === user.id) {
    return { status: 'error', message: '不能邀請自己' }
  }

  try {
    await createCaregiverInvitation(supabase, {
      petId: catProfile.id,
      userId: invitedUserId,
      invitedEmail: parsedEmail.data
    })
  } catch (error) {
    if (
      error instanceof CaregiverAlreadyInvitedError ||
      error instanceof CaregiverCapReachedError
    ) {
      return { status: 'error', message: error.message }
    }
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '邀請失敗，請稍後再試'
    }
  }

  revalidatePath('/settings/caregivers')
  return { status: 'success', message: '已送出邀請，對方登入後可以在設定頁接受' }
}

export type RemoveCaregiverState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function removeCaregiverAction(
  _prevState: RemoveCaregiverState,
  caregiverId: string
): Promise<RemoveCaregiverState> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  const catProfile = await getOwnedCatProfile(supabase, user.id)
  if (!catProfile) {
    return { status: 'error', message: '只有飼主本人可以移除協作者' }
  }

  try {
    await removeCaregiver(supabase, caregiverId)
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '移除失敗，請稍後再試'
    }
  }

  revalidatePath('/settings/caregivers')
  return { status: 'success', message: '已移除協作者' }
}
