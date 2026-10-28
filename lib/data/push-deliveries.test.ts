import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'

import type { PushSubscriptionRecord } from '@/lib/schemas'

import { claimReminderDelivery } from './push-deliveries'

type QueryResult = { data: unknown; error: { message: string } | null }

// 依呼叫順序回傳預先排好的結果；每個查詢都是「一串方法 + await」，所以每次 await 消耗一個結果
function createFakeSupabase(results: QueryResult[]) {
  const calls: { method: string; args: unknown[] }[] = []
  const queue = [...results]
  const builder: Record<string, unknown> = {}
  for (const method of ['upsert', 'select', 'eq', 'update', 'maybeSingle']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  }
  builder.then = (resolve: (value: QueryResult) => void) =>
    resolve(queue.shift() ?? { data: null, error: null })
  const supabase = { from: () => builder } as unknown as SupabaseClient
  return { supabase, calls }
}

const subscription: PushSubscriptionRecord = {
  id: '00000000-0000-4000-8000-000000000010',
  userId: '00000000-0000-4000-8000-000000000011',
  endpoint: 'https://web.push.apple.com/abc',
  p256dh: 'key',
  auth: 'auth',
  createdAt: '2026-10-15T06:15:30.000Z'
}
const input = {
  reminderId: '00000000-0000-4000-8000-000000000012',
  subscription,
  sentOn: '2026-10-28'
}
const recent = new Date().toISOString()

describe('claimReminderDelivery', () => {
  it('claims a device the first time today without storing the full endpoint', async () => {
    const { supabase, calls } = createFakeSupabase([{ data: [{ id: 'd1' }], error: null }])
    await expect(claimReminderDelivery(supabase, input)).resolves.toEqual({
      deliveryId: 'd1',
      attemptCount: 1
    })
    const inserted = calls.find((call) => call.method === 'upsert')?.args[0] as Record<
      string,
      unknown
    >
    expect(inserted).toMatchObject({ endpoint_host: 'web.push.apple.com', kind: 'REMINDER' })
    expect(JSON.stringify(inserted)).not.toContain('/abc')
  })

  it('does not resend to a device that was already delivered today', async () => {
    const { supabase } = createFakeSupabase([
      { data: [], error: null },
      { data: { id: 'd1', status: 'DELIVERED', attempt_count: 1, updated_at: recent }, error: null }
    ])
    await expect(claimReminderDelivery(supabase, input)).resolves.toBeNull()
  })

  it('does not resend while another trigger is still sending', async () => {
    const { supabase } = createFakeSupabase([
      { data: [], error: null },
      { data: { id: 'd1', status: 'SENDING', attempt_count: 1, updated_at: recent }, error: null }
    ])
    await expect(claimReminderDelivery(supabase, input)).resolves.toBeNull()
  })

  it('retries a failed device and counts the attempt', async () => {
    const { supabase, calls } = createFakeSupabase([
      { data: [], error: null },
      { data: { id: 'd1', status: 'FAILED', attempt_count: 2, updated_at: recent }, error: null },
      { data: [{ id: 'd1' }], error: null }
    ])
    await expect(claimReminderDelivery(supabase, input)).resolves.toEqual({
      deliveryId: 'd1',
      attemptCount: 3
    })
    // 條件式 update：狀態與次數都沒變才更新，兩次觸發重疊時只有一次會搶到
    const eqArgs = calls.filter((call) => call.method === 'eq').map((call) => call.args)
    expect(eqArgs).toContainEqual(['status', 'FAILED'])
    expect(eqArgs).toContainEqual(['attempt_count', 2])
  })

  it('gives up when an overlapping trigger claimed the retry first', async () => {
    const { supabase } = createFakeSupabase([
      { data: [], error: null },
      { data: { id: 'd1', status: 'FAILED', attempt_count: 1, updated_at: recent }, error: null },
      { data: [], error: null }
    ])
    await expect(claimReminderDelivery(supabase, input)).resolves.toBeNull()
  })

  it('reclaims a send that was interrupted more than two minutes ago', async () => {
    const stale = new Date(Date.now() - 5 * 60_000).toISOString()
    const { supabase } = createFakeSupabase([
      { data: [], error: null },
      { data: { id: 'd1', status: 'SENDING', attempt_count: 1, updated_at: stale }, error: null },
      { data: [{ id: 'd1' }], error: null }
    ])
    await expect(claimReminderDelivery(supabase, input)).resolves.toEqual({
      deliveryId: 'd1',
      attemptCount: 2
    })
  })
})
