import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { AccountDetailClient } from './account-detail-client'
import type { Profile, InvestmentAccount, InvestmentTransaction, InvestmentHolding, TaxYear } from '@/types'

export default async function AccountDetailPage({ params }: { params: { account_id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase.from('profiles').select('*').eq('user_id', user.id)
  if (!profiles?.length) redirect('/setup')

  const profileIds = profiles.map((p: Profile) => p.id)

  const [{ data: account }, { data: transactions }, { data: holdings }, { data: taxYears }] = await Promise.all([
    supabase.from('investment_accounts').select('*').eq('id', params.account_id).single(),
    supabase.from('investment_transactions').select('*').eq('account_id', params.account_id).order('date', { ascending: false }),
    supabase.from('investment_holdings').select('*').eq('account_id', params.account_id),
    supabase.from('tax_years').select('*').in('profile_id', profileIds).order('year', { ascending: false }),
  ])

  if (!account) redirect('/dashboard/investments')

  return (
    <AccountDetailClient
      profiles={profiles as Profile[]}
      account={account as InvestmentAccount}
      transactions={(transactions ?? []) as InvestmentTransaction[]}
      holdings={(holdings ?? []) as InvestmentHolding[]}
      taxYears={(taxYears ?? []) as TaxYear[]}
    />
  )
}