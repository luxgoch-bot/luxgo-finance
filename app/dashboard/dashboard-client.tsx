'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Plus, Landmark, LineChart } from 'lucide-react'
import { KpiCard } from '@/components/kpi-card'
import { ProfileSwitcher } from '@/components/profile-switcher'
import { MwstWidget } from '@/components/mwst-widget'
import { IncomeExpenseChart } from '@/components/charts/income-expense-chart'
import { ExpenseDonut } from '@/components/charts/expense-donut'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { calculateVatPayable, extractVAT } from '@/lib/helpers/vat'
import type { Profile, Income, Expense, Loan, LoanRepayment, InvestmentHolding, InvestmentTransaction } from '@/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface DashboardClientProps {
  profiles: Profile[]
  initialIncome: Income[]
  initialExpenses: Expense[]
  initialLoans: Loan[]
  initialRepayments: LoanRepayment[]
  initialHoldings: InvestmentHolding[]
  initialDividendTx: InvestmentTransaction[]
  currentYear: number
}

export function DashboardClient({
  profiles,
  initialIncome,
  initialExpenses,
  initialLoans,
  initialRepayments,
  initialHoldings,
  initialDividendTx,
  currentYear,
}: DashboardClientProps) {
  const [currentProfile, setCurrentProfile] = useState<Profile>(profiles[0])

  // Filter data for current profile
  const income = useMemo(
    () => initialIncome.filter(i => i.profile_id === currentProfile.id),
    [initialIncome, currentProfile.id]
  )
  const expenses = useMemo(
    () => initialExpenses.filter(e => e.profile_id === currentProfile.id),
    [initialExpenses, currentProfile.id]
  )

  // ── KPI calculations ──────────────────────────────────────────
  const totalIncome = useMemo(() => income.reduce((s, i) => s + i.amount_chf, 0), [income])
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount_chf, 0), [expenses])
  const netProfit = totalIncome - totalExpenses

  // VAT payable for next quarter (based on current quarter's data)
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
  const currentQuarterIncome = useMemo(() => {
    return income.filter(i => {
      const month = new Date(i.date).getMonth() + 1
      return Math.ceil(month / 3) === currentQuarter
    })
  }, [income, currentQuarter])
  const currentQuarterExpenses = useMemo(() => {
    return expenses.filter(e => {
      const month = new Date(e.date).getMonth() + 1
      return Math.ceil(month / 3) === currentQuarter
    })
  }, [expenses, currentQuarter])

  const vatCollected = useMemo(
    () => currentQuarterIncome.reduce((s, i) => s + (i.vat_amount ?? extractVAT(i.amount_chf, i.vat_rate)), 0),
    [currentQuarterIncome]
  )
  const vatPaid = useMemo(
    () => currentQuarterExpenses.reduce((s, e) => s + (e.vat_amount ?? extractVAT(e.amount_chf, e.vat_rate)), 0),
    [currentQuarterExpenses]
  )
  const vatPayable = calculateVatPayable(vatCollected, vatPaid)

  // Loans: outstanding debt + YTD interest for current profile
  const profileLoans = useMemo(
    () => initialLoans.filter(l => l.profile_id === currentProfile.id),
    [initialLoans, currentProfile.id]
  )
  const totalOutstandingDebt = useMemo(() => {
    return profileLoans.reduce((sum, loan) => {
      const loanRepayments = initialRepayments
        .filter(r => r.loan_id === loan.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      if (!loanRepayments.length) return sum + loan.original_amount
      return sum + (loanRepayments[loanRepayments.length - 1].outstanding_balance ?? loan.original_amount)
    }, 0)
  }, [profileLoans, initialRepayments])
  const loanInterestYtd = useMemo(() => {
    return initialRepayments
      .filter(r => {
        const loan = initialLoans.find(l => l.id === r.loan_id)
        return loan?.profile_id === currentProfile.id && new Date(r.date).getFullYear() === currentYear
      })
      .reduce((sum, r) => sum + r.interest_amount, 0)
  }, [initialRepayments, initialLoans, currentProfile.id, currentYear])

  // ── Investment KPIs ────────────────────────────────────────────
  const totalPortfolioValue = useMemo(
    () => initialHoldings
      .filter(h => h.profile_id === currentProfile.id)
      .reduce((s, h) => s + (h.current_value_chf ?? 0), 0),
    [initialHoldings, currentProfile.id]
  )
  const dividendYtd = useMemo(
    () => initialDividendTx
      .filter(t => t.profile_id === currentProfile.id)
      .reduce((s, t) => s + t.total_amount_chf, 0),
    [initialDividendTx, currentProfile.id]
  )

  // ── Monthly chart data ─────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const monthIncome = income
        .filter(i => new Date(i.date).getMonth() === idx)
        .reduce((s, i) => s + i.amount_chf, 0)
      const monthExpenses = expenses
        .filter(e => new Date(e.date).getMonth() === idx)
        .reduce((s, e) => s + e.amount_chf, 0)
      return { month, income: monthIncome, expenses: monthExpenses }
    })
  }, [income, expenses])

  // ── Expense category breakdown ─────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    expenses.forEach(e => {
      const cat = e.category ?? 'other'
      map[cat] = (map[cat] ?? 0) + e.amount_chf
    })
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  // ── Recent transactions ────────────────────────────────────────
  const recentTransactions = useMemo(() => {
    const all = [
      ...income.map(i => ({ ...i, kind: 'income' as const })),
      ...expenses.map(e => ({ ...e, kind: 'expense' as const })),
    ]
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  }, [income, expenses])

  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400">{currentYear} overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs text-gray-500">
            Q{currentQuarter} · {currentYear}
          </Badge>
          <ProfileSwitcher
            profiles={profiles}
            currentProfile={currentProfile}
            onSwitch={setCurrentProfile}
          />
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard/income?action=new">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-medium gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Income
            </Button>
          </Link>
          <Link href="/dashboard/expenses?action=new">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Expense
            </Button>
          </Link>
          <Link href="/dashboard/mwst">
            <Button size="sm" variant="outline">
              View MWST Report
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total Income YTD"
            value={totalIncome}
            icon={TrendingUp}
            variant="positive"
            description={`${income.length} transactions`}
          />
          <KpiCard
            title="Total Expenses YTD"
            value={totalExpenses}
            icon={TrendingDown}
            variant="negative"
            description={`${expenses.length} transactions`}
          />
          <KpiCard
            title="Net Profit YTD"
            value={netProfit}
            icon={DollarSign}
            variant={netProfit >= 0 ? 'positive' : 'negative'}
            description={`${netProfit >= 0 ? 'Profit' : 'Loss'} this year`}
          />
          <KpiCard
            title="Outstanding Debt"
            value={totalOutstandingDebt}
            icon={Landmark}
            variant="negative"
            description={`${profileLoans.length} loan${profileLoans.length !== 1 ? 's' : ''} · interest ytd: CHF ${loanInterestYtd.toFixed(2)}`}
          />
          <KpiCard
            title="VAT Payable Next Quarter"
            value={vatPayable}
            icon={AlertCircle}
            variant="warning"
            description={`Q${currentQuarter} estimate`}
          />
          <KpiCard
            title="Portfolio Value"
            value={totalPortfolioValue}
            icon={LineChart}
            variant="positive"
            description={dividendYtd > 0 ? `Div. income YTD: CHF ${dividendYtd.toFixed(2)} (taxable)` : 'Investments — capital gains tax-free 🇨🇭'}
          />
        </div>

        {/* MWST Widget */}
        <MwstWidget
          year={currentYear}
          quarter={currentQuarter as 1 | 2 | 3 | 4}
          vatPayable={vatPayable}
          vatCollected={vatCollected}
          inputTax={vatPaid}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <IncomeExpenseChart data={monthlyData} year={currentYear} />
          </div>
          <div>
            <ExpenseDonut data={categoryData} />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Recent Transactions</h2>
            <div className="flex gap-2">
              <Link href="/dashboard/income" className="text-xs text-amber-600 hover:underline">
                All income →
              </Link>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              No transactions yet — add your first income or expense
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentTransactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                      ${tx.kind === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {tx.kind === 'income' ? '+' : '−'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[220px]">
                        {tx.description ?? (tx.kind === 'income' ? 'Income' : 'Expense')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.date).toLocaleDateString('de-CH')}
                        {tx.kind === 'income' && (tx as Income).client ? ` · ${(tx as Income).client}` : ''}
                        {tx.kind === 'expense' && (tx as Expense).vendor ? ` · ${(tx as Expense).vendor}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${tx.kind === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.kind === 'income' ? '+' : '−'} CHF {tx.amount_chf.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
