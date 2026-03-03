import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'
import type { Profile, Income, Expense } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('type', { ascending: true }) // business first

  if (!profiles || profiles.length === 0) redirect('/setup')

  const currentYear = new Date().getFullYear()

  // Load all income + expenses for current year across all profiles
  const profileIds = profiles.map((p: Profile) => p.id)

  const [{ data: incomeData }, { data: expenseData }] = await Promise.all([
    supabase
      .from('income')
      .select('*')
      .in('profile_id', profileIds)
      .gte('date', `${currentYear}-01-01`)
      .lte('date', `${currentYear}-12-31`),
    supabase
      .from('expenses')
      .select('*')
      .in('profile_id', profileIds)
      .gte('date', `${currentYear}-01-01`)
      .lte('date', `${currentYear}-12-31`),
  ])

  return (
    <DashboardClient
      profiles={profiles as Profile[]}
      initialIncome={(incomeData as Income[]) ?? []}
      initialExpenses={(expenseData as Expense[]) ?? []}
      currentYear={currentYear}
    />
  )
}
