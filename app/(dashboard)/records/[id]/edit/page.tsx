import { notFound } from 'next/navigation'
import { z } from 'zod'

import { PageHeader } from '@/components/page-header'
import { getBloodTest } from '@/lib/data/blood-tests'
import { parseRecordsPeriod } from '@/lib/records-period'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { BloodTestForm } from '../../blood-test-form'

export default async function EditBloodTestPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ range?: string | string[] }>
}) {
  const { id } = await params
  // 紀錄頁的時間篩選：返回與儲存後都回到同一個範圍。只接受合法的篩選值，
  // 不把網址參數原樣拼回去，避免被塞入其他路徑或參數
  const { range } = await searchParams
  const recordsHref = `/records?range=${parseRecordsPeriod(typeof range === 'string' ? range : null)}`
  const { supabase, catProfile } = await requireCatProfile()

  if (!z.string().uuid().safeParse(id).success) notFound()

  const bloodTest = await getBloodTest(supabase, id)
  // RLS 已經擋掉別人的貓，這裡再比對一次是避免網址帶到「自己有權限但不是目前這隻貓」的紀錄
  if (!bloodTest || bloodTest.petId !== catProfile.id) notFound()

  return (
    <div className="space-y-4">
      <PageHeader title="編輯血檢紀錄" backHref={recordsHref} />
      <BloodTestForm bloodTest={bloodTest} returnHref={recordsHref} />
    </div>
  )
}
