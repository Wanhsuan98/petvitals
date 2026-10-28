import { describe, expect, it } from 'vitest'

import { describeTestResult } from './push-subscribe-toggle'

describe('describeTestResult', () => {
  it('mentions devices that did not receive the test push', () => {
    const message = describeTestResult({
      deviceCount: 3,
      deliveredCount: 1,
      failedCount: 1,
      expiredCount: 1
    })
    expect(message).toContain('已送出到 1 台裝置，另有 2 台沒送出')
  })

  it('does not mention failures when every device was delivered', () => {
    const message = describeTestResult({
      deviceCount: 2,
      deliveredCount: 2,
      failedCount: 0,
      expiredCount: 0
    })
    expect(message).toContain('已送出到 2 台裝置。')
    expect(message).not.toContain('沒送出')
  })

  it('asks the user to re-enable push when nothing was delivered', () => {
    const message = describeTestResult({
      deviceCount: 1,
      deliveredCount: 0,
      failedCount: 1,
      expiredCount: 0
    })
    expect(message).toContain('沒有送出成功')
  })
})
