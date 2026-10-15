import { isValidElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatProfileSchema } from '@/lib/schemas'

const mocks = vi.hoisted(() => ({
  requireCatProfile: vi.fn(),
  listDailyCareLogs: vi.fn(),
  countPendingInvitations: vi.fn()
}))

vi.mock('@/lib/require-cat-profile', () => ({ requireCatProfile: mocks.requireCatProfile }))
vi.mock('@/lib/data/daily-care-logs', () => ({ listDailyCareLogs: mocks.listDailyCareLogs }))
vi.mock('@/lib/data/pet-caregivers', () => ({
  countPendingInvitationsForUser: mocks.countPendingInvitations
}))
vi.mock('./dashboard-home-client', () => ({ DashboardHomeClient: () => null }))

import DashboardHomePage from './page'

const userId = '00000000-0000-4000-8000-000000000001'
const catProfile = CatProfileSchema.parse({
  id: '00000000-0000-4000-8000-000000000002',
  ownerId: userId,
  name: '小橘',
  birthYear: 2019,
  targetWeightKg: 4.2
})

async function renderedProps() {
  const element = await DashboardHomePage()
  if (!isValidElement<{ pendingInvitationCount: number }>(element)) {
    throw new Error('首頁應回傳 React element')
  }
  return element.props
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireCatProfile.mockResolvedValue({ supabase: {}, catProfile, userId })
  mocks.listDailyCareLogs.mockResolvedValue([])
  mocks.countPendingInvitations.mockResolvedValue(0)
})

describe('dashboard home page', () => {
  it('passes the real pending invitation count to the notification badge', async () => {
    mocks.countPendingInvitations.mockResolvedValue(3)
    expect((await renderedProps()).pendingInvitationCount).toBe(3)
    expect(mocks.countPendingInvitations).toHaveBeenCalledWith(expect.anything(), userId)
  })

  it('still renders the dashboard when the badge query fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.countPendingInvitations.mockRejectedValue(new Error('infinite recursion in policy'))

    expect((await renderedProps()).pendingInvitationCount).toBe(0)
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('does not swallow failures of the care log query that the dashboard depends on', async () => {
    mocks.listDailyCareLogs.mockRejectedValue(new Error('offline'))
    await expect(DashboardHomePage()).rejects.toThrow('offline')
  })
})
