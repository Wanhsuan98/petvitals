import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import {
  AI_ATTEMPT_LIMITS,
  AI_DAILY_LIMITS,
  AI_USAGE_STATUSES,
  type AiFeature,
  type AiUsageStatus
} from '@/lib/schemas'

// ai_usage_logs 的存取。寫入一律透過 claim_ai_usage / finish_ai_usage 兩個資料庫函式，
// 權限與每日上限都在函式內檢查，見 docs/02-data-contract/ai-usage-log.md

export class AiUsageLimitError extends Error {
  constructor() {
    super('今天的使用次數已用完')
    this.name = 'AiUsageLimitError'
  }
}

export class AiUsageForbiddenError extends Error {
  constructor() {
    super('沒有這隻貓的使用權限')
    this.name = 'AiUsageForbiddenError'
  }
}

// 先占名額：成功回傳紀錄 id，超過上限丟出 AiUsageLimitError
export async function claimAiUsage(
  supabase: SupabaseClient,
  petId: string,
  feature: AiFeature
): Promise<string> {
  const { data, error } = await supabase.rpc('claim_ai_usage', {
    p_pet_id: petId,
    p_feature: feature
  })

  if (error) {
    if (error.message.includes('AI_USAGE_LIMIT_REACHED')) throw new AiUsageLimitError()
    if (error.message.includes('AI_USAGE_FORBIDDEN')) throw new AiUsageForbiddenError()
    throw new Error(`占用 AI 使用次數失敗：${error.message}`)
  }
  if (typeof data !== 'string') throw new Error('占用 AI 使用次數失敗：沒有回傳紀錄 id')
  return data
}

export type AiUsageResult = {
  status: Exclude<AiUsageStatus, 'PENDING'>
  model?: string
  inputTokens?: number
  outputTokens?: number
  errorCode?: string
}

export async function finishAiUsage(
  supabase: SupabaseClient,
  usageId: string,
  result: AiUsageResult
): Promise<void> {
  const { error } = await supabase.rpc('finish_ai_usage', {
    p_id: usageId,
    p_status: result.status,
    p_model: result.model ?? null,
    p_input_tokens: result.inputTokens ?? null,
    p_output_tokens: result.outputTokens ?? null,
    p_error_code: result.errorCode ?? null
  })

  if (error) throw new Error(`記錄 AI 使用結果失敗：${error.message}`)
}

// 依當天紀錄算出剩餘次數。純函式，方便測試；規則與 claim_ai_usage 相同
export function countRemainingAiUsage(
  statuses: readonly AiUsageStatus[],
  feature: AiFeature
): number {
  const counted = statuses.filter((status) => status !== 'FAILED').length
  const byDailyLimit = AI_DAILY_LIMITS[feature] - counted
  const byAttemptLimit = AI_ATTEMPT_LIMITS[feature] - statuses.length
  return Math.max(0, Math.min(byDailyLimit, byAttemptLimit))
}

const UsageStatusRowsSchema = z.array(z.object({ status: z.enum(AI_USAGE_STATUSES) }))

// usedOn 為 Asia/Taipei 的 YYYY-MM-DD，與 claim_ai_usage 判斷「今天」的基準相同
export async function getRemainingAiUsage(
  supabase: SupabaseClient,
  petId: string,
  feature: AiFeature,
  usedOn: string
): Promise<number> {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('status')
    .eq('pet_id', petId)
    .eq('feature', feature)
    .eq('used_on', usedOn)

  if (error) throw new Error(`讀取 AI 使用次數失敗：${error.message}`)
  // 不用 as 斷言資料庫回傳的形狀：狀態值不符合時直接拋錯，由呼叫端當作「查不到剩餘次數」處理。
  // 上限本身仍由 claim_ai_usage 在資料庫端把關，這裡只影響畫面上顯示的次數
  const rows = UsageStatusRowsSchema.parse(data)
  return countRemainingAiUsage(
    rows.map((row) => row.status),
    feature
  )
}

// 紀錄只用於計次與費用追蹤，保留 90 天；由 cron 每天清一次
export async function deleteAiUsageLogsBefore(
  serviceRoleSupabase: SupabaseClient,
  beforeIso: string
): Promise<void> {
  const { error } = await serviceRoleSupabase
    .from('ai_usage_logs')
    .delete()
    .lt('created_at', beforeIso)

  if (error) throw new Error(`清除舊 AI 使用紀錄失敗：${error.message}`)
}
