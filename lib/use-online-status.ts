'use client'

import { useSyncExternalStore } from 'react'

function getSnapshot(): boolean {
  return navigator.onLine
}

// SSR 時無法得知連線狀態，先當作在線，避免伺服器端畫面一律顯示離線提示
function getServerSnapshot(): boolean {
  return true
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

// navigator.onLine 只代表「有連上某個網路」，不保證真的連得到伺服器；
// 所以這只用來提早提示，送出時仍要靠 withNetworkErrorFallback 接住真的失敗
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
