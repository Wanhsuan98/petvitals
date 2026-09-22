import { redirect } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getOwnedCatProfile } from '@/lib/data/cat-profile'
import { listCaregiversForPet } from '@/lib/data/pet-caregivers'
import { MAX_CAREGIVERS_PER_PET } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

import { CaregiverInviteForm } from './caregiver-invite-form'
import { CaregiverList } from './caregiver-list'

// 只有飼主本人能管理協作者；協作者或還沒有貓的使用者導回 /settings
export default async function CaregiversPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const catProfile = await getOwnedCatProfile(supabase, user.id)
  if (!catProfile) {
    redirect('/settings')
  }

  const caregivers = await listCaregiversForPet(supabase, catProfile.id)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>邀請協作者</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            每隻貓最多 {MAX_CAREGIVERS_PER_PET} 位協作者（含飼主本人）。對方需要先註冊/登入
            PetVitals，才能用同一個 email 被邀請。
          </p>
          <CaregiverInviteForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>目前的協作者</CardTitle>
        </CardHeader>
        <CardContent>
          <CaregiverList caregivers={caregivers} />
        </CardContent>
      </Card>
    </div>
  )
}
