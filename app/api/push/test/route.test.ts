import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  sendPushToUsers: vi.fn()
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } })
}))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => ({}) }))
vi.mock('@/lib/push/send', () => ({ sendPushToUsers: mocks.sendPushToUsers }))

import { POST } from './route'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('POST /api/push/test', () => {
  it('only sends to the signed-in user and returns the delivery counts', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const counts = { deviceCount: 2, deliveredCount: 1, failedCount: 0, expiredCount: 1 }
    mocks.sendPushToUsers.mockResolvedValue(counts)

    const response = await POST()
    expect(mocks.sendPushToUsers).toHaveBeenCalledWith(
      expect.anything(),
      ['user-1'],
      expect.anything()
    )
    await expect(response.json()).resolves.toEqual(counts)
  })

  it('rejects anonymous requests', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const response = await POST()
    expect(response.status).toBe(401)
    expect(mocks.sendPushToUsers).not.toHaveBeenCalled()
  })
})
