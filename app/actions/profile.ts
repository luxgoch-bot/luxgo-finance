'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { ProfileType } from '@/types'

export async function createProfiles() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Create both profiles: LuxGo GmbH (business) + Dejan (personal)
  const { error } = await supabase.from('profiles').insert([
    {
      user_id: user.id,
      type: 'business' as ProfileType,
      name: 'LuxGo GmbH',
      uid_mwst: '',
      address: '',
      canton: 'ZH',
    },
    {
      user_id: user.id,
      type: 'personal' as ProfileType,
      name: 'Dejan',
      canton: 'ZH',
    },
  ])

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
