import { describe, expect, it } from 'vitest'

import type { PushDelivery } from '@/lib/data/push-deliveries'

import { diagnoseDelivery } from './push-delivery-log'

function makeDelivery(overrides: Partial<PushDelivery> = {}): PushDelivery {
  return {
    id: 'delivery-1',
    kind: 'REMINDER',
    status: 'DELIVERED',
    attemptCount: 1,
    statusCode: 201,
    errorMessage: null,
    endpointHost: 'web.push.apple.com',
    subscriptionCreatedAt: '2026-10-15T06:15:30.000Z',
    receivedAt: null,
    createdAt: '2026-10-28T02:50:00.000Z',
    updatedAt: '2026-10-28T02:50:01.000Z',
    reminderLabel: '皮下輸液',
    ...overrides
  }
}

describe('diagnoseDelivery', () => {
  it('points to device settings when the phone confirmed receipt', () => {
    const result = diagnoseDelivery(makeDelivery({ receivedAt: '2026-10-28T02:50:03.000Z' }))
    expect(result.tone).toBe('ok')
    expect(result.label).toContain('手機已收到')
    expect(result.detail).toContain('專注模式')
  })

  it('flags a push the service accepted but the phone never confirmed', () => {
    const result = diagnoseDelivery(makeDelivery())
    expect(result.tone).toBe('warn')
    expect(result.label).toContain('手機沒有回報收到')
  })

  it('shows the push service reason when it rejected the push', () => {
    const result = diagnoseDelivery(
      makeDelivery({ status: 'FAILED', statusCode: 403, errorMessage: '{"reason":"BadJwtToken"}' })
    )
    expect(result.tone).toBe('error')
    expect(result.label).toContain('403')
    expect(result.detail).toContain('BadJwtToken')
  })

  it('tells the user to re-enable push when the subscription expired', () => {
    const result = diagnoseDelivery(makeDelivery({ status: 'EXPIRED', statusCode: 410 }))
    expect(result.label).toContain('訂閱已失效')
    expect(result.detail).toContain('重新開啟推播')
  })
})
