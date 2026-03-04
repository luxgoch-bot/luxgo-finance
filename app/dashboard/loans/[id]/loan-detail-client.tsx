'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatChf, formatDateCh } from '@/lib/helpers/format'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Plus, Landmark, Trash2, AlertCircle, TrendingDown, Banknote } from 'lucide-react'
import type { Profile, Loan, LoanRepayment } from '@/types'

interface LoanDetailClientProps {
  profiles: Profile[]
  loan: Loan
  initialRepayments: LoanRepayment[]
}

const TYPE_BADGE: Record<string, string> = {
  personal: 'bg-blue-900/40 text-blue-400 border-blue-800',
  business: 'bg-amber-900/40 text-amber-400 border-amber-800',
  mortgage: 'bg-purple-900/40 text-purple-400 border-purple-800',
  vehicle:  'bg-green-900/40 text-green-400 border-green-800',
  other:    'bg-gray-800 text-gray-400 border-gray-700',
}

export function LoanDetailClient({ profiles, loan, initialRepayments }: LoanDetailClientProps) {
  const supabase = createClient()
  const t = useTranslations('loans')
  const tCommon = useTranslations('common')
  const currentYear = new Date().getFullYear()

  const [repayments, setRepayments] = useState<LoanRepayment[]>(initialRepayments)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LoanRepayment | null>(null)

  // Form state
  const [form, setForm] = useState({ date: '', total_payment: '', notes: '' })

  // Derived: latest outstanding balance
  const latestOutstanding = useMemo(() => {
    if (!repayments.length) return loan.original_amount
    return repayments[repayments.length - 1].outstanding_balance ?? loan.original_amount
  }, [repayments, loan.original_amount])

  // Auto-calculate interest & capital
  const autoCalc = useMemo(() => {
    const total = parseFloat(form.total_payment) || 0
    const interest = latestOutstanding * (loan.interest_rate / 100 / 12)
    const capital = Math.max(0, total - interest)
    const newBalance = Math.max(0, latestOutstanding - capital)
    return { interest, capital, newBalance }
  }, [form.total_payment, latestOutstanding, loan.interest_rate])

  // YTD interest (tax deductible)
  const ytdInterest = useMemo(() => {
    return repayments
      .filter(r => new Date(r.date).getFullYear() === currentYear)
      .reduce((s, r) => s + r.interest_amount, 0)
  }, [repayments, currentYear])

  const totalInterestPaid = useMemo(
    () => repayments.reduce((s, r) => s + r.interest_amount, 0),
    [repayments]
  )
  const totalCapitalPaid = useMemo(
    () => repayments.reduce((s, r) => s + r.capital_amount, 0),
    [repayments]
  )

  // Chart data
  const chartData = useMemo(() => {
    const points: { date: string; balance: number }[] = [
      { date: formatDateCh(loan.start_date), balance: loan.original_amount },
    ]
    repayments.forEach(r => {
      points.push({ date: formatDateCh(r.date), balance: r.outstanding_balance ?? 0 })
    })
    return points
  }, [repayments, loan])

  async function saveRepayment() {
    if (!form.date || !form.total_payment) {
      toast.error('Date and payment amount are required')
      return
    }
    setSaving(true)
    const profile = profiles.find(p => p.id === loan.profile_id)
    if (!profile) { setSaving(false); return }

    const { data, error } = await supabase.from('loan_repayments').insert({
      loan_id: loan.id,
      profile_id: loan.profile_id,
      date: form.date,
      total_payment: parseFloat(form.total_payment),
      capital_amount: parseFloat(autoCalc.capital.toFixed(2)),
      interest_amount: parseFloat(autoCalc.interest.toFixed(2)),
      outstanding_balance: parseFloat(autoCalc.newBalance.toFixed(2)),
      notes: form.notes || null,
    }).select().single()

    if (error) { toast.error('Failed to save repayment'); setSaving(false); return }

    setRepayments(prev => [...prev, data as LoanRepayment].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ))
    toast.success('Repayment recorded')
    setShowAdd(false)
    setForm({ date: '', total_payment: '', notes: '' })
    setSaving(false)
  }

  async function deleteRepayment() {
    if (!deleteTarget) return
    const { error } = await supabase.from('loan_repayments').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Failed to delete'); return }
    setRepayments(prev => prev.filter(r => r.id !== deleteTarget.id))
    toast.success('Repayment deleted')
    setDeleteTarget(null)
  }

  const isPaidOff = latestOutstanding <= 0

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/loans" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-gray-800">
              <Landmark className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white">{loan.provider}</h1>
                <Badge className={`text-xs border ${TYPE_BADGE[loan.loan_type ?? 'other']}`}>
                  {loan.loan_type}
                </Badge>
                {isPaidOff && (
                  <Badge className="bg-green-900/40 text-green-400 border-green-800 text-xs">{t('paidOff')}</Badge>
                )}
              </div>
              {loan.description && <p className="text-sm text-gray-400">{loan.description}</p>}
            </div>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            <Plus className="h-4 w-4 mr-2" />{t('addRepayment')}
          </Button>
        </div>

        {/* Loan stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Original Amount', value: formatChf(loan.original_amount), color: 'text-white' },
            { label: t('outstandingBalance'), value: formatChf(latestOutstanding), color: isPaidOff ? 'text-green-400' : 'text-red-400' },
            { label: 'Interest Rate', value: `${loan.interest_rate}% p.a.`, color: 'text-white' },
            { label: `Interest ${currentYear} (deductible)`, value: formatChf(ytdInterest), color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-gray-900 border border-gray-800 px-3 py-2.5">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Balance Chart */}
        {chartData.length > 1 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-sm font-semibold text-white mb-4">Outstanding Balance Over Time</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                  formatter={(v: unknown) => [formatChf(v as number), 'Balance']}
                />
                <Line type="monotone" dataKey="balance" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tax summary box */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-400 text-sm">{t('taxSummary')}</p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Interest paid {currentYear} (Schuldzinsen — deductible)</span>
                  <span className="text-amber-400 font-semibold">{formatChf(ytdInterest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total interest paid all time</span>
                  <span className="text-white">{formatChf(totalInterestPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Outstanding balance (Schulden — declare in tax return)</span>
                  <span className="text-red-400 font-semibold">{formatChf(latestOutstanding)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Capital repaid (not deductible)</span>
                  <span className="text-gray-300">{formatChf(totalCapitalPaid)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Repayments table */}
        <div className="rounded-xl border border-gray-800 bg-gray-900">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="font-semibold text-white text-sm">Repayment Schedule ({repayments.length} payments)</p>
          </div>
          {repayments.length === 0 ? (
            <div className="py-12 text-center">
              <Banknote className="h-8 w-8 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No repayments recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {[tCommon('date'), t('totalPayment'), t('capitalAmount'), t('interestAmount'), t('outstandingBalance'), ''].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...repayments].reverse().map(r => (
                    <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 text-gray-300">{formatDateCh(r.date)}</td>
                      <td className="py-3 px-4 text-white font-medium">{formatChf(r.total_payment)}</td>
                      <td className="py-3 px-4 text-blue-400">{formatChf(r.capital_amount)}</td>
                      <td className="py-3 px-4 text-amber-400">{formatChf(r.interest_amount)}</td>
                      <td className="py-3 px-4 text-red-400">{r.outstanding_balance != null ? formatChf(r.outstanding_balance) : '—'}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => setDeleteTarget(r)} className="text-gray-600 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Repayment Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addRepayment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white focus:border-amber-500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300">Total Payment Amount (CHF) *</Label>
              <Input type="number" step="0.01" value={form.total_payment}
                onChange={e => setForm(p => ({ ...p, total_payment: e.target.value }))}
                placeholder="1500.00"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500" />
            </div>

            {/* Auto-calculated breakdown */}
            {form.total_payment && parseFloat(form.total_payment) > 0 && (
              <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 space-y-2 text-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Auto-calculated breakdown</p>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current outstanding balance</span>
                  <span className="text-red-400 font-medium">{formatChf(latestOutstanding)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400">Interest portion ({loan.interest_rate}% ÷ 12)</span>
                  <span className="text-amber-400 font-medium">{formatChf(autoCalc.interest)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">Capital repayment</span>
                  <span className="text-blue-400 font-medium">{formatChf(autoCalc.capital)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-1">
                  <span className="text-gray-300">New outstanding balance</span>
                  <span className="text-white font-semibold">{formatChf(autoCalc.newBalance)}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-gray-300">Notes <span className="text-gray-600">(optional)</span></Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Monthly instalment, extra payment…"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}
              className="border-gray-700 text-gray-300 hover:text-white">{tCommon('cancel')}</Button>
            <Button onClick={saveRepayment} disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
              {saving ? tCommon('saving') : t('addRepayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete repayment confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Delete repayment?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400 text-sm">
            Payment of <strong className="text-white">{deleteTarget && formatChf(deleteTarget.total_payment)}</strong> on <strong className="text-white">{deleteTarget && formatDateCh(deleteTarget.date)}</strong> will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="border-gray-700 text-gray-300">{tCommon('cancel')}</Button>
            <Button onClick={deleteRepayment} className="bg-red-600 hover:bg-red-500 text-white">{tCommon('delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
