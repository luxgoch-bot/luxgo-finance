'use client'

import { useState, useMemo, useEffect } from 'react'
import { updateTaxYearNotes } from '@/app/actions/tax-year'
import {
  buildProfitAndLoss,
  estimateCorporateTax,
  GMBH_CHECKLIST,
  type ChecklistItemId,
} from '@/lib/helpers/corporate-tax'
import { formatChf } from '@/lib/helpers/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { Income, Expense, TaxYear, Profile } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  vehicle:     '🚗 Vehicle',
  fuel:        '⛽ Fuel',
  insurance:   '🛡️ Insurance',
  maintenance: '🔧 Maintenance',
  office:      '🖥️ Office',
  marketing:   '📣 Marketing',
  salary:      '👥 Salary / AHV',
  tax:         '🏛️ Tax Payments',
  other:       '📦 Other',
}

interface BusinessTaxTabProps {
  profile:               Profile
  year:                  number
  income:                Income[]
  expenses:              Expense[]
  submittedMwstQuarters: number[]
  taxYear?:              TaxYear
}

const CHECKLIST_STORAGE_KEY = (profileId: string, year: number) =>
  `gmbh_checklist_${profileId}_${year}`

export function BusinessTaxTab({
  profile,
  year,
  income,
  expenses,
  submittedMwstQuarters,
  taxYear,
}: BusinessTaxTabProps) {
  const [notes, setNotes]           = useState(taxYear?.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [checklist, setChecklist]   = useState<Set<string>>(new Set())
  const [expandPnl, setExpandPnl]   = useState(false)
  const [notesMsg, setNotesMsg]     = useState<string | null>(null)

  // Load checklist from localStorage
  useEffect(() => {
    const key   = CHECKLIST_STORAGE_KEY(profile.id, year)
    const saved = localStorage.getItem(key)
    if (saved) {
      try { setChecklist(new Set(JSON.parse(saved))) } catch {}
    }

    // Auto-check submitted MWST quarters
    const autoChecked = new Set<string>(saved ? JSON.parse(saved) : [])
    if (submittedMwstQuarters.includes(1)) autoChecked.add('mwst_q1')
    if (submittedMwstQuarters.includes(2)) autoChecked.add('mwst_q2')
    if (submittedMwstQuarters.includes(3)) autoChecked.add('mwst_q3')
    if (submittedMwstQuarters.includes(4)) autoChecked.add('mwst_q4')
    setChecklist(autoChecked)
  }, [profile.id, year, submittedMwstQuarters])

  function toggleChecklist(id: string) {
    setChecklist(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(
        CHECKLIST_STORAGE_KEY(profile.id, year),
        JSON.stringify(Array.from(next))
      )
      return next
    })
  }

  async function handleSaveNotes() {
    if (!taxYear) return
    setSavingNotes(true)
    await updateTaxYearNotes(taxYear.id, notes)
    setSavingNotes(false)
    setNotesMsg('Saved.')
    setTimeout(() => setNotesMsg(null), 2000)
  }

  // Calculate P&L
  const ownerSalary = useMemo(() =>
    expenses.filter(e => e.category === 'salary').reduce((s, e) => s + e.amount_chf, 0),
    [expenses]
  )

  const pnl = useMemo(() =>
    buildProfitAndLoss(income, expenses, ownerSalary),
    [income, expenses, ownerSalary]
  )

  const tax = useMemo(() =>
    estimateCorporateTax(pnl.estimatedTaxableProfit),
    [pnl.estimatedTaxableProfit]
  )

  const checklistProgress = Math.round((checklist.size / GMBH_CHECKLIST.length) * 100)

  const CATEGORY_GROUPS = {
    accounting: 'Accounting',
    mwst:       'MWST',
    social:     'Social Contributions',
    payroll:    'Payroll',
    tax:        'Tax Filing',
    corporate:  'Corporate',
  }

  return (
    <div className="space-y-5">
      {/* P&L Summary ─────────────────────────────────────────────── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold text-gray-800">
                Profit &amp; Loss Summary — {year}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {income.length} income · {expenses.length} expenses
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-3">
          {/* Top-line figures */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Revenue (net)', value: pnl.totalRevenue, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Total Expenses (net)', value: pnl.totalDeductibleExpenses, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
              { label: 'EBITDA', value: pnl.ebitda, color: pnl.ebitda >= 0 ? 'text-gray-900' : 'text-red-600', bg: 'bg-gray-50 border-gray-200' },
              { label: 'Est. Taxable Profit', value: pnl.estimatedTaxableProfit, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl border px-4 py-3 ${bg}`}>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-base font-bold tabular-nums mt-0.5 ${color}`}>{formatChf(value)}</p>
              </div>
            ))}
          </div>

          {/* Expense by category — expandable */}
          <button
            onClick={() => setExpandPnl(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expandPnl ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {expandPnl ? 'Hide' : 'Show'} expense breakdown by category
          </button>

          {expandPnl && Object.keys(pnl.expensesByCategory).length > 0 && (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount (net)</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">% of expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(pnl.expensesByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => (
                      <tr key={cat} className="hover:bg-amber-50/20">
                        <td className="px-4 py-2.5 text-gray-700">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-900">
                          {formatChf(amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                          {pnl.totalDeductibleExpenses > 0
                            ? `${Math.round((amount / pnl.totalDeductibleExpenses) * 1000) / 10}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* AHV note */}
          {ownerSalary > 0 && (
            <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              💡 Owner salary detected: {formatChf(ownerSalary)} — estimated AHV deduction of {formatChf(pnl.estimatedAhvDeduction)} applied to taxable profit
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tax Estimation ────────────────────────────────────────────── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold text-gray-800">
            Corporate Tax Estimation — Zürich {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-4">
          {pnl.estimatedTaxableProfit <= 0 ? (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No taxable profit — no corporate tax due for {year}.</p>
              <p className="text-xs text-gray-400 mt-1">Losses can be carried forward for up to 7 years.</p>
            </div>
          ) : (
            <>
              {/* Breakdown */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-400 font-medium">Federal Tax (DBSt)</p>
                  <p className="text-xs text-gray-400">8.5% effective</p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums mt-1">{formatChf(tax.federalTax)}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-xs text-gray-400 font-medium">Cantonal Tax (ZH)</p>
                  <p className="text-xs text-gray-400">7% on profit</p>
                  <p className="text-lg font-bold text-amber-700 tabular-nums mt-1">{formatChf(tax.cantonalTax)}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3">
                  <p className="text-xs text-gray-400 font-medium">Municipal Tax (Zürich)</p>
                  <p className="text-xs text-gray-400">cantonal × 119%</p>
                  <p className="text-lg font-bold text-amber-700 tabular-nums mt-1">{formatChf(tax.municipalTax)}</p>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
                    Estimated Total Corporate Tax
                  </p>
                  <p className="text-xs text-red-400 mt-0.5">
                    Federal + Cantonal + Municipal — Effective rate {tax.effectiveRate}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-700 tabular-nums">{formatChf(tax.totalTax)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Profit after tax: {formatChf(tax.profitAfterTax)}
                  </p>
                </div>
              </div>

              {/* Tax breakdown bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Federal ({Math.round((tax.federalTax / tax.totalTax) * 100)}%)</span>
                  <span>Cantonal ({Math.round((tax.cantonalTax / tax.totalTax) * 100)}%)</span>
                  <span>Municipal ({Math.round((tax.municipalTax / tax.totalTax) * 100)}%)</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden flex">
                  <div className="bg-gray-600 h-full" style={{ width: `${(tax.federalTax / tax.totalTax) * 100}%` }} />
                  <div className="bg-amber-500 h-full" style={{ width: `${(tax.cantonalTax / tax.totalTax) * 100}%` }} />
                  <div className="bg-amber-300 h-full" style={{ width: `${(tax.municipalTax / tax.totalTax) * 100}%` }} />
                </div>
              </div>
            </>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800">{tax.disclaimer}</p>
          </div>
        </CardContent>
      </Card>

      {/* Notes ─────────────────────────────────────────────────────── */}
      {taxYear && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-gray-800">Notes &amp; Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add depreciation notes, AHV adjustments, Treuhänder contact, filing references…"
              rows={3}
              className="text-sm text-gray-700 border-gray-200 resize-none focus:border-amber-500"
            />
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={savingNotes} className="gap-1.5">
                {savingNotes && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save notes
              </Button>
              {notesMsg && <span className="text-xs text-emerald-600">{notesMsg}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Annual Submission Checklist ───────────────────────────────── */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-800">
              GmbH Annual Submission Checklist
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {checklist.size}/{GMBH_CHECKLIST.length} complete
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                checklistProgress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {checklistProgress}%
              </span>
            </div>
          </div>
          <Progress value={checklistProgress} className="mt-2 h-2" />
        </CardHeader>
        <CardContent className="px-5 pb-4">
          {/* Deadline banner */}
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-800">
              <strong>Deadline: 31 March {year + 1}</strong> (extendable — request via cantonal tax office)
            </div>
          </div>

          {/* Group checklist items */}
          {Object.entries({
            accounting: 'Accounting',
            mwst:       'MWST Filings',
            social:     'Social Contributions',
            payroll:    'Payroll',
            tax:        'Tax Filing',
            corporate:  'Corporate Governance',
          }).map(([group, label]) => {
            const items = GMBH_CHECKLIST.filter(item => item.category === group)
            if (!items.length) return null
            const groupDone = items.filter(item => checklist.has(item.id)).length

            return (
              <div key={group} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
                  <span className="text-xs text-gray-300">({groupDone}/{items.length})</span>
                  {groupDone === items.length && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                </div>
                <div className="space-y-1">
                  {items.map(item => {
                    const done = checklist.has(item.id)
                    const autoChecked = item.id.startsWith('mwst_q') &&
                      submittedMwstQuarters.includes(Number(item.id.slice(-1)))

                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 rounded-lg px-3 py-2.5 cursor-pointer select-none transition-colors ${
                          done ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-transparent hover:border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggleChecklist(item.id)}
                          disabled={autoChecked}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 shrink-0"
                        />
                        <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {item.label}
                          {autoChecked && (
                            <span className="ml-1.5 text-xs text-emerald-600 no-underline">(auto — submitted in MWST module)</span>
                          )}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {checklistProgress === 100 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">All items complete! 🎉</p>
                <p className="text-xs text-emerald-600">LuxGo GmbH is fully filed for {year}.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
