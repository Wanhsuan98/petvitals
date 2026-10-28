import { afterEach, describe, expect, it, vi } from 'vitest'

import { NETWORK_ERROR_MESSAGE, OFFLINE_MESSAGE, withNetworkErrorFallback } from './network-error'

type State = { status: 'idle' | 'error' | 'success'; message?: string }
const idle: State = { status: 'idle' }

function setOnline(isOnline: boolean) {
  vi.stubGlobal('navigator', { onLine: isOnline })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('withNetworkErrorFallback', () => {
  it('passes through the action result when online', async () => {
    setOnline(true)
    const action = vi.fn(async (): Promise<State> => ({ status: 'success' }))
    await expect(withNetworkErrorFallback(action)(idle, 'input')).resolves.toEqual({
      status: 'success'
    })
    expect(action).toHaveBeenCalledWith(idle, 'input')
  })

  it('does not send the request at all while offline', async () => {
    setOnline(false)
    const action = vi.fn(async (): Promise<State> => ({ status: 'success' }))
    await expect(withNetworkErrorFallback(action)(idle, 'input')).resolves.toEqual({
      status: 'error',
      message: OFFLINE_MESSAGE
    })
    expect(action).not.toHaveBeenCalled()
  })

  it('turns a network rejection into a form error instead of crashing the page', async () => {
    setOnline(true)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const action = vi.fn(async (): Promise<State> => {
      throw new TypeError('Failed to fetch')
    })
    await expect(withNetworkErrorFallback(action)(idle, 'input')).resolves.toEqual({
      status: 'error',
      message: NETWORK_ERROR_MESSAGE
    })
  })

  it('keeps server-side validation errors as they are', async () => {
    setOnline(true)
    const action = vi.fn(async (): Promise<State> => ({ status: 'error', message: '格式有誤' }))
    await expect(withNetworkErrorFallback(action)(idle, 'input')).resolves.toEqual({
      status: 'error',
      message: '格式有誤'
    })
  })
})
