'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCatProfile, saveCatProfile } from '@/lib/data/cat-profile'
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
    // 協作者在設定頁看不到建立表單，但 action 本身也要擋：單貓模式下（ADR-005）
    // 建了自己的貓，getCatProfile 會優先回傳它，原本協作的那隻就整個看不到了
    const currentCatProfile = await getCatProfile(supabase, user.id)
    if (currentCatProfile && currentCatProfile.ownerId !== user.id) {
      return {
        status: 'error',
        message: '你目前是其他貓咪的協作者，一個帳號只能照顧一隻貓，暫時無法建立自己的貓咪資料'
      }
    }

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
