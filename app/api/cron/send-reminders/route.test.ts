import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listDueReminders: vi.fn(),
  markReminderSentToday: vi.fn(),
  listCaregiversForPet: vi.fn(),
  sendPushToUsers: vi.fn()
}))

vi.mock('@/lib/push/env', () => ({ getCronSecret: () => 'test-secret' }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => ({}) }))
vi.mock('@/lib/data/reminder-schedules', () => ({
  listDueReminders: mocks.listDueReminders,
  markReminderSentToday: mocks.markReminderSentToday
}))
vi.mock('@/lib/data/pet-caregivers', () => ({ listCaregiversForPet: mocks.listCaregiversForPet }))
vi.mock('@/lib/push/send', () => ({ sendPushToUsers: mocks.sendPushToUsers }))

import { GET } from './route'

const reminder = {
  id: '00000000-0000-4000-8000-000000000001',
  petId: '00000000-0000-4000-8000-000000000002',
  ownerId: '00000000-0000-4000-8000-000000000003',
  petName: '小橘',
  type: 'FLUID',
  label: '皮下輸液',
  lastSentOn: null
}

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
})

describe('send-reminders cron', () => {
  it('marks the reminder sent when at least one device accepted the push', async () => {
    mocks.sendPushToUsers.mockResolvedValue({
      deviceCount: 2,
      deliveredCount: 1,
      failedCount: 1,
      expiredCount: 0
    })
    const body = await (await GET(request())).json()
    expect(mocks.markReminderSentToday).toHaveBeenCalledTimes(1)
    expect(body).toMatchObject({ sent: 1, delivered: 1, failed: 1, expired: 0 })
  })

  it('does not mark the reminder sent when every device failed, so the next trigger retries', async () => {
    mocks.sendPushToUsers.mockResolvedValue({
      deviceCount: 1,
      deliveredCount: 0,
      failedCount: 1,
      expiredCount: 0
    })
    const body = await (await GET(request())).json()
    expect(mocks.markReminderSentToday).not.toHaveBeenCalled()
    expect(body).toMatchObject({ sent: 0, delivered: 0, failed: 1 })
    expect(body.results[0]).toMatchObject({ reminderId: reminder.id, isMarkedSent: false })
  })

  it('does not mark the reminder sent when nobody has a subscribed device', async () => {
    mocks.sendPushToUsers.mockResolvedValue({
      deviceCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      expiredCount: 0
    })
    await GET(request())
    expect(mocks.markReminderSentToday).not.toHaveBeenCalled()
  })

  it('skips reminders already sent today', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
    mocks.listDueReminders.mockResolvedValue([{ ...reminder, lastSentOn: today }])
    await GET(request())
    expect(mocks.sendPushToUsers).not.toHaveBeenCalled()
  })

  it('rejects requests without the shared secret', async () => {
    const response = await GET(request('wrong'))
    expect(response.status).toBe(401)
    expect(mocks.listDueReminders).not.toHaveBeenCalled()
  })
})
