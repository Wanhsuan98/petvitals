'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { BloodTestNotFoundError, deleteBloodTest, updateBloodTest } from '@/lib/data/blood-tests'
import { BloodTestSchema } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

// petId 與紀錄所屬的貓不讓 client 決定：RLS 只允許飼主或協作者改自己貓的紀錄，
// 這裡不需要（也不能）接受 client 傳來的 petId
const bloodTestUpdateSchema = BloodTestSchema.omit({ id: true, petId: true, createdAt: true })
const recordIdSchema = z.string().uuid()

export type BloodTestUpdateInput = z.output<typeof bloodTestUpdateSchema>

export type UpdateBloodTestState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export type DeleteBloodTestState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

// 資料庫的原始錯誤訊息（資料表、欄位名稱）對使用者沒有意義，也不該回傳到瀏覽器；
// 只有「找不到紀錄」這類使用者能理解、也能採取行動的錯誤才原樣顯示
function toErrorState(
  error: unknown,
  logLabel: string,
  fallbackMessage: string
): { status: 'error'; message: string } {
  console.error(logLabel, error)
  return {
    status: 'error',
    message: error instanceof BloodTestNotFoundError ? error.message : fallbackMessage
  }
}

export async function updateBloodTestAction(
  _prevState: UpdateBloodTestState,
  input: { id: string; values: BloodTestUpdateInput }
): Promise<UpdateBloodTestState> {
  const id = recordIdSchema.safeParse(input.id)
  const parsed = bloodTestUpdateSchema.safeParse(input.values)
  if (!id.success || !parsed.success) {
    return { status: 'error', message: '資料格式有誤，請確認欄位內容後再試一次' }
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  try {
    await updateBloodTest(supabase, id.data, parsed.data)
  } catch (error) {
    return toErrorState(error, '更新血檢紀錄失敗', '儲存失敗，請稍後再試')
  }

  revalidatePath('/records')
  return { status: 'success' }
}

export async function deleteBloodTestAction(
  _prevState: DeleteBloodTestState,
  id: string
): Promise<DeleteBloodTestState> {
  const parsedId = recordIdSchema.safeParse(id)
  if (!parsedId.success) return { status: 'error', message: '找不到這筆血檢紀錄' }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  try {
    await deleteBloodTest(supabase, parsedId.data)
  } catch (error) {
    return toErrorState(error, '刪除血檢紀錄失敗', '刪除失敗，請稍後再試')
  }

  revalidatePath('/records')
  return { status: 'success' }
}
