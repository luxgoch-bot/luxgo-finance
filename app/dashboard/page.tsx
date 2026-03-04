import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'
import type { Profile, Income, Expense, Loan, LoanRepayment } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('type', { ascending: true })

  if (!profiles || profiles.length === 0) redirect('/setup')

  const currentYear = new Date().getFullYear()
  const profileIds = profiles.map((p: Profile) => p.id)

  const [{ data: incomeData }, { data: expenseData }, { data: loansData }, { data: repaymentsData }] = await Promise.all([
    supabase.from('income').select('*').in('profile_id', profileIds)
      .gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`),
    supabase.from('expenses').select('*').in('profile_id', profileIds)
      .gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`),
    supabase.from('loans').select('*').in('profile_id', profileIds),
    supabase.from('loan_repayments').select('*').in('profile_id', profileIds).order('date'),
  ])

  return (
    <DashboardClient
      profiles={profiles as Profile[]}
      initialIncome={(incomeData as Income[]) ?? []}
      initialExpenses={(expenseData as Expense[]) ?? []}
      initialLoans={(loansData as Loan[]) ?? []}
      initialRepayments={(repaymentsData as LoanRepayment[]) ?? []}
      currentYear={currentYear}
    />
  )
}
