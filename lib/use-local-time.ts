'use client'

import { useSyncExternalStore } from 'react'

// 以分鐘為單位保持 snapshot 穩定；SSR 與 hydration 都先回傳 null。
function getSnapshot(): number {
  return Math.floor(Date.now() / 60_000) * 60_000
}

function getServerSnapshot(): null {
  return null
}

function subscribe(onChange: () => void): () => void {
  const intervalId = window.setInterval(onChange, 60_000)
  window.addEventListener('focus', onChange)
  document.addEventListener('visibilitychange', onChange)

  return () => {
    window.clearInterval(intervalId)
    window.removeEventListener('focus', onChange)
    document.removeEventListener('visibilitychange', onChange)
  }
}

export function useLocalTime(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
