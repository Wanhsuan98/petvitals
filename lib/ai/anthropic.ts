import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

// 伺服器端專用：金鑰只存在 ANTHROPIC_API_KEY（不能加 NEXT_PUBLIC_ 前綴），
// 只能從 Server Action 引用，瀏覽器不會直接接觸 API（ADR-010）。
// server-only 讓前端元件不小心引用時直接在建置階段報錯，避免把 SDK 打包進瀏覽器

// 建立評估資料後，再依準確率與費用決定是否改用較小的模型
export const AI_MODEL = 'claude-opus-5-5'

// 模型拒答時由 API 端自動改用 Anthropic 建議的備援模型（server-side fallback，beta）
export const AI_FALLBACK_BETA = 'server-side-fallback-2026-07-01'

// 低於頁面 maxDuration（60 秒），讓逾時能被這裡接住並記為 FAILED，而不是整個 Server Action 被平台中斷
const REQUEST_TIMEOUT_MS = 45_000

export function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('缺少環境變數 ANTHROPIC_API_KEY，請確認 .env.local 是否已設定')
  }
  // 重試一次就好：使用者在畫面上等，重試太多次會拖過 maxDuration
  return new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 })
}

export type AiTokenUsage = { inputTokens: number; outputTokens: number }

// 一次 AI 呼叫的結果，對應 ai_usage_logs.status（PENDING 除外）
export type AiCallOutcome<T> =
  | { status: 'SUCCEEDED'; data: T; model: string; usage: AiTokenUsage }
  | { status: 'REFUSED'; model: string; usage: AiTokenUsage }
  | { status: 'INVALID'; errorCode: string; model: string; usage: AiTokenUsage }
  | { status: 'FAILED'; errorCode: string }

// 錯誤只轉成代碼：SDK 的錯誤物件可能帶有回應內容，不直接寫進 log 或資料庫
export function toFailureCode(error: unknown): string {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return 'TIMEOUT'
  if (error instanceof Anthropic.APIConnectionError) return 'CONNECTION'
  if (error instanceof Anthropic.RateLimitError) return 'RATE_LIMITED'
  if (error instanceof Anthropic.APIError) return `API_${error.status ?? 'UNKNOWN'}`
  return 'UNKNOWN'
}
