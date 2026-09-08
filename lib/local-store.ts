import { useCallback, useSyncExternalStore } from 'react'
import type { z } from 'zod'

// Week 3 前的暫時性資料層：用 localStorage 模擬 Supabase 持久化，
// 讓 /log、/records 等頁面之間可以共用同一份資料做展示與驗證流程，
// 待 Supabase 串接後這個檔案應該整個被移除，改由實際資料庫查詢取代。
//
// 用 useSyncExternalStore 而非「useEffect 裡 setState」讀取，
// 是為了讓 SSR 階段（沒有 window）與 client hydrate 後的結果保持一致，
// 避免 hydration mismatch，也符合 react-hooks/set-state-in-effect 規則。
//
// localStorage 是使用者可透過 devtools 竄改、或未來 schema 調整後可能留下舊格式資料的
// 外部邊界，因此讀出來一律用對應的 zod schema 驗證，格式不符就丟棄該筆而不是讓整頁崩潰。

const EMPTY_LIST: never[] = []
const cache = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()

function getListeners(key: string): Set<() => void> {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  return set
}

export function loadList<T>(key: string, schema: z.ZodType<T>): T[] {
  if (typeof window === 'undefined') return []

  const cached = cache.get(key)
  if (cached) return cached as T[]

  try {
    const raw = window.localStorage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    const result = schema.array().safeParse(parsed)

    if (!result.success) {
      console.error(`Invalid data for "${key}" in localStorage, discarding`, result.error)
    }

    const items = result.success ? result.data : []
    cache.set(key, items)
    return items
  } catch (error) {
    console.error(`Failed to read "${key}" from localStorage`, error)
    return []
  }
}

export function saveList<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(items))
    cache.set(key, items)
    for (const listener of getListeners(key)) listener()
  } catch (error) {
    console.error(`Failed to write "${key}" to localStorage`, error)
  }
}

function subscribe(key: string, onStoreChange: () => void): () => void {
  const set = getListeners(key)
  set.add(onStoreChange)

  function handleStorageEvent(event: StorageEvent) {
    if (event.key !== key) return
    cache.delete(key)
    onStoreChange()
  }
  window.addEventListener('storage', handleStorageEvent)

  return () => {
    set.delete(onStoreChange)
    window.removeEventListener('storage', handleStorageEvent)
  }
}

// 讀取並訂閱指定 key 的清單，資料經由 saveList 寫入後會自動觸發重新渲染
export function useLocalList<T>(key: string, schema: z.ZodType<T>): T[] {
  const subscribeFn = useCallback(
    (onStoreChange: () => void) => subscribe(key, onStoreChange),
    [key]
  )
  const getSnapshot = useCallback(() => loadList<T>(key, schema), [key, schema])
  const getServerSnapshot = useCallback(() => EMPTY_LIST as T[], [])

  return useSyncExternalStore(subscribeFn, getSnapshot, getServerSnapshot)
}

export const STORAGE_KEYS = {
  dailyCareLogs: 'petvitals:daily-care-logs',
  bloodTests: 'petvitals:blood-tests'
} as const
