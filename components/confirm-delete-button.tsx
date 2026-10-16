'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

type DeleteResult = { status: 'idle' | 'error' | 'success'; message?: string }

// 刪除是不可復原的醫療紀錄操作：第一次點擊只展開確認，再按一次「確定刪除」才會真的送出
export function ConfirmDeleteButton({
  itemLabel,
  onDelete
}: {
  itemLabel: string
  onDelete: () => Promise<DeleteResult>
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // 「刪除」按鈕在展開確認後會消失，焦點若不手動移走會掉回頁面開頭，
  // 鍵盤與螢幕閱讀器使用者會失去位置；移到較安全的「取消」
  useEffect(() => {
    if (isConfirming) cancelButtonRef.current?.focus()
  }, [isConfirming])

  function handleConfirm() {
    setErrorMessage(null)
    startTransition(async () => {
      const result = await onDelete()
      if (result.status === 'error') {
        setErrorMessage(result.message ?? '刪除失敗，請稍後再試')
        return
      }
      setIsConfirming(false)
    })
  }

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive"
        aria-label={`刪除${itemLabel}`}
        onClick={() => setIsConfirming(true)}
      >
        刪除
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <p role="alert" className="text-xs text-destructive">
        {errorMessage ?? `確定要刪除${itemLabel}嗎？刪除後無法復原。`}
      </p>
      <div className="flex gap-2">
        <Button
          ref={cancelButtonRef}
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setErrorMessage(null)
            setIsConfirming(false)
          }}
        >
          取消
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleConfirm}
        >
          {isPending ? '刪除中…' : '確定刪除'}
        </Button>
      </div>
    </div>
  )
}
