import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { InvestmentsClient } from './investments-client'
import type { Profile, TaxYear, InvestmentAccount, InvestmentTransaction, InvestmentHolding } from '@/types'

export default async function InvestmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles').select('*').eq('user_id', user.id).order('type')
  if (!profiles?.length) redirect('/setup')

  const profileIds = profiles.map((p: Profile) => p.id)

  const [
    { data: accounts },
    { data: transactions },
    { data: holdings },
    { data: taxYears },
  ] = await Promise.all([
    supabase.from('investment_accounts').select('*').in('profile_id', profileIds).order('created_at', { ascending: false }),
    supabase.from('investment_transactions').select('*').in('profile_id', profileIds).order('date', { ascending: false }),
    supabase.from('investment_holdings').select('*').in('profile_id', profileIds),
    supabase.from('tax_years').select('*').in('profile_id', profileIds).order('year', { ascending: false }),
  ])

  return (
    <InvestmentsClient
      profiles={profiles as Profile[]}
      accounts={(accounts ?? []) as InvestmentAccount[]}
      transactions={(transactions ?? []) as InvestmentTransaction[]}
      holdings={(holdings ?? []) as InvestmentHolding[]}
      taxYears={(taxYears ?? []) as TaxYear[]}
    />
  )
}