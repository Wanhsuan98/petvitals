import { requireCatProfile } from '@/lib/require-cat-profile'

import { NewBloodTestForm } from './new-blood-test-form'

export default async function NewBloodTestPage() {
  await requireCatProfile()

  return (
    <div className="space-y-4">
      <NewBloodTestForm />
    </div>
  )
}
