'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  markMwstSubmitted,
  revertMwstToDraft,
  updateMwstNotes,
  recalculateMwstReport,
} from '@/app/actions/mwst'
import { exportMwstPdf } from '@/lib/helpers/pdf-export'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { formatChf, formatDateCh } from '@/lib/helpers/format'
import { extractVAT } from '@/lib/helpers/vat'
import type { Profile, MwstReport, Income, Expense } from '@/types'
import type { MwstQuarterSummary, VatRateGroup } from '@/lib/helpers/mwst'

interface QuarterReportClientProps {
  report:   MwstReport
  profile:  Profile
  summary:  MwstQuarterSummary
  year:     number
}

export function QuarterReportClient({ report: initialReport, profile, summary, year }: QuarterReportClientProps) {
  const [report, setReport]             = useState<MwstReport>(initialReport)
  const [notes, setNotes]               = useState(initialReport.notes ?? '')
  const [savingNotes, setSavingNotes]   = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [reverting, setReverting]       = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [expandIncome, setExpandIncome] = useState(false)
  const [expandExpenses, setExpandExpenses] = useState(false)
  const [serverMsg, setServerMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const isSubmitted = report.status === 'submitted'

  async function handleSaveNotes() {
    setSavingNotes(true)
    const result = await updateMwstNotes(report.id, notes)
    setSavingNotes(false)
    if (result?.error) setServerMsg({ type: 'err', text: result.error })
    else setServerMsg({ type: 'ok', text: 'Notes saved.' })
    setTimeout(() => setServerMsg(null), 3000)
  }

  async function handleMarkSubmitted() {
    setSubmitting(true)
    const result = await markMwstSubmitted(report.id)
    setSubmitting(false)
    if (result?.error) {
      setServerMsg({ type: 'err', text: result.error })
    } else {
      setReport(r => ({ ...r, status: 'submitted', submitted_at: new Date().toISOString() }))
      setServerMsg({ type: 'ok', text: 'Marked as submitted ✓' })
    }
    setTimeout(() => setServerMsg(null), 4000)
  }

  async function handleRevert() {
    setReverting(true)
    const result = await revertMwstToDraft(report.id)
    setReverting(false)
    if (result?.error) {
      setServerMsg({ type: 'err', text: result.error })
    } else {
      setReport(r => ({ ...r, status: 'draft', submitted_at: undefined }))
      setServerMsg({ type: 'ok', text: 'Reverted to draft.' })
    }
    setTimeout(() => setServerMsg(null), 3000)
  }

  async function handleRecalculate() {
    setRecalculating(true)
    const result = await recalculateMwstReport(report.id)
    setRecalculating(false)
    if (result?.error) setServerMsg({ type: 'err', text: result.error })
    else setServerMsg({ type: 'ok', text: 'Report recalculated from latest data.' })
    setTimeout(() => setServerMsg(null), 3000)
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      await exportMwstPdf(summary, profile, report)
    } catch (e) {
      setServerMsg({ type: 'err', text: 'PDF export failed.' })
    }
    setExportingPdf(false)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function RateGroupRow({ g, type }: { g: VatRateGroup; type: 'income' | 'expense' }) {
    return (
      <div className="flex items-center justify-between py-2.5 px-4 hover:bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-800">{g.label}</p>
          <p className="text-xs text-gray-400">{g.count} {type === 'income' ? 'invoices' : 'expenses'} · net {formatChf(g.netTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-gray-900">{formatChf(g.grossTotal)}</p>
          <p className={`text-xs font-medium tabular-nums ${type === 'income' ? 'text-amber-600' : 'text-blue-600'}`}>
            {type === 'income' ? 'VAT: ' : 'Input tax: '}{formatChf(g.vatTotal)}
          </p>
        </div>
      </div>
    )
  }

  function LineItemsTable({ items, type }: { items: Income[] | Expense[]; type: 'income' | 'expense' }) {
    return (
      <div className="mt-2 rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">
                {type === 'income' ? 'Client' : 'Vendor'}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider">Gross</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
              <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wider">
                {type === 'income' ? 'VAT' : 'Input Tax'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(items as (Income & Expense)[]).map(item => {
              const vat = item.vat_amount ?? extractVAT(item.amount_chf, item.vat_rate)
              const party = type === 'income'
                ? (item as Income).client
                : (item as Expense).vendor
              return (
                <tr key={item.id} className="hover:bg-amber-50/20">
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDateCh(item.date)}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[100px] truncate">{party || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{item.description || '—'}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap">
                    {formatChf(item.amount_chf)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400">{item.vat_rate}%</td>
                  <td className={`px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap ${type === 'income' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {formatChf(vat)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Deductible expenses only for input tax
  const deductibleExpenses = summary.expenseLines.filter(e => e.is_deductible)
  const nonDeductibleExpenses = summary.expenseLines.filter(e => !e.is_deductible)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6">
        <Link href="/dashboard/mwst">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-gray-700 -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            MWST
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-900">
            Q{summary.quarter} {summary.year} — {profile.name}
          </h1>
          <p className="text-xs text-gray-400">
            {summary.dateRange.start} → {summary.dateRange.end}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={isSubmitted
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }
          >
            {isSubmitted ? '✓ Submitted' : '◉ Draft'}
          </Badge>

          {!isSubmitted && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="gap-1.5 text-gray-600"
              title="Recalculate from latest income/expense data"
            >
              {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Recalculate
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="gap-1.5 text-gray-600"
          >
            {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export PDF
          </Button>

          {!isSubmitted ? (
            <Button
              size="sm"
              onClick={handleMarkSubmitted}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Mark as Submitted
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRevert}
              disabled={reverting}
              className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              {reverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Revert to Draft
            </Button>
          )}
        </div>
      </header>

      {/* Status message */}
      {serverMsg && (
        <div className={`mx-6 mt-3 rounded-lg px-4 py-2.5 text-sm font-medium ${
          serverMsg.type === 'ok'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {serverMsg.text}
        </div>
      )}

      <div className="flex-1 p-6 space-y-5">
        {/* ─── SECTION A — Output VAT ──────────────────────────────────────── */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs">A</div>
                <CardTitle className="text-sm font-semibold text-gray-800">
                  Output VAT — Revenue Subject to MWST
                </CardTitle>
              </div>
              <button
                onClick={() => setExpandIncome(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expandIncome ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {expandIncome ? 'Hide' : 'Show'} {summary.incomeLines.length} line items
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {summary.incomeByRate.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No income recorded for this quarter.</p>
            ) : (
              <div className="space-y-1">
                {summary.incomeByRate.map(g => <RateGroupRow key={g.rate} g={g} type="income" />)}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Total gross revenue</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatChf(summary.totalGrossIncome)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">VAT Collected (Ziffer 302)</p>
                <p className="text-lg font-bold text-amber-700 mt-0.5">{formatChf(summary.totalVatCollected)}</p>
              </div>
            </div>

            {expandIncome && summary.incomeLines.length > 0 && (
              <LineItemsTable items={summary.incomeLines} type="income" />
            )}
          </CardContent>
        </Card>

        {/* ─── SECTION B — Input Tax ────────────────────────────────────────── */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">B</div>
                <CardTitle className="text-sm font-semibold text-gray-800">
                  Input Tax — Vorsteuer on Deductible Expenses
                </CardTitle>
              </div>
              <button
                onClick={() => setExpandExpenses(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expandExpenses ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {expandExpenses ? 'Hide' : 'Show'} {deductibleExpenses.length} line items
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {summary.expenseByRate.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No deductible expenses for this quarter.</p>
            ) : (
              <div className="space-y-1">
                {summary.expenseByRate.map(g => <RateGroupRow key={g.rate} g={g} type="expense" />)}
              </div>
            )}

            {nonDeductibleExpenses.length > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                {nonDeductibleExpenses.length} non-deductible expense{nonDeductibleExpenses.length !== 1 ? 's' : ''} excluded from input tax ({formatChf(nonDeductibleExpenses.reduce((s, e) => s + e.amount_chf, 0))} total)
              </p>
            )}

            <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Total deductible expenses</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatChf(summary.totalGrossExpenses)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Input Tax (Ziffer 400)</p>
                <p className="text-lg font-bold text-blue-700 mt-0.5">{formatChf(summary.totalInputTax)}</p>
              </div>
            </div>

            {expandExpenses && deductibleExpenses.length > 0 && (
              <LineItemsTable items={deductibleExpenses} type="expense" />
            )}
          </CardContent>
        </Card>

        {/* ─── SECTION C — Net VAT Payable ─────────────────────────────────── */}
        <Card className={`border-2 shadow-sm ${
          summary.vatPayable > 0
            ? 'border-red-200 bg-red-50/30'
            : summary.vatRefundable > 0
            ? 'border-emerald-200 bg-emerald-50/30'
            : 'border-gray-200'
        }`}>
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-bold text-xs">C</div>
              <CardTitle className="text-sm font-semibold text-gray-800">
                Net VAT — Ziffer 500
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  <span>VAT collected on income (A)</span>
                </div>
                <span className="font-semibold tabular-nums text-amber-700">{formatChf(summary.totalVatCollected)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  <span>Input tax deduction (B)</span>
                </div>
                <span className="font-semibold tabular-nums text-blue-600">− {formatChf(summary.totalInputTax)}</span>
              </div>

              <div className="border-t border-gray-200 pt-3 mt-1">
                {summary.vatPayable > 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-red-100 border border-red-200 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-700">MWST Payable to ESTV</p>
                      <p className="text-xs text-red-500 mt-0.5">Due within 60 days of quarter end</p>
                    </div>
                    <p className="text-2xl font-bold text-red-700 tabular-nums">{formatChf(summary.vatPayable)}</p>
                  </div>
                ) : summary.vatRefundable > 0 ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-100 border border-emerald-200 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">VAT Refund Due from ESTV</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Claim refund in your ESTV filing</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 tabular-nums">↩ {formatChf(summary.vatRefundable)}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl bg-gray-100 border border-gray-200 px-5 py-4">
                    <p className="text-sm font-medium text-gray-600">Net VAT = zero (input equals output)</p>
                    <p className="text-2xl font-bold text-gray-500">{formatChf(0)}</p>
                  </div>
                )}
              </div>
            </div>

            {report.submitted_at && (
              <p className="mt-4 text-xs text-gray-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Submitted on {formatDateCh(report.submitted_at.slice(0, 10))}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ─── Notes ───────────────────────────────────────────────────────── */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-sm font-semibold text-gray-800">Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any MWST-specific notes, adjustments, or filing references…"
              rows={3}
              className="text-sm text-gray-700 border-gray-200 resize-none focus:border-amber-500"
              disabled={isSubmitted}
            />
            {!isSubmitted && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="gap-1.5"
              >
                {savingNotes && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save notes
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Filing reminder */}
        {!isSubmitted && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold text-amber-800 mb-1">Ready to file?</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-amber-700">
              <li>Export this report to PDF for your records</li>
              <li>Log in to <a href="https://www.estv.admin.ch" target="_blank" rel="noopener noreferrer" className="underline">estv.admin.ch ePortal</a></li>
              <li>Enter figures from Section A (Ziffer 302) and Section B (Ziffer 400)</li>
              <li>Submit and pay Section C amount by the deadline</li>
              <li>Come back here and click <strong>&quot;Mark as Submitted&quot;</strong></li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
