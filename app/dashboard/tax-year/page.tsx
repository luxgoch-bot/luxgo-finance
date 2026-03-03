import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TaxYearClient } from './tax-year-client'
import type { Profile, TaxYear, Income, Expense, MwstReport } from '@/types'

export default async function TaxYearPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('type')

  if (!profiles?.length) redirect('/setup')

  const profileIds  = profiles.map((p: Profile) => p.id)
  const currentYear = new Date().getFullYear()

  const [
    { data: incomeData },
    { data: expenseData },
    { data: taxYears },
    { data: mwstReports },
  ] = await Promise.all([
    supabase.from('income').select('*').in('profile_id', profileIds),
    supabase.from('expenses').select('*').in('profile_id', profileIds),
    supabase.from('tax_years').select('*').in('profile_id', profileIds).order('year', { ascending: false }),
    supabase.from('mwst_reports')
      .select('*, tax_years(year)')
      .in('profile_id', profileIds)
      .eq('status', 'submitted'),
  ])

  return (
    <TaxYearClient
      profiles={profiles as Profile[]}
      allIncome={(incomeData as Income[]) ?? []}
      allExpenses={(expenseData as Expense[]) ?? []}
      taxYears={(taxYears as TaxYear[]) ?? []}
      submittedMwst={(mwstReports as (MwstReport & { tax_years?: { year: number } })[]) ?? []}
      currentYear={currentYear}
    />
  )
}
