import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatProfileSchema } from '@/lib/schemas'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  getCatProfile: vi.fn(),
  saveCatProfile: vi.fn(),
  revalidatePath: vi.fn()
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } })
}))
vi.mock('@/lib/data/cat-profile', () => ({
  getCatProfile: mocks.getCatProfile,
  saveCatProfile: mocks.saveCatProfile
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

import { saveCatProfileAction } from './actions'

const userId = '00000000-0000-4000-8000-000000000001'
const otherOwnerId = '00000000-0000-4000-8000-000000000002'
const input = { name: '小橘', birthYear: 2019, targetWeightKg: 4.2 }

function catOwnedBy(ownerId: string) {
  return CatProfileSchema.parse({
    id: '00000000-0000-4000-8000-000000000003',
    ownerId,
    ...input
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: userId } } })
})

describe('saving a cat profile in single-cat mode', () => {
  it('blocks caregivers from creating their own cat', async () => {
    mocks.getCatProfile.mockResolvedValue(catOwnedBy(otherOwnerId))
    const result = await saveCatProfileAction(
      { status: 'idle' },
      CatProfileSchema.omit({ id: true, ownerId: true, createdAt: true }).parse(input)
    )
    expect(result.status).toBe('error')
    expect(mocks.saveCatProfile).not.toHaveBeenCalled()
  })

  it.each([
    ['a new user', null],
    ['the owner editing their cat', catOwnedBy(userId)]
  ])('lets %s save', async (_label, currentCat) => {
    mocks.getCatProfile.mockResolvedValue(currentCat)
    const result = await saveCatProfileAction(
      { status: 'idle' },
      CatProfileSchema.omit({ id: true, ownerId: true, createdAt: true }).parse(input)
    )
    expect(result.status).toBe('success')
    expect(mocks.saveCatProfile).toHaveBeenCalled()
  })
})
