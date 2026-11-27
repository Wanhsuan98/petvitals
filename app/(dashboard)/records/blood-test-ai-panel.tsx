'use client'

import { Camera, ShieldCheck, Sparkles } from 'lucide-react'
import { useId, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import type { BloodTestPrefill } from '@/lib/ai/blood-test-extraction'
import { AI_HEALTH_NOTICE, AI_PHOTO_CONSENT_ITEMS } from '@/lib/constants'
import { compressReportImage, ImageReadError, ImageTooLargeError } from '@/lib/image-compress'
import { useOnlineStatus } from '@/lib/use-online-status'

import { extractBloodTestAction, type ExtractBloodTestState } from './new/extract-actions'

// 同一裝置只需要同意一次；說明內容有實質改變時把版本號加一，讓使用者重新看過
const CONSENT_STORAGE_KEY = 'petvitals:ai-photo-consent:v1'

function readConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === '1'
  } catch {
    // 私密瀏覽等情況讀不到 localStorage：當作沒同意過，每次都顯示說明
    return false
  }
}

function saveConsent(): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, '1')
  } catch {
    // 存不了也沒關係，下次再顯示一次說明
  }
}

const INITIAL_STATE: ExtractBloodTestState = { status: 'idle' }

// 跟 withNetworkErrorFallback 同樣的目的：網路中斷時 Server Action 會直接 reject，這裡轉成畫面上的錯誤訊息。
// 訊息不能沿用「無法確認是否已儲存」，因為辨識不會寫入任何血檢資料
async function extractWithFallback(
  prevState: ExtractBloodTestState,
  formData: FormData
): Promise<ExtractBloodTestState> {
  if (!navigator.onLine) {
    return {
      ...prevState,
      status: 'error',
      message: '目前沒有網路連線，連線後才能辨識報告'
    }
  }
  try {
    return await extractBloodTestAction(prevState, formData)
  } catch (error) {
    console.error('[ai] 辨識請求失敗', error instanceof Error ? error.message : error)
    return {
      ...prevState,
      status: 'error',
      message: '連線中斷，辨識沒有完成，請再試一次或手動輸入'
    }
  }
}

export function BloodTestAiPanel({
  initialRemaining,
  onPrefill
}: {
  initialRemaining: number | undefined
  // 回傳實際填入的欄位數；已經填過或改過的欄位不會被覆蓋
  onPrefill: (prefill: BloodTestPrefill) => number
}) {
  const isOnline = useOnlineStatus()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const consentCheckboxId = useId()
  const [state, setState] = useState<ExtractBloodTestState>(INITIAL_STATE)
  const [isPending, startTransition] = useTransition()
  const [isCompressing, setIsCompressing] = useState(false)
  const [isConsentOpen, setIsConsentOpen] = useState(false)
  const [isConsentChecked, setIsConsentChecked] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [hasPrefilled, setHasPrefilled] = useState(false)

  const remaining = state.remaining ?? initialRemaining
  const isBusy = isPending || isCompressing
  const isLimitReached = remaining === 0

  // 結果直接在事件流程裡處理，不放在 effect：預填會改表單狀態，是使用者操作的結果，不是要同步的外部狀態
  function handleResult(result: ExtractBloodTestState) {
    setState(result)
    if (result.status !== 'success' || !result.prefill) return

    const filledCount = onPrefill(result.prefill)
    setHasPrefilled(true)
    setResultMessage(
      filledCount > 0
        ? `已預填 ${filledCount} 個欄位。請對照報告逐欄核對，確認無誤後再儲存。`
        : '沒有可以預填的欄位，請參考各欄位下方的說明手動輸入。'
    )
  }

  function openFilePicker() {
    setLocalError(null)
    if (!readConsent()) {
      setIsConsentOpen(true)
      return
    }
    fileInputRef.current?.click()
  }

  function acceptConsent() {
    saveConsent()
    setIsConsentOpen(false)
    fileInputRef.current?.click()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // 清空讓使用者可以重選同一張照片
    event.target.value = ''
    if (!file) return

    setLocalError(null)
    setResultMessage(null)
    setIsCompressing(true)
    let image: Blob
    try {
      image = await compressReportImage(file)
    } catch (error) {
      setLocalError(
        error instanceof ImageReadError || error instanceof ImageTooLargeError
          ? error.message
          : '無法處理這張照片，請換一張再試'
      )
      return
    } finally {
      setIsCompressing(false)
    }

    const formData = new FormData()
    formData.append('image', image, 'report.jpg')
    startTransition(async () => {
      const result = await extractWithFallback(state, formData)
      // await 之後的狀態更新要再包一次 transition（React 19 的 async transition 規則）
      startTransition(() => handleResult(result))
    })
  }

  const errorMessage = localError ?? (state.status === 'error' ? state.message : undefined)

  return (
    <section
      aria-labelledby="ai-extraction-heading"
      className="mb-5 space-y-3 rounded-2xl border border-border p-4"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="space-y-1">
          <h2 id="ai-extraction-heading" className="text-sm font-medium">
            拍照辨識報告
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            拍下醫院的血檢報告，AI 會辨識數值並預填下方表單。不會自動儲存，請核對後再送出。
          </p>
        </div>
      </div>

      {isConsentOpen && (
        <div className="space-y-3 rounded-xl bg-secondary/80 p-3 text-xs leading-relaxed text-secondary-foreground">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            上傳前請先了解
          </div>
          <ul className="list-disc space-y-1 pl-5">
            {AI_PHOTO_CONSENT_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <input
              id={consentCheckboxId}
              type="checkbox"
              className="size-4"
              checked={isConsentChecked}
              onChange={(event) => setIsConsentChecked(event.target.checked)}
            />
            <label htmlFor={consentCheckboxId}>我了解</label>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={!isConsentChecked} onClick={acceptConsent}>
              繼續選擇照片
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsConsentOpen(false)}>
              取消
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isBusy || !isOnline || isLimitReached || isConsentOpen}
          onClick={openFilePicker}
        >
          <Camera className="size-4" aria-hidden="true" />
          {isBusy ? '辨識中…' : hasPrefilled ? '再拍一頁' : '拍照辨識報告'}
        </Button>
        {remaining !== undefined && (
          <p className="text-xs text-muted-foreground">
            {isLimitReached ? '今天的辨識次數已用完' : `今天還可以辨識 ${remaining} 次`}
          </p>
        )}
      </div>

      {!isOnline && (
        <p className="text-xs text-muted-foreground">目前沒有網路連線，連線後才能辨識報告。</p>
      )}
      {hasPrefilled && (
        <p className="text-xs text-muted-foreground">
          多頁報告可以按「再拍一頁」，只會填入還空著的欄位，不會覆蓋已經填好或改過的欄位。
        </p>
      )}

      <div aria-live="polite" className="space-y-2">
        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}
        {resultMessage && !errorMessage && <p className="text-sm">{resultMessage}</p>}
      </div>

      {hasPrefilled && (
        <p className="rounded-xl bg-secondary/60 p-3 text-xs leading-relaxed text-secondary-foreground">
          {AI_HEALTH_NOTICE}
        </p>
      )}
    </section>
  )
}
