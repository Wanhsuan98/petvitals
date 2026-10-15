import { afterEach, describe, expect, it, vi } from 'vitest'

import { getReadyServiceWorker, urlBase64ToUint8Array } from './browser'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('urlBase64ToUint8Array', () => {
  it('decodes standard base64 characters', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
  })

  it('maps the URL-safe alphabet back and restores missing padding', () => {
    // 位元組 [251, 255] 的標準 base64 是 '+/8='，URL-safe 版本是 '-_8'（無 padding）
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
    // 長度 mod 4 = 2 要補兩個 '='
    expect(Array.from(urlBase64ToUint8Array('-vv8_Q'))).toEqual([250, 251, 252, 253])
  })

  it('decodes a VAPID-shaped public key (65-byte uncompressed EC point)', () => {
    const bytes = [4, ...new Array<number>(64).fill(7)]
    const encoded = Buffer.from(bytes).toString('base64url')
    expect(encoded).toHaveLength(87) // mod 4 = 3，真實金鑰需要補 1 個 '='
    const decoded = urlBase64ToUint8Array(encoded)
    expect(decoded).toHaveLength(65)
    expect(decoded[0]).toBe(0x04)
  })
})

describe('push initialization', () => {
  it('clears the timeout after a service worker becomes ready', async () => {
    vi.useFakeTimers()
    const registration = { scope: 'https://example.com/' }
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(registration) } })
    expect(await getReadyServiceWorker()).toBe(registration)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects rather than leaving the device status checking forever', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { serviceWorker: { ready: new Promise<never>(() => {}) } })
    const assertion = expect(getReadyServiceWorker()).rejects.toThrow('推播初始化逾時')
    await vi.advanceTimersByTimeAsync(10_000)
    await assertion
    expect(vi.getTimerCount()).toBe(0)
  })
})
