'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getOwnedCatProfile } from '@/lib/data/cat-profile'
import {
  createReminderSchedule,
  deleteReminderSchedule,
  setReminderScheduleEnabled
} from '@/lib/data/reminder-schedules'
import { ReminderScheduleSchema } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

const reminderScheduleInputSchema = ReminderScheduleSchema.pick({
  type: true,
  label: true,
  timeOfDay: true
})
export type ReminderScheduleFormInput = z.input<typeof reminderScheduleInputSchema>
export type ReminderScheduleFormOutput = z.output<typeof reminderScheduleInputSchema>

export type CreateReminderScheduleState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function createReminderScheduleAction(
  _prevState: CreateReminderScheduleState,
  input: ReminderScheduleFormOutput
): Promise<CreateReminderScheduleState> {
  const parsed = reminderScheduleInputSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', message: '資料格式有誤，請確認欄位內容後再試一次' }
  }

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  const catProfile = await getOwnedCatProfile(supabase, user.id)
  if (!catProfile) return { status: 'error', message: '只有飼主本人可以管理提醒排程' }

  try {
    await createReminderSchedule(supabase, { ...parsed.data, petId: catProfile.id })
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '新增失敗，請稍後再試'
    }
  }

  revalidatePath('/settings/reminders')
  return { status: 'success', message: '已新增提醒排程' }
}

export type ToggleReminderScheduleState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function toggleReminderScheduleAction(
  _prevState: ToggleReminderScheduleState,
  input: { id: string; enabled: boolean }
): Promise<ToggleReminderScheduleState> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  const catProfile = await getOwnedCatProfile(supabase, user.id)
  if (!catProfile) return { status: 'error', message: '只有飼主本人可以管理提醒排程' }

  try {
    await setReminderScheduleEnabled(supabase, input.id, input.enabled)
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '更新失敗，請稍後再試'
    }
  }

  revalidatePath('/settings/reminders')
  return { status: 'success' }
}

export type DeleteReminderScheduleState = {
  status: 'idle' | 'error' | 'success'
  message?: string
}

export async function deleteReminderScheduleAction(
  _prevState: DeleteReminderScheduleState,
  id: string
): Promise<DeleteReminderScheduleState> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: '登入狀態已過期，請重新登入' }

  const catProfile = await getOwnedCatProfile(supabase, user.id)
  if (!catProfile) return { status: 'error', message: '只有飼主本人可以管理提醒排程' }

  try {
    await deleteReminderSchedule(supabase, id)
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '刪除失敗，請稍後再試'
    }
  }

  revalidatePath('/settings/reminders')
  return { status: 'success', message: '已刪除提醒排程' }
}
