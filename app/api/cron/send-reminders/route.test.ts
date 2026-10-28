import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listDueReminders: vi.fn(),
  markReminderSentToday: vi.fn(),
  listCaregiversForPet: vi.fn(),
  listPushSubscriptionsForUserIds: vi.fn(),
  claimReminderDelivery: vi.fn(),
  recordDeliveryOutcome: vi.fn(),
  deleteDeliveriesBefore: vi.fn(),
  sendToSubscription: vi.fn()
}))

vi.mock('@/lib/push/env', () => ({ getCronSecret: () => 'test-secret' }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => ({}) }))
vi.mock('@/lib/data/reminder-schedules', () => ({
  listDueReminders: mocks.listDueReminders,
  markReminderSentToday: mocks.markReminderSentToday
}))
vi.mock('@/lib/data/pet-caregivers', () => ({ listCaregiversForPet: mocks.listCaregiversForPet }))
vi.mock('@/lib/data/push-subscriptions', () => ({
  listPushSubscriptionsForUserIds: mocks.listPushSubscriptionsForUserIds
}))
vi.mock('@/lib/data/push-deliveries', () => ({
  claimReminderDelivery: mocks.claimReminderDelivery,
  recordDeliveryOutcome: mocks.recordDeliveryOutcome,
  deleteDeliveriesBefore: mocks.deleteDeliveriesBefore
}))
vi.mock('@/lib/push/send', () => ({ sendToSubscription: mocks.sendToSubscription }))

import { GET } from './route'

const ownerId = '00000000-0000-4000-8000-000000000003'
const caregiverId = '00000000-0000-4000-8000-000000000004'
const reminder = {
  id: '00000000-0000-4000-8000-000000000001',
  petId: '00000000-0000-4000-8000-000000000002',
  ownerId,
  petName: '小橘',
  type: 'FLUID',
  label: '皮下輸液',
  lastSentOn: null
}
const phone = { id: 'sub-phone', userId: ownerId, endpoint: 'https://web.push.apple.com/a' }
const tablet = { id: 'sub-tablet', userId: ownerId, endpoint: 'https://web.push.apple.com/b' }

const delivered = { status: 'DELIVERED', statusCode: 201, errorMessage: null }
const failed = { status: 'FAILED', statusCode: 403, errorMessage: '{"reason":"BadJwtToken"}' }

function request(secret = 'test-secret') {
  return new NextRequest('http://localhost/api/cron/send-reminders', {
    headers: { authorization: `Bearer ${secret}` }
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.listDueReminders.mockResolvedValue([reminder])
  mocks.listCaregiversForPet.mockResolvedValue([])
  mocks.listPushSubscriptionsForUserIds.mockResolvedValue([phone, tablet])
  mocks.claimReminderDelivery.mockImplementation(
    async (_client: unknown, { subscription }: { subscription: { id: string } }) => ({
      deliveryId: `delivery-${subscription.id}`,
      attemptCount: 1
    })
  )
})

describe('send-reminders cron', () => {
  it('records each device separately and includes the delivery id in the payload', async () => {
    mocks.sendToSubscription.mockResolvedValueOnce(delivered).mockResolvedValueOnce(failed)

    const body = await (await GET(request())).json()

    expect(mocks.recordDeliveryOutcome).toHaveBeenCalledWith(
      expect.anything(),
      'delivery-sub-phone',
      delivered
    )
    expect(mocks.recordDeliveryOutcome).toHaveBeenCalledWith(
      expect.anything(),
      'delivery-sub-tablet',
      failed
    )
    expect(mocks.sendToSubscription).toHaveBeenCalledWith(
      expect.anything(),
      phone,
      expect.objectContaining({ deliveryId: 'delivery-sub-phone' })
    )
    expect(body).toMatchObject({ delivered: 1, failed: 1, expired: 0, skipped: 0 })
    expect(body.results[0]).toMatchObject({ reminderId: reminder.id, deviceCount: 2 })
  })

  it('does not resend to a device that already received it, but retries the failed one', async () => {
    // 第一台今天已送達（搶不到投遞權），第二台之前失敗、這次重新搶到
    mocks.claimReminderDelivery
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ deliveryId: 'delivery-sub-tablet', attemptCount: 2 })
    mocks.sendToSubscription.mockResolvedValue(delivered)

    const body = await (await GET(request())).json()

    expect(mocks.sendToSubscription).toHaveBeenCalledTimes(1)
    expect(mocks.sendToSubscription).toHaveBeenCalledWith(
      expect.anything(),
      tablet,
      expect.anything()
    )
    expect(body).toMatchObject({ delivered: 1, skipped: 1 })
  })

  it('sends to accepted caregivers as well as the owner', async () => {
    mocks.listCaregiversForPet.mockResolvedValue([
      { userId: caregiverId, status: 'ACCEPTED' },
      { userId: 'pending-user', status: 'PENDING' }
    ])
    mocks.sendToSubscription.mockResolvedValue(delivered)

    await GET(request())

    expect(mocks.listPushSubscriptionsForUserIds).toHaveBeenCalledWith(expect.anything(), [
      ownerId,
      caregiverId
    ])
  })

  it('updates the last_sent_on summary only when a device was delivered', async () => {
    mocks.sendToSubscription.mockResolvedValue(failed)
    await GET(request())
    expect(mocks.markReminderSentToday).not.toHaveBeenCalled()

    mocks.sendToSubscription.mockResolvedValue(delivered)
    await GET(request())
    expect(mocks.markReminderSentToday).toHaveBeenCalledTimes(1)
  })

  it('keeps processing other devices when one device hits a database error', async () => {
    mocks.claimReminderDelivery
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce({ deliveryId: 'delivery-sub-tablet', attemptCount: 1 })
    mocks.sendToSubscription.mockResolvedValue(delivered)

    const body = await (await GET(request())).json()

    expect(body).toMatchObject({ delivered: 1, failed: 1 })
  })

  it('rejects requests without the shared secret', async () => {
    const response = await GET(request('wrong'))
    expect(response.status).toBe(401)
    expect(mocks.listDueReminders).not.toHaveBeenCalled()
  })
})
