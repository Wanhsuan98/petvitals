'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import {
  DailyCareLogNotFoundError,
  deleteDailyCareLog,
  updateDailyCareLog
} from '@/lib/data/daily-care-logs'
import { DailyCareLogSchema } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

// 編輯只能改內容，不能改打卡時間（recordedAt）、所屬日期（date）與所屬的貓（petId），
// 否則會打亂今日達成度與體重趨勢的時序
const dailyCareLogUpdateSchema = DailyCareLogSchema.omit({
  id: true,
  petId: true,
  recordedAt: true,
  date: true,
  createdAt: true
})
const recordIdSchema = z.string().uuid()

export type DailyCareLogUpdateInput = z.output<typeof dailyCareLogUpdateSchema>

export type UpdateDailyCareLogState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export type DeleteDailyCareLogState = {
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
    message: error instanceof DailyCareLogNotFoundError ? error.message : fallbackMessage
  }
}

function revalidateCareLogPages() {
  revalidatePath('/log')
  revalidatePath('/')
  revalidatePath('/records')
}

export async function updateDailyCareLogAction(
  _prevState: UpdateDailyCareLogState,
  input: { id: string; values: DailyCareLogUpdateInput }
): Promise<UpdateDailyCareLogState> {
  const id = recordIdSchema.safeParse(input.id)
  const parsed = dailyCareLogUpdateSchema.safeParse(input.values)
  if (!id.success || !parsed.success) {
    return { status: 'error', message: '資料格式有誤，請確認欄位內容後再試一次' }
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  try {
    await updateDailyCareLog(supabase, id.data, parsed.data)
  } catch (error) {
    return toErrorState(error, '更新照護紀錄失敗', '儲存失敗，請稍後再試')
  }

  revalidateCareLogPages()
  return { status: 'success' }
}

export async function deleteDailyCareLogAction(
  _prevState: DeleteDailyCareLogState,
  id: string
): Promise<DeleteDailyCareLogState> {
  const parsedId = recordIdSchema.safeParse(id)
  if (!parsedId.success) return { status: 'error', message: '找不到這筆照護紀錄' }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  try {
    await deleteDailyCareLog(supabase, parsedId.data)
  } catch (error) {
    return toErrorState(error, '刪除照護紀錄失敗', '刪除失敗，請稍後再試')
  }

  revalidateCareLogPages()
  return { status: 'success' }
}
