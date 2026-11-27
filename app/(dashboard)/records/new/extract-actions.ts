'use server'

import { createAnthropicClient, type AiCallOutcome } from '@/lib/ai/anthropic'
import { toBloodTestPrefill, type BloodTestPrefill } from '@/lib/ai/blood-test-extraction'
import { extractBloodTestFromImage } from '@/lib/ai/extract-blood-test'
import { isJpeg, MAX_REPORT_IMAGE_BYTES } from '@/lib/ai/image-limits'
import {
  AiUsageForbiddenError,
  AiUsageLimitError,
  claimAiUsage,
  finishAiUsage,
  getRemainingAiUsage
} from '@/lib/data/ai-usage'
import { getCatProfile } from '@/lib/data/cat-profile'
import { createClient } from '@/lib/supabase/server'
import { toTaipeiDateString } from '@/lib/utils'
import type { BloodTestExtraction } from '@/lib/ai/blood-test-extraction'

export type ExtractBloodTestState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  prefill?: BloodTestPrefill
  // 今天還剩幾次；查不到時為 undefined，畫面就不顯示次數
  remaining?: number
}

const LIMIT_REACHED_MESSAGE = '今天的辨識次數已用完，請手動輸入或明天再試'
const RETRY_MESSAGE = '辨識失敗，請再試一次或手動輸入'

function errorState(message: string, remaining?: number): ExtractBloodTestState {
  return { status: 'error', message, remaining }
}

// 血檢報告照片 → AI 辨識 → 表單預填值。結果只用來預填，不會寫入 blood_tests；
// 使用者核對後按儲存，才走 createBloodTestAction 的驗證與寫入（ADR-010）
export async function extractBloodTestAction(
  _prevState: ExtractBloodTestState,
  formData: FormData
): Promise<ExtractBloodTestState> {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) return errorState('登入狀態已過期，請重新登入')

  // petId 不讓 client 傳入，一律由登入者可以存取的貓查出
  const catProfile = await getCatProfile(supabase, user.id)
  if (!catProfile) return errorState('請先到設定頁建立貓咪資料')

  // 先確認登入與貓咪資料，再讀照片：未登入的請求不必讀入整張照片。
  // 檔案大小與格式在前端壓縮時已經處理過，這裡不相信 client，再檢查一次
  const image = formData.get('image')
  if (!(image instanceof File) || image.size === 0) return errorState('請選擇一張照片')
  if (image.size > MAX_REPORT_IMAGE_BYTES) return errorState('照片檔案太大，請重新選擇')
  const bytes = new Uint8Array(await image.arrayBuffer())
  if (!isJpeg(bytes)) return errorState('照片格式不正確，請重新選擇')

  let usageId: string
  try {
    // 資料庫函式內會再確認權限，並以 advisory lock 擋住同時送出的請求
    usageId = await claimAiUsage(supabase, catProfile.id, 'BLOOD_TEST_EXTRACTION')
  } catch (error) {
    if (error instanceof AiUsageLimitError) return errorState(LIMIT_REACHED_MESSAGE, 0)
    if (error instanceof AiUsageForbiddenError) return errorState('沒有這隻貓的使用權限')
    console.error('[ai] 占用辨識次數失敗', error instanceof Error ? error.message : error)
    return errorState(RETRY_MESSAGE)
  }

  let outcome: AiCallOutcome<BloodTestExtraction>
  try {
    const client = createAnthropicClient()
    outcome = await extractBloodTestFromImage(client, Buffer.from(bytes).toString('base64'))
  } catch (error) {
    // 只有設定錯誤（例如缺少金鑰）會走到這裡，API 錯誤已經在 extractBloodTestFromImage 轉成 FAILED
    console.error('[ai] 無法建立 AI client', error instanceof Error ? error.message : error)
    outcome = { status: 'FAILED', errorCode: 'CONFIG' }
  }

  try {
    await finishAiUsage(supabase, usageId, {
      status: outcome.status,
      model: outcome.status === 'FAILED' ? undefined : outcome.model,
      inputTokens: outcome.status === 'FAILED' ? undefined : outcome.usage.inputTokens,
      outputTokens: outcome.status === 'FAILED' ? undefined : outcome.usage.outputTokens,
      errorCode:
        outcome.status === 'FAILED' || outcome.status === 'INVALID' ? outcome.errorCode : undefined
    })
  } catch (error) {
    // 記錄失敗時紀錄會停在 PENDING，仍計入上限（保守做法），不影響這次回傳給使用者的結果
    console.error('[ai] 記錄辨識結果失敗', error instanceof Error ? error.message : error)
  }

  let remaining: number | undefined
  try {
    remaining = await getRemainingAiUsage(
      supabase,
      catProfile.id,
      'BLOOD_TEST_EXTRACTION',
      toTaipeiDateString(new Date())
    )
  } catch (error) {
    console.error('[ai] 讀取剩餘次數失敗', error instanceof Error ? error.message : error)
  }

  // log 只記錄狀態與錯誤代碼，不記錄照片或辨識內容
  if (outcome.status !== 'SUCCEEDED') {
    console.error('[ai] 血檢辨識未完成', {
      status: outcome.status,
      errorCode: outcome.status === 'REFUSED' ? undefined : outcome.errorCode
    })
  }

  switch (outcome.status) {
    case 'REFUSED':
      return errorState('目前無法辨識這張照片，請手動輸入', remaining)
    case 'INVALID':
    case 'FAILED':
      return errorState(RETRY_MESSAGE, remaining)
    case 'SUCCEEDED': {
      const prefill = toBloodTestPrefill(outcome.data, toTaipeiDateString(new Date()))
      if (!prefill.isBloodTestReport) {
        return errorState('這張照片看起來不是血檢報告，請重新拍攝', remaining)
      }
      return { status: 'success', prefill, remaining }
    }
  }
}
