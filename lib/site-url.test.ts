import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'https://forged.example' })
}))

import { getSiteOrigin } from './site-url'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getSiteOrigin', () => {
  it.each(['https://petvitals.test', 'https://petvitals.test/', 'https://petvitals.test/login'])(
    'uses only the origin of NEXT_PUBLIC_SITE_URL and ignores request headers: %s',
    async (siteUrl) => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl)
      expect(await getSiteOrigin()).toBe('https://petvitals.test')
    }
  )
})
