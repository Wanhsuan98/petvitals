import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { AI_FALLBACK_BETA, AI_MODEL, toFailureCode, type AiCallOutcome } from './anthropic'
import {
  BLOOD_TEST_EXTRACTION_JSON_SCHEMA,
  BLOOD_TEST_EXTRACTION_SYSTEM_PROMPT
} from './blood-test-extraction-prompt'
import { BloodTestExtractionSchema, type BloodTestExtraction } from './blood-test-extraction'

// 把一張血檢報告照片（JPEG，base64）送給 Claude 辨識。
// 照片只存在這次請求的記憶體裡，不保存、不寫進 log（ADR-010）
export async function extractBloodTestFromImage(
  client: Anthropic,
  jpegBase64: string
): Promise<AiCallOutcome<BloodTestExtraction>> {
  let response: Anthropic.Beta.BetaMessage
  try {
    response = await client.beta.messages.create({
      model: AI_MODEL,
      // adaptive thinking 的思考 token 也算在 max_tokens 裡，抄寫本身只需要幾百個 token
      max_tokens: 8000,
      betas: [AI_FALLBACK_BETA],
      fallbacks: 'default',
      output_config: {
        // 抄寫數字不需要深入推理
        effort: 'low',
        format: { type: 'json_schema', schema: BLOOD_TEST_EXTRACTION_JSON_SCHEMA }
      },
      system: BLOOD_TEST_EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 }
            },
            { type: 'text', text: '請抄寫這張照片上的血液生化檢驗數值。' }
          ]
        }
      ]
    })
  } catch (error) {
    return { status: 'FAILED', errorCode: toFailureCode(error) }
  }

  const model = response.model
  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens
  }

  // 一定要先看 stop_reason 再讀 content：拒答時 content 可能是空的
  if (response.stop_reason === 'refusal') return { status: 'REFUSED', model, usage }
  if (response.stop_reason === 'max_tokens') {
    return { status: 'INVALID', errorCode: 'TRUNCATED', model, usage }
  }

  const text = response.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('')

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { status: 'INVALID', errorCode: 'SCHEMA_MISMATCH', model, usage }
  }

  const parsed = BloodTestExtractionSchema.safeParse(json)
  if (!parsed.success) return { status: 'INVALID', errorCode: 'SCHEMA_MISMATCH', model, usage }

  return { status: 'SUCCEEDED', data: parsed.data, model, usage }
}
