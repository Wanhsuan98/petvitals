'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { saveCatProfile } from '@/lib/data/cat-profile'
import { acceptCaregiverInvitation } from '@/lib/data/pet-caregivers'
import { CatProfileSchema } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('signOut failed:', error.message)
  }
  redirect('/login')
}

const catProfileInputSchema = CatProfileSchema.omit({ id: true, ownerId: true, createdAt: true })
export type CatProfileFormInput = z.input<typeof catProfileInputSchema>
export type CatProfileFormOutput = z.output<typeof catProfileInputSchema>

export type SaveCatProfileState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function saveCatProfileAction(
  _prevState: SaveCatProfileState,
  input: CatProfileFormOutput
): Promise<SaveCatProfileState> {
  const parsed = catProfileInputSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', message: '資料格式有誤，請確認欄位內容後再試一次' }
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: '登入狀態已過期，請重新登入' }
  }

  try {
    await saveCatProfile(supabase, user.id, parsed.data)
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '儲存失敗，請稍後再試'
    }
  }

  revalidatePath('/settings')
  revalidatePath('/')
  revalidatePath('/log')
  revalidatePath('/records')

  return { status: 'success', message: '已儲存貓咪資料' }
}

export type AcceptInvitationState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function acceptCaregiverInvitationAction(
  _prevState: AcceptInvitationState,
  invitationId: string
): Promise<AcceptInvitationState> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  try {
    // RLS 只允許使用者把「自己」那筆邀請從 PENDING 改成 ACCEPTED，
    // 不需要在這裡額外檢查 invitationId 是不是屬於這個使用者
    await acceptCaregiverInvitation(supabase, invitationId)
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '接受邀請失敗，請稍後再試'
    }
  }

  // 接受邀請後，這個使用者現在能看到的貓可能整個改變，首頁/打卡/血檢頁都要重新驗證
  revalidatePath('/settings')
  revalidatePath('/')
  revalidatePath('/log')
  revalidatePath('/records')

  return { status: 'success', message: '已接受邀請，現在可以開始協助照顧了' }
}
