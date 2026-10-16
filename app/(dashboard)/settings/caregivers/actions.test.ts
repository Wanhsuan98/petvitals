import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatProfileSchema } from '@/lib/schemas'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  getOwnedCatProfile: vi.fn(),
  countActiveCaregiverSeats: vi.fn(),
  findUserIdByEmail: vi.fn(),
  hasAccessibleCat: vi.fn(),
  createCaregiverInvitation: vi.fn(),
  revalidatePath: vi.fn()
}))

const serviceRoleClient = { kind: 'service-role' }

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } })
}))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => serviceRoleClient }))
vi.mock('@/lib/data/cat-profile', () => ({ getOwnedCatProfile: mocks.getOwnedCatProfile }))
vi.mock('@/lib/data/pet-caregivers', () => ({
  CaregiverAlreadyInvitedError: class extends Error {},
  CaregiverCapReachedError: class extends Error {},
  countActiveCaregiverSeats: mocks.countActiveCaregiverSeats,
  createCaregiverInvitation: mocks.createCaregiverInvitation,
  findUserIdByEmail: mocks.findUserIdByEmail,
  hasAccessibleCat: mocks.hasAccessibleCat,
  removeCaregiver: vi.fn()
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { inviteCaregiverAction } from './actions'

const ownerId = '00000000-0000-4000-8000-000000000001'
const inviteeId = '00000000-0000-4000-8000-000000000002'
const catId = '00000000-0000-4000-8000-000000000003'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: ownerId } } })
  mocks.getOwnedCatProfile.mockResolvedValue(
    CatProfileSchema.parse({
      id: catId,
      ownerId,
      name: '小橘',
      birthYear: 2019,
      targetWeightKg: 4.2
    })
  )
  mocks.countActiveCaregiverSeats.mockResolvedValue(0)
  mocks.findUserIdByEmail.mockResolvedValue(inviteeId)
  mocks.hasAccessibleCat.mockResolvedValue(false)
})

describe('inviting a caregiver in single-cat mode', () => {
  it('rejects invitees who already look after a cat, checked with the service-role client', async () => {
    mocks.hasAccessibleCat.mockResolvedValue(true)
    const result = await inviteCaregiverAction({ status: 'idle' }, 'b@example.com')
    expect(result.status).toBe('error')
    expect(result.message).toContain('一個帳號只能照顧一隻貓')
    expect(mocks.hasAccessibleCat).toHaveBeenCalledWith(serviceRoleClient, inviteeId)
    expect(mocks.createCaregiverInvitation).not.toHaveBeenCalled()
  })

  it('creates the invitation when the invitee has no cat yet', async () => {
    const result = await inviteCaregiverAction({ status: 'idle' }, 'b@example.com')
    expect(result.status).toBe('success')
    expect(mocks.createCaregiverInvitation).toHaveBeenCalledWith(expect.anything(), {
      petId: catId,
      userId: inviteeId,
      invitedEmail: 'b@example.com'
    })
  })
})
