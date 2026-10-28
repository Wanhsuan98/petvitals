import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  listPushSubscriptionsForUserIds: vi.fn(),
  createTestDelivery: vi.fn(),
  recordDeliveryOutcome: vi.fn(),
  sendToSubscription: vi.fn()
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } })
}))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => ({}) }))
vi.mock('@/lib/data/push-subscriptions', () => ({
  listPushSubscriptionsForUserIds: mocks.listPushSubscriptionsForUserIds
}))
vi.mock('@/lib/data/push-deliveries', () => ({
  createTestDelivery: mocks.createTestDelivery,
  recordDeliveryOutcome: mocks.recordDeliveryOutcome
}))
vi.mock('@/lib/push/send', () => ({ sendToSubscription: mocks.sendToSubscription }))

import { POST } from './route'

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('POST /api/push/test', () => {
  it('only sends to the signed-in user, logs each device and returns the counts', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mocks.listPushSubscriptionsForUserIds.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    mocks.createTestDelivery.mockResolvedValueOnce('delivery-a').mockResolvedValueOnce('delivery-b')
    mocks.sendToSubscription
      .mockResolvedValueOnce({ status: 'DELIVERED', statusCode: 201, errorMessage: null })
      .mockResolvedValueOnce({ status: 'EXPIRED', statusCode: 410, errorMessage: 'gone' })

    const response = await POST()

    expect(mocks.listPushSubscriptionsForUserIds).toHaveBeenCalledWith(expect.anything(), [
      'user-1'
    ])
    expect(mocks.sendToSubscription).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'a' },
      expect.objectContaining({ deliveryId: 'delivery-a' })
    )
    expect(mocks.recordDeliveryOutcome).toHaveBeenCalledTimes(2)
    await expect(response.json()).resolves.toEqual({
      deviceCount: 2,
      deliveredCount: 1,
      failedCount: 0,
      expiredCount: 1
    })
  })

  it('rejects anonymous requests', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const response = await POST()
    expect(response.status).toBe(401)
    expect(mocks.sendToSubscription).not.toHaveBeenCalled()
  })
})
