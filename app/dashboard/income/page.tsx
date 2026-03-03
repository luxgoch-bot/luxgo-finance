import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { IncomeClient } from './income-client'
import type { Profile, TaxYear, Income } from '@/types'

export default async function IncomePage() {
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

  const [{ data: incomeData }, { data: taxYears }] = await Promise.all([
    supabase
      .from('income')
      .select('*')
      .in('profile_id', profileIds)
      .order('date', { ascending: false }),
    supabase
      .from('tax_years')
      .select('*')
      .in('profile_id', profileIds)
      .order('year', { ascending: false }),
  ])

  return (
    <IncomeClient
      profiles={profiles as Profile[]}
      incomeRecords={(incomeData as Income[]) ?? []}
      taxYears={(taxYears as TaxYear[]) ?? []}
    />
  )
}
