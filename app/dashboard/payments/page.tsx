import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { PaymentsClient } from './payments-client'
import type { Profile, Payment } from '@/types'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('type')

  if (!profiles?.length) redirect('/setup')

  const profileIds = profiles.map((p: Profile) => p.id)

  try {
    // Fetch payment events from the database
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .in('profile_id', profileIds)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return (
      <PaymentsClient 
        payments={payments as Payment[]} 
      />
    )
  } catch (error) {
    console.error('Error fetching payments:', error)
    // Return empty page on error
    return (
      <PaymentsClient 
        payments={[]} 
      />
    )
  }
}