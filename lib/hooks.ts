import { STORAGE_KEYS, useLocalList } from '@/lib/local-store'
import {
  BloodTestSchema,
  DailyCareLogSchema,
  type BloodTest,
  type DailyCareLog
} from '@/lib/schemas'

// 把「storage key 對應哪個 schema」的配對關係鎖在這裡，避免各頁面各自手動配對時複製貼上貼錯
export function useDailyCareLogs(): DailyCareLog[] {
  return useLocalList(STORAGE_KEYS.dailyCareLogs, DailyCareLogSchema)
}

export function useBloodTests(): BloodTest[] {
  return useLocalList(STORAGE_KEYS.bloodTests, BloodTestSchema)
}
