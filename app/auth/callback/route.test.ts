import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchangeCodeForSession } })
}))

import { GET } from './route'

function request(query: string) {
  return new NextRequest(`https://petvitals.test/auth/callback${query}`)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('GET /auth/callback', () => {
  it('signs the user in and goes to the home page', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
    const response = await GET(request('?code=abc'))
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(response.headers.get('location')).toBe('https://petvitals.test/')
  })

  // 這些值都通過過舊版「以 / 開頭、但不是 // 開頭」的檢查，瀏覽器卻會解析成外部網站
  it.each(['/\\evil.com', '/\\/evil.com', '/\t/evil.com', '//evil.com', 'https://evil.com'])(
    'never redirects off-site, whatever next is: %j',
    async (next) => {
      mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
      const response = await GET(request(`?code=abc&next=${encodeURIComponent(next)}`))
      expect(response.headers.get('location')).toBe('https://petvitals.test/')
    }
  )

  it('sends the user back to login when the code cannot be exchanged', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: new Error('invalid code') })
    const response = await GET(request('?code=abc'))
    expect(response.headers.get('location')).toBe(
      'https://petvitals.test/login?error=auth_callback_failed'
    )
  })

  it('sends the user back to login when there is no code', async () => {
    const response = await GET(request(''))
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(
      'https://petvitals.test/login?error=auth_callback_failed'
    )
  })
})
