import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { ExpensesClient } from './expenses-client'
import type { Profile, TaxYear, Expense } from '@/types'

export default async function ExpensesPage() {
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

  const [{ data: expenseData }, { data: taxYears }] = await Promise.all([
    supabase
      .from('expenses')
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
    <ExpensesClient
      profiles={profiles as Profile[]}
      expenseRecords={(expenseData as Expense[]) ?? []}
      taxYears={(taxYears as TaxYear[]) ?? []}
    />
  )
}
