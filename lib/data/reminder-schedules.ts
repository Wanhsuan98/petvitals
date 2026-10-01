import type { SupabaseClient } from '@supabase/supabase-js'

import { ReminderScheduleSchema, type ReminderSchedule } from '@/lib/schemas'

type ReminderScheduleRow = {
  id: string
  pet_id: string
  type: ReminderSchedule['type']
  label: string
  time_of_day: string
  enabled: boolean
  last_sent_on: string | null
  created_at: string
}

function toReminderSchedule(row: ReminderScheduleRow): ReminderSchedule {
  return ReminderScheduleSchema.parse({
    id: row.id,
    petId: row.pet_id,
    type: row.type,
    label: row.label,
    timeOfDay: row.time_of_day,
    enabled: row.enabled,
    createdAt: new Date(row.created_at).toISOString()
  })
}

// owner 跟 accepted caregiver 都能看（RLS 見 20260930000000），所以呼叫端要自己決定
// 是否要顯示管理操作（canManage），這個函式本身不分身分，一律回傳完整清單
export async function listReminderSchedulesForPet(
  supabase: SupabaseClient,
  petId: string
): Promise<ReminderSchedule[]> {
  const { data, error } = await supabase
    .from('reminder_schedules')
    .select('*')
    .eq('pet_id', petId)
    .order('time_of_day', { ascending: true })

  if (error) throw new Error(`讀取提醒排程失敗：${error.message}`)
  return (data as ReminderScheduleRow[]).map(toReminderSchedule)
}

// 用 owner 自己的 session 寫（RLS 只讓 owner 寫這張表）
export async function createReminderSchedule(
  supabase: SupabaseClient,
  input: { petId: string; type: ReminderSchedule['type']; label: string; timeOfDay: string }
): Promise<ReminderSchedule> {
  const { data, error } = await supabase
    .from('reminder_schedules')
    .insert({
      pet_id: input.petId,
      type: input.type,
      label: input.label,
      time_of_day: input.timeOfDay
    })
    .select()
    .single()

  if (error) throw new Error(`新增提醒排程失敗：${error.message}`)
  return toReminderSchedule(data as ReminderScheduleRow)
}

export async function setReminderScheduleEnabled(
  supabase: SupabaseClient,
  id: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase.from('reminder_schedules').update({ enabled }).eq('id', id)
  if (error) throw new Error(`更新提醒排程失敗：${error.message}`)
}

export async function deleteReminderSchedule(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('reminder_schedules').delete().eq('id', id)
  if (error) throw new Error(`刪除提醒排程失敗：${error.message}`)
}

// cron job 專用：用 service-role 找出「現在這個時間點」要發送的排程，一併帶出
// 貓的名字跟 owner_id，才能組出推播內容與收件人清單（owner + accepted caregivers）
export type DueReminder = ReminderSchedule & {
  petName: string
  ownerId: string
  lastSentOn: string | null
}

export async function listDueReminders(
  serviceRoleSupabase: SupabaseClient,
  timeOfDay: string
): Promise<DueReminder[]> {
  const { data, error } = await serviceRoleSupabase
    .from('reminder_schedules')
    .select('*, cat_profiles(name, owner_id)')
    .eq('enabled', true)
    .eq('time_of_day', timeOfDay)

  if (error) throw new Error(`讀取到期提醒失敗：${error.message}`)

  type RowWithCat = ReminderScheduleRow & {
    cat_profiles: { name: string; owner_id: string } | null
  }

  return (data as RowWithCat[])
    .filter((row): row is RowWithCat & { cat_profiles: { name: string; owner_id: string } } =>
      Boolean(row.cat_profiles)
    )
    .map((row) => ({
      ...toReminderSchedule(row),
      petName: row.cat_profiles.name,
      ownerId: row.cat_profiles.owner_id,
      lastSentOn: row.last_sent_on
    }))
}

// 發送完成後記錄「今天已經發送過」，避免 GitHub Actions 排程的執行時間誤差
// （延遲觸發、同一個 5 分鐘區間內不只跑一次）讓同一則提醒一天內重複推播
export async function markReminderSentToday(
  serviceRoleSupabase: SupabaseClient,
  id: string,
  dateString: string
): Promise<void> {
  const { error } = await serviceRoleSupabase
    .from('reminder_schedules')
    .update({ last_sent_on: dateString })
    .eq('id', id)

  if (error) throw new Error(`更新提醒發送紀錄失敗：${error.message}`)
}
