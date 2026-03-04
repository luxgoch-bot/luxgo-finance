import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { LoansClient } from './loans-client'
import type { Profile, Loan, LoanRepayment, TaxYear } from '@/types'

export default async function LoansPage() {
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
  const currentYear = new Date().getFullYear()

  const [{ data: loans }, { data: repayments }, { data: taxYears }] = await Promise.all([
    supabase.from('loans').select('*').in('profile_id', profileIds).order('created_at', { ascending: false }),
    supabase.from('loan_repayments').select('*').in('profile_id', profileIds).order('date', { ascending: false }),
    supabase.from('tax_years').select('*').in('profile_id', profileIds).order('year', { ascending: false }),
  ])

  return (
    <LoansClient
      profiles={profiles as Profile[]}
      loans={(loans ?? []) as Loan[]}
      repayments={(repayments ?? []) as LoanRepayment[]}
      taxYears={(taxYears ?? []) as TaxYear[]}
      currentYear={currentYear}
    />
  )
}
