'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import type { ProfileType } from '@/types'

/**
 * Initial setup: creates the default business + one personal profile.
 * Called from the setup wizard on first login.
 */
export async function createProfiles() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if any profiles already exist (idempotent)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (existing && existing.length > 0) {
    redirect('/dashboard')
  }

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

/**
 * Add an additional personal profile to an existing account.
 */
export async function addPersonalProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const name = (formData.get('name') as string)?.trim()
  const canton = (formData.get('canton') as string) || 'ZH'

  if (!name) return { error: 'Name is required' }

  // Prevent duplicates for this user
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name)
    .limit(1)

  if (existing && existing.length > 0) {
    return { error: `Profile "${name}" already exists` }
  }

  const { error } = await supabase.from('profiles').insert({
    user_id: user.id,
    type: 'personal' as ProfileType,
    name,
    canton,
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
