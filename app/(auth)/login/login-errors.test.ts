import { describe, expect, it } from 'vitest'

import { getLoginErrorMessage } from './login-errors'

describe('getLoginErrorMessage', () => {
  it.each(['auth_callback_failed', 'google_oauth_failed'])(
    'has a message for the error codes the login flow redirects with: %s',
    (code) => {
      expect(getLoginErrorMessage(code)).toEqual(expect.any(String))
    }
  )

  it.each([undefined, '', 'unknown_code', '<script>alert(1)</script>', ['auth_callback_failed']])(
    'shows nothing for missing, unknown or repeated codes: %j',
    (code) => {
      expect(getLoginErrorMessage(code)).toBeUndefined()
    }
  )
})
