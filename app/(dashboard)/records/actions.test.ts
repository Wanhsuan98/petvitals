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

import { deleteBloodTestAction, updateBloodTestAction } from './actions'

const recordId = '00000000-0000-4000-8000-000000000001'
const values = { testDate: '2026-10-10', bun: 30, creatinine: 2.1, phosphorus: 4.4 }
const row = {
  id: recordId,
  pet_id: '00000000-0000-4000-8000-000000000002',
  test_date: '2026-10-10',
  hospital_name: null,
  bun: 30,
  creatinine: 2.1,
  sdma: null,
  phosphorus: 4.4,
  hct: null,
  notes: null,
  created_at: '2026-10-10T00:00:00+00:00'
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.updatePayloads = []
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mocks.result = { data: [row], error: null }
})

describe('updateBloodTestAction', () => {
  it('saves the edit, never sends pet_id, and refreshes the records page', async () => {
    const result = await updateBloodTestAction({ status: 'idle' }, { id: recordId, values })
    expect(result.status).toBe('success')
    expect(mocks.updatePayloads[0]).not.toHaveProperty('pet_id')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/records')
  })

  it('reports not found when RLS filters the row out instead of claiming success', async () => {
    mocks.result = { data: [], error: null }
    const result = await updateBloodTestAction({ status: 'idle' }, { id: recordId, values })
    expect(result.status).toBe('error')
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects invalid input before touching the database', async () => {
    const result = await updateBloodTestAction({ status: 'idle' }, { id: 'not-a-uuid', values })
    expect(result.status).toBe('error')
    expect(mocks.updatePayloads).toHaveLength(0)
  })

  it('requires a logged-in user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const result = await updateBloodTestAction({ status: 'idle' }, { id: recordId, values })
    expect(result.status).toBe('error')
    expect(mocks.updatePayloads).toHaveLength(0)
  })
})

describe('deleteBloodTestAction', () => {
  it('deletes and refreshes the records page', async () => {
    mocks.result = { data: [{ id: recordId }], error: null }
    const result = await deleteBloodTestAction({ status: 'idle' }, recordId)
    expect(result.status).toBe('success')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/records')
  })

  it('reports not found when nothing was deleted', async () => {
    mocks.result = { data: [], error: null }
    const result = await deleteBloodTestAction({ status: 'idle' }, recordId)
    expect(result.status).toBe('error')
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('hides raw database errors from the client but keeps them in the server log', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.result = { data: null, error: { message: 'permission denied for table blood_tests' } }
    const result = await deleteBloodTestAction({ status: 'idle' }, recordId)
    expect(result).toEqual({ status: 'error', message: '刪除失敗，請稍後再試' })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
