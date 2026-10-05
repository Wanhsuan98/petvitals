import { PageHeader } from '@/components/page-header'
import { requireCatProfile } from '@/lib/require-cat-profile'

import { NewBloodTestForm } from './new-blood-test-form'

export default async function NewBloodTestPage() {
  await requireCatProfile()

  return (
    <div className="space-y-4">
      <PageHeader title="新增血檢紀錄" backHref="/records" />
      <NewBloodTestForm />
    </div>
  )
}
