import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult = { data: unknown; error: { message: string } | null }

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  revalidatePath: vi.fn(),
  result: { data: null, error: null } as QueryResult,
  updatePayloads: [] as unknown[]
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => {
    const builder = {
      eq: () => builder,
      select: () => Promise.resolve(mocks.result)
    }
    return {
      auth: { getUser: mocks.getUser },
      from: () => ({
        update: (payload: unknown) => {
          mocks.updatePayloads.push(payload)
          return builder
        },
        delete: () => builder
      })
    }
  }
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { deleteDailyCareLogAction, updateDailyCareLogAction } from './edit-actions'

const recordId = '00000000-0000-4000-8000-000000000001'
const values = {
  weightKg: 4.1,
  subQFluidMl: 100,
  waterIntakeMl: 150,
  appetiteLevel: 'NORMAL' as const,
  vomitCount: 0
}
const row = {
  id: recordId,
  pet_id: '00000000-0000-4000-8000-000000000002',
  recorded_at: '2026-10-10T08:00:00+00:00',
  date: '2026-10-10',
  weight_kg: 4.1,
  sub_q_fluid_ml: 100,
  water_intake_ml: 150,
  appetite_level: 'NORMAL',
  vomit_count: 0,
  notes: null,
  created_at: '2026-10-10T08:00:00+00:00'
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.updatePayloads = []
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mocks.result = { data: [row], error: null }
})

describe('updateDailyCareLogAction', () => {
  it('only changes content: pet_id, recorded_at and date are never sent', async () => {
    const result = await updateDailyCareLogAction({ status: 'idle' }, { id: recordId, values })
    expect(result.status).toBe('success')
    const payload = mocks.updatePayloads[0] as Record<string, unknown>
    expect(payload).not.toHaveProperty('pet_id')
    expect(payload).not.toHaveProperty('recorded_at')
    expect(payload).not.toHaveProperty('date')
    for (const path of ['/log', '/', '/records']) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path)
    }
  })

  it('reports not found when RLS filters the row out instead of claiming success', async () => {
    mocks.result = { data: [], error: null }
    const result = await updateDailyCareLogAction({ status: 'idle' }, { id: recordId, values })
    expect(result.status).toBe('error')
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects out-of-range values before touching the database', async () => {
    const result = await updateDailyCareLogAction(
      { status: 'idle' },
      { id: recordId, values: { ...values, subQFluidMl: 9999 } }
    )
    expect(result.status).toBe('error')
    expect(mocks.updatePayloads).toHaveLength(0)
  })
})

describe('deleteDailyCareLogAction', () => {
  it('deletes and refreshes every page that shows the log', async () => {
    mocks.result = { data: [{ id: recordId }], error: null }
    const result = await deleteDailyCareLogAction({ status: 'idle' }, recordId)
    expect(result.status).toBe('success')
    for (const path of ['/log', '/', '/records']) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path)
    }
  })

  it('reports not found when nothing was deleted', async () => {
    mocks.result = { data: [], error: null }
    const result = await deleteDailyCareLogAction({ status: 'idle' }, recordId)
    expect(result.status).toBe('error')
  })

  it('hides raw database errors from the client but keeps them in the server log', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.result = { data: null, error: { message: 'permission denied for table daily_care_logs' } }
    const result = await deleteDailyCareLogAction({ status: 'idle' }, recordId)
    expect(result).toEqual({ status: 'error', message: '刪除失敗，請稍後再試' })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('requires a logged-in user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const result = await deleteDailyCareLogAction({ status: 'idle' }, recordId)
    expect(result.status).toBe('error')
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
