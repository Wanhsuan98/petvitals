import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatProfileSchema } from '@/lib/schemas'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  getCatProfile: vi.fn(),
  listInvitations: vi.fn(),
  acceptInvitation: vi.fn(),
  listDeliveries: vi.fn(),
  hasAccessibleCat: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`)
  })
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } })
}))
vi.mock('@/lib/data/cat-profile', () => ({ getCatProfile: mocks.getCatProfile }))
vi.mock('@/lib/data/pet-caregivers', () => ({
  listPendingInvitationsForUser: mocks.listInvitations,
  acceptCaregiverInvitation: mocks.acceptInvitation,
  hasAccessibleCat: mocks.hasAccessibleCat
}))
vi.mock('@/lib/data/push-deliveries', () => ({
  listRecentDeliveriesForUser: mocks.listDeliveries
}))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/components/push-subscribe-toggle', () => ({ PushSubscribeToggle: () => null }))
vi.mock('./refresh-notifications-button', () => ({ RefreshNotificationsButton: () => null }))

import { acceptCaregiverInvitationAction } from '@/lib/actions/caregiver-invitations'

import { DashboardHomeClient } from '../dashboard-home-client'
import NotificationsPage from './page'

const userId = '00000000-0000-4000-8000-000000000001'
const invitationId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: userId } } })
  mocks.getCatProfile.mockResolvedValue(null)
  mocks.listInvitations.mockResolvedValue([])
  mocks.hasAccessibleCat.mockResolvedValue(false)
  mocks.listDeliveries.mockResolvedValue([])
})

describe('notification center', () => {
  it('redirects unauthenticated users before querying invitations', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    await expect(NotificationsPage()).rejects.toThrow('redirect:/login')
    expect(mocks.listInvitations).not.toHaveBeenCalled()
  })

  it('allows users without a cat to see pending invitations', async () => {
    mocks.listInvitations.mockResolvedValue([
      {
        id: invitationId,
        petId: invitationId,
        userId,
        status: 'PENDING',
        invitedEmail: 'caregiver@example.com',
        invitedAt: '2026-10-05T00:00:00Z',
        catName: '小橘'
      }
    ])
    const html = renderToStaticMarkup(await NotificationsPage())
    expect(html).toContain('小橘')
    expect(html).toContain('接受邀請')
    expect(html).toContain('先建立貓咪資料或接受協作邀請')
    expect(mocks.listInvitations).toHaveBeenCalledWith(expect.anything(), userId)
  })

  it('shows an empty state without hiding device push settings', async () => {
    const html = renderToStaticMarkup(await NotificationsPage())
    expect(html).toContain('目前沒有待處理的協作邀請')
    expect(html).toContain('本裝置推播')
    expect(html).not.toContain('href="/settings/reminders"')
  })

  it('offers caregivers reminder viewing instead of owner management', async () => {
    mocks.getCatProfile.mockResolvedValue(
      CatProfileSchema.parse({
        id: invitationId,
        ownerId: invitationId,
        name: '小橘',
        birthYear: 2019,
        targetWeightKg: 4.2
      })
    )
    const html = renderToStaticMarkup(await NotificationsPage())
    expect(html).toContain('提醒由飼主設定')
    expect(html).toContain('href="/settings/reminders"')
  })

  it('shows the push delivery log empty state', async () => {
    const html = renderToStaticMarkup(await NotificationsPage())
    expect(html).toContain('最近推播紀錄')
    expect(html).toContain('還沒有推播紀錄')
  })

  it('keeps the page usable when the delivery log cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.listDeliveries.mockRejectedValue(new Error('offline'))
    const html = renderToStaticMarkup(await NotificationsPage())
    expect(html).toContain('暫時無法讀取推播紀錄')
    expect(html).toContain('本裝置推播')
  })

  it('propagates query failures to the route error boundary', async () => {
    mocks.listInvitations.mockRejectedValue(new Error('offline'))
    await expect(NotificationsPage()).rejects.toThrow('offline')
  })
})

describe('accepting invitations from the notification center', () => {
  it('refreshes notification and reminder data after a successful acceptance', async () => {
    const result = await acceptCaregiverInvitationAction({ status: 'idle' }, invitationId)
    expect(result.status).toBe('success')
    expect(mocks.acceptInvitation).toHaveBeenCalledWith(expect.anything(), invitationId)
    for (const path of ['/notifications', '/', '/settings', '/settings/reminders']) {
      expect(mocks.revalidatePath).toHaveBeenCalledWith(path)
    }
  })

  it('keeps a failed or withdrawn invitation from being reported as accepted', async () => {
    mocks.acceptInvitation.mockRejectedValue(new Error('邀請已撤回'))
    const result = await acceptCaregiverInvitationAction({ status: 'idle' }, invitationId)
    expect(result).toEqual({ status: 'error', message: '邀請已撤回' })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('rejects acceptance when the user already looks after a cat (single-cat mode)', async () => {
    mocks.hasAccessibleCat.mockResolvedValue(true)
    const result = await acceptCaregiverInvitationAction({ status: 'idle' }, invitationId)
    expect(result.status).toBe('error')
    expect(result.message).toContain('一個帳號只能照顧一隻貓')
    expect(mocks.hasAccessibleCat).toHaveBeenCalledWith(expect.anything(), userId)
    expect(mocks.acceptInvitation).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('does not attempt acceptance after the session expires', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    const result = await acceptCaregiverInvitationAction({ status: 'idle' }, invitationId)
    expect(result.status).toBe('error')
    expect(mocks.acceptInvitation).not.toHaveBeenCalled()
  })
})

describe('homepage notification badge', () => {
  const catProfile = CatProfileSchema.parse({
    id: invitationId,
    ownerId: userId,
    name: '小橘',
    birthYear: 2019,
    targetWeightKg: 4.2
  })

  it.each([0, 2, 100])(
    'announces the actual pending count %i and caps only the visual badge',
    (count) => {
      const html = renderToStaticMarkup(
        createElement(DashboardHomeClient, {
          catProfile,
          dailyCareLogs: [],
          pendingInvitationCount: count
        })
      )
      expect(html).toContain('href="/notifications"')
      expect(html).toContain(`通知中心，${count} 則待處理邀請`)
      if (count === 100) expect(html).toContain('99+')
      if (count === 0) expect(html).not.toContain('min-w-5')
    }
  )
})
