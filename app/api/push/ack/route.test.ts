import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ acknowledgeDelivery: vi.fn() }))

vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => ({}) }))
vi.mock('@/lib/data/push-deliveries', () => ({ acknowledgeDelivery: mocks.acknowledgeDelivery }))

import { POST } from './route'

const deliveryId = '00000000-0000-4000-8000-000000000001'

function request(body: unknown) {
  return new NextRequest('http://localhost/api/push/ack', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body)
  })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('POST /api/push/ack', () => {
  it('records that the device received the push', async () => {
    const response = await POST(request({ deliveryId }))
    expect(response.status).toBe(204)
    expect(mocks.acknowledgeDelivery).toHaveBeenCalledWith(expect.anything(), deliveryId)
  })

  it.each([[{ deliveryId: 'not-a-uuid' }], [{}], ['not json']])(
    'ignores malformed bodies without touching the database: %j',
    async (body) => {
      const response = await POST(request(body))
      expect(response.status).toBe(204)
      expect(mocks.acknowledgeDelivery).not.toHaveBeenCalled()
    }
  )

  it('still answers 204 when the database write fails, so the device does not retry forever', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.acknowledgeDelivery.mockRejectedValue(new Error('db down'))
    const response = await POST(request({ deliveryId }))
    expect(response.status).toBe(204)
  })
})
