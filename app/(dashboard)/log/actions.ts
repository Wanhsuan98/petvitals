'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createDailyCareLog } from '@/lib/data/daily-care-logs'
import { getCatProfile } from '@/lib/data/cat-profile'
import { DailyCareLogSchema } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

// petId 不讓 client 傳入，一律由已登入使用者的貓咪資料在 server 端查出，避免被偽造
const dailyCareLogActionSchema = DailyCareLogSchema.omit({ id: true, petId: true, createdAt: true })
export type DailyCareLogActionInput = z.output<typeof dailyCareLogActionSchema>

export type CreateDailyCareLogState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function createDailyCareLogAction(
  _prevState: CreateDailyCareLogState,
  input: DailyCareLogActionInput
): Promise<CreateDailyCareLogState> {
  const parsed = dailyCareLogActionSchema.safeParse(input)
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

  const catProfile = await getCatProfile(supabase, user.id)
  if (!catProfile) {
    return { status: 'error', message: '請先到設定頁建立貓咪資料' }
  }

  try {
    await createDailyCareLog(supabase, { ...parsed.data, petId: catProfile.id })
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '記錄失敗，請稍後再試'
    }
  }

  revalidatePath('/log')
  revalidatePath('/')
  revalidatePath('/records')

  return { status: 'success' }
}
