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
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ProfileSwitcher } from '@/components/profile-switcher'
import { formatChf, formatDateCh } from '@/lib/helpers/format'
import { Landmark, Plus, ChevronRight, TrendingDown, AlertCircle, Trash2 } from 'lucide-react'
import type { Profile, Loan, LoanRepayment, TaxYear } from '@/types'

interface LoansClientProps {
  profiles: Profile[]
  loans: Loan[]
  repayments: LoanRepayment[]
  taxYears: TaxYear[]
  currentYear: number
}

const LOAN_TYPES = ['personal', 'business', 'mortgage', 'vehicle', 'other'] as const

const TYPE_BADGE: Record<string, string> = {
  personal:  'bg-blue-900/40 text-blue-400 border-blue-800',
  business:  'bg-amber-900/40 text-amber-400 border-amber-800',
  mortgage:  'bg-purple-900/40 text-purple-400 border-purple-800',
  vehicle:   'bg-green-900/40 text-green-400 border-green-800',
  other:     'bg-gray-800 text-gray-400 border-gray-700',
}

function computeOutstanding(loan: Loan, repayments: LoanRepayment[]): number {
  const loanRepayments = repayments
    .filter(r => r.loan_id === loan.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  if (!loanRepayments.length) return loan.original_amount
  const last = loanRepayments[loanRepayments.length - 1]
  return last.outstanding_balance ?? loan.original_amount
}

export function LoansClient({ profiles, loans: initialLoans, repayments: initialRepayments, taxYears, currentYear }: LoansClientProps) {
  const supabase = createClient()
  const t = useTranslations('loans')
  const tCommon = useTranslations('common')

  const [currentProfile, setCurrentProfile] = useState<Profile>(profiles[0])
  const [loans, setLoans] = useState<Loan[]>(initialLoans)
  const [repayments, setRepayments] = useState<LoanRepayment[]>(initialRepayments)
  const [showAddLoan, setShowAddLoan] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null)

  // Form state
  const [form, setForm] = useState({
    provider: '', description: '', loan_type: 'personal' as Loan['loan_type'],
    original_amount: '', interest_rate: '', start_date: '', end_date: '', notes: '',
  })

  const profileLoans = useMemo(
    () => loans.filter(l => l.profile_id === currentProfile.id),
    [loans, currentProfile.id]
  )

  const totalDebt = useMemo(
    () => profileLoans.reduce((sum, l) => sum + computeOutstanding(l, repayments), 0),
    [profileLoans, repayments]
  )

  const interestYtd = useMemo(() => {
    return repayments
      .filter(r => {
        const loan = loans.find(l => l.id === r.loan_id)
        return loan?.profile_id === currentProfile.id &&
          new Date(r.date).getFullYear() === currentYear
      })
      .reduce((sum, r) => sum + r.interest_amount, 0)
  }, [repayments, loans, currentProfile.id, currentYear])

  async function saveLoan() {
    if (!form.provider || !form.original_amount || !form.interest_rate || !form.start_date) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from('loans').insert({
      profile_id: currentProfile.id,
      provider: form.provider,
      description: form.description || null,
      loan_type: form.loan_type,
      original_amount: parseFloat(form.original_amount),
      interest_rate: parseFloat(form.interest_rate),
      start_date: form.start_date,
      end_date: form.end_date || null,
      notes: form.notes || null,
      currency: 'CHF',
    }).select().single()

    if (error) { toast.error('Failed to save loan'); setSaving(false); return }
    setLoans(prev => [data as Loan, ...prev])
    toast.success('Loan added')
    setShowAddLoan(false)
    setForm({ provider: '', description: '', loan_type: 'personal', original_amount: '', interest_rate: '', start_date: '', end_date: '', notes: '' })
    setSaving(false)
  }

  async function deleteLoan() {
    if (!deleteTarget) return
    const { error } = await supabase.from('loans').delete().eq('id', deleteTarget.id)
    if (error) { toast.error('Failed to delete'); return }
    setLoans(prev => prev.filter(l => l.id !== deleteTarget.id))
    setRepayments(prev => prev.filter(r => r.loan_id !== deleteTarget.id))
    toast.success('Loan deleted')
    setDeleteTarget(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">{t('title')}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{t('subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <ProfileSwitcher profiles={profiles} currentProfile={currentProfile} onSwitch={setCurrentProfile} />
            <Button onClick={() => setShowAddLoan(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
              <Plus className="h-4 w-4 mr-2" />{t('addLoan')}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-6 py-4 border-b border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('totalDebt')}</p>
          <p className="text-2xl font-bold text-red-400">{formatChf(totalDebt)}</p>
          <p className="text-xs text-gray-500 mt-1">Schulden — declare in tax return</p>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('interestYtd')} {currentYear}</p>
          <p className="text-2xl font-bold text-amber-400">{formatChf(interestYtd)}</p>
          <p className="text-xs text-green-500 mt-1">✓ {t('deductibleNote')}</p>
        </div>
      </div>

      {/* Loans list */}
      <div className="p-6">
        {profileLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
              <Landmark className="h-8 w-8 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">{t('noLoans')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profileLoans.map(loan => {
              const outstanding = computeOutstanding(loan, repayments)
              const isPaidOff = outstanding <= 0
              const loanRepayments = repayments.filter(r => r.loan_id === loan.id)
              const ytdInterest = loanRepayments
                .filter(r => new Date(r.date).getFullYear() === currentYear)
                .reduce((s, r) => s + r.interest_amount, 0)

              return (
                <div key={loan.id} className="rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 transition-colors">
                  <Link href={`/dashboard/loans/${loan.id}`} className="block p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 p-2 rounded-lg bg-gray-800 shrink-0">
                          <Landmark className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white">{loan.provider}</p>
                            <Badge className={`text-xs border ${TYPE_BADGE[loan.loan_type ?? 'other']}`}>
                              {loan.loan_type}
                            </Badge>
                            {isPaidOff && (
                              <Badge className="text-xs bg-green-900/40 text-green-400 border-green-800">{t('paidOff')}</Badge>
                            )}
                          </div>
                          {loan.description && <p className="text-sm text-gray-400 mt-0.5 truncate">{loan.description}</p>}
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>Original: <span className="text-gray-300">{formatChf(loan.original_amount)}</span></span>
                            <span>Rate: <span className="text-gray-300">{loan.interest_rate}%</span></span>
                            <span>Since: <span className="text-gray-300">{formatDateCh(loan.start_date)}</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-gray-500 mb-1">{t('outstandingBalance')}</p>
                        <p className={`text-lg font-bold ${isPaidOff ? 'text-green-400' : 'text-red-400'}`}>
                          {formatChf(outstanding)}
                        </p>
                        {ytdInterest > 0 && (
                          <p className="text-xs text-amber-400 mt-1">
                            CHF {ytdInterest.toFixed(2)} interest {currentYear}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-600 shrink-0 mt-1" />
                    </div>
                  </Link>
                  <div className="px-4 pb-3 flex justify-end">
                    <button
                      onClick={(e) => { e.preventDefault(); setDeleteTarget(loan) }}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Loan Dialog */}
      <Dialog open={showAddLoan} onOpenChange={setShowAddLoan}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addLoan')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-gray-300">Provider / Lender *</Label>
                <Input value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
                  placeholder="UBS, PostFinance, Migros Bank…"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">Loan Type *</Label>
                <Select value={form.loan_type} onValueChange={(v) => setForm(p => ({ ...p, loan_type: v as Loan['loan_type'] }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    {LOAN_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="text-white capitalize">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">Original Amount (CHF) *</Label>
                <Input type="number" value={form.original_amount} onChange={e => setForm(p => ({ ...p, original_amount: e.target.value }))}
                  placeholder="50000"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">Interest Rate (% p.a.) *</Label>
                <Input type="number" step="0.001" value={form.interest_rate} onChange={e => setForm(p => ({ ...p, interest_rate: e.target.value }))}
                  placeholder="3.500"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white focus:border-amber-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-300">End Date <span className="text-gray-600">(optional)</span></Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white focus:border-amber-500" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-gray-300">Description <span className="text-gray-600">(optional)</span></Label>
                <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Car loan for Mercedes V 300"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-600 focus:border-amber-500" />
              </div>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 inline mr-1.5" />
              Interest paid on this loan will be automatically counted as a tax deduction (Schuldzinsen).
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLoan(false)}
              className="border-gray-700 text-gray-300 hover:text-white">{tCommon('cancel')}</Button>
            <Button onClick={saveLoan} disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
              {saving ? tCommon('saving') : t('addLoan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Delete loan?</DialogTitle>
            <DialogDescription className="text-gray-400">
              <strong className="text-white">{deleteTarget?.provider}</strong> and all its repayments will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="border-gray-700 text-gray-300">{tCommon('cancel')}</Button>
            <Button onClick={deleteLoan} className="bg-red-600 hover:bg-red-500 text-white">{tCommon('delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
