import { notFound } from 'next/navigation'
import { z } from 'zod'

import { PageHeader } from '@/components/page-header'
import { getBloodTest } from '@/lib/data/blood-tests'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { BloodTestForm } from '../../blood-test-form'

export default async function EditBloodTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, catProfile } = await requireCatProfile()

  if (!z.string().uuid().safeParse(id).success) notFound()

  const bloodTest = await getBloodTest(supabase, id)
  // RLS 已經擋掉別人的貓，這裡再比對一次是避免網址帶到「自己有權限但不是目前這隻貓」的紀錄
  if (!bloodTest || bloodTest.petId !== catProfile.id) notFound()

  return (
    <div className="space-y-4">
      <PageHeader title="編輯血檢紀錄" backHref="/records" />
      <BloodTestForm bloodTest={bloodTest} />
    </div>
  )
}
