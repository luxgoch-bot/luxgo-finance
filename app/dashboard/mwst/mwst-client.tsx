'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getOrCreateMwstReport } from '@/app/actions/mwst'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, ChevronRight, Clock, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { formatChf } from '@/lib/helpers/format'
import { getQuarterDateRange } from '@/lib/helpers/mwst'
import type { Profile, MwstReport, Income, Expense, TaxYear } from '@/types'
import type { MwstQuarterSummary } from '@/lib/helpers/mwst'
import { aggregateQuarterlyVAT } from '@/lib/helpers/mwst'

interface MwstOverviewClientProps {
  profiles:           Profile[]
  mwstReports:        (MwstReport & { tax_years?: { year: number } })[]
  taxYears:           TaxYear[]
  yearlySummaries:    MwstQuarterSummary[]
  currentYear:        number
  currentQuarter:     1 | 2 | 3 | 4
  daysUntilDeadline:  number
  allIncome:          Income[]
  allExpenses:        Expense[]
}

const QUARTER_MONTHS: Record<number, string> = {
  1: 'Jan – Mar',
  2: 'Apr – Jun',
  3: 'Jul – Sep',
  4: 'Oct – Dec',
}

export function MwstOverviewClient({
  profiles,
  mwstReports,
  taxYears,
  yearlySummaries,
  currentYear,
  currentQuarter,
  daysUntilDeadline,
  allIncome,
  allExpenses,
}: MwstOverviewClientProps) {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [openingReport, setOpeningReport] = useState<string | null>(null)

  const businessProfile = profiles.find(p => p.type === 'business') ?? profiles[0]
  const defaultProfileId = businessProfile?.id ?? profiles[0]?.id ?? ''

  const [selectedProfile, setSelectedProfile] = useState<string>(defaultProfileId)

  // Years available from tax_years + current year
  const yearSet = new Set([currentYear, ...taxYears.map(ty => ty.year)])
  const years   = Array.from(yearSet).sort((a, b) => b - a)

  // Compute summaries for selected profile + year
  const summaries: MwstQuarterSummary[] = ([1, 2, 3, 4] as const).map(q =>
    aggregateQuarterlyVAT(selectedProfile, selectedYear, q, allIncome, allExpenses)
  )

  // Find existing DB reports for selected profile + year
  function findReport(quarter: number): MwstReport | undefined {
    return mwstReports.find(r =>
      r.profile_id === selectedProfile &&
      r.quarter === quarter &&
      r.tax_years?.year === selectedYear
    ) as MwstReport | undefined
  }

  async function handleOpenReport(quarter: 1 | 2 | 3 | 4) {
    const key = `${selectedYear}-Q${quarter}`
    setOpeningReport(key)
    const result = await getOrCreateMwstReport(selectedProfile, selectedYear, quarter)
    setOpeningReport(null)
    if (result.data) {
      window.location.href = `/dashboard/mwst/${result.data.id}`
    }
  }

  // Deadline urgency
  const deadlineColor = daysUntilDeadline < 0
    ? 'text-red-600 bg-red-50 border-red-200'
    : daysUntilDeadline <= 14
    ? 'text-orange-600 bg-orange-50 border-orange-200'
    : 'text-emerald-600 bg-emerald-50 border-emerald-200'

  const totalVatPayable = summaries.reduce((s, q) => s + q.vatPayable, 0)
  const totalVatYtd     = summaries.reduce((s, q) => s + q.totalVatCollected, 0)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900">MWST Reports</h1>
          <p className="text-xs text-gray-400">Mehrwertsteuer — Quarterly Reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="h-8 w-44 text-xs border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="h-8 w-24 text-xs border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-5">
        {/* Dashboard widgets row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Deadline countdown */}
          <Card className={`border ${deadlineColor}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${deadlineColor}`}>
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Next Deadline</p>
                <p className="text-lg font-bold mt-0.5">
                  {daysUntilDeadline < 0
                    ? `${Math.abs(daysUntilDeadline)}d overdue`
                    : daysUntilDeadline === 0
                    ? 'Due today'
                    : `${daysUntilDeadline} days`}
                </p>
                <p className="text-xs opacity-60 mt-0.5">
                  Q{currentQuarter} {currentYear} filing
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total VAT collected YTD */}
          <Card className="border-gray-200">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">VAT Collected YTD</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatChf(totalVatYtd)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Output tax {selectedYear}</p>
              </div>
            </CardContent>
          </Card>

          {/* Estimated VAT payable */}
          <Card className="border-gray-200">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Est. VAT Payable YTD</p>
                <p className="text-lg font-bold text-red-600 mt-0.5">{formatChf(totalVatPayable)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Net after input tax</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quarterly reports table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">
              Quarterly Reports — {selectedYear}
            </h2>
            <p className="text-xs text-gray-400">Click a row to view full report</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Quarter</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Period</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Revenue</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">VAT Collected</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Input Tax</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">VAT Payable</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaries.map((s, idx) => {
                  const q = s.quarter
                  const report = findReport(q)
                  const isCurrentQ = q === currentQuarter && selectedYear === currentYear
                  const key = `${selectedYear}-Q${q}`
                  const isOpening = openingReport === key
                  const { start, end } = getQuarterDateRange(selectedYear, q)

                  return (
                    <tr
                      key={q}
                      className={`hover:bg-amber-50/30 transition-colors cursor-pointer group ${isCurrentQ ? 'bg-amber-50/20' : ''}`}
                      onClick={() => handleOpenReport(q)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">Q{q}</span>
                          {isCurrentQ && (
                            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Current</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {QUARTER_MONTHS[q]}<br />
                        <span className="text-gray-400">{start} → {end}</span>
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-medium text-gray-900">
                        {formatChf(s.totalGrossIncome)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-amber-700 font-medium">
                        {formatChf(s.totalVatCollected)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums text-blue-600 font-medium">
                        {formatChf(s.totalInputTax)}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums font-bold">
                        <span className={s.vatPayable > 0 ? 'text-red-600' : s.vatRefundable > 0 ? 'text-emerald-600' : 'text-gray-400'}>
                          {s.vatPayable > 0
                            ? formatChf(s.vatPayable)
                            : s.vatRefundable > 0
                            ? `↩ ${formatChf(s.vatRefundable)}`
                            : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {report ? (
                          <Badge
                            variant="outline"
                            className={report.status === 'submitted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }
                          >
                            {report.status === 'submitted' ? '✓ Submitted' : '◉ Draft'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-400 border-gray-200">
                            Not started
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isOpening ? (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-500 mx-auto" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-amber-500 mx-auto transition-colors" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Year totals */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={2} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {selectedYear} Totals
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900 tabular-nums">
                    {formatChf(summaries.reduce((s, q) => s + q.totalGrossIncome, 0))}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-amber-700 tabular-nums">
                    {formatChf(summaries.reduce((s, q) => s + q.totalVatCollected, 0))}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-blue-600 tabular-nums">
                    {formatChf(summaries.reduce((s, q) => s + q.totalInputTax, 0))}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-red-600 tabular-nums">
                    {formatChf(summaries.reduce((s, q) => s + q.vatPayable, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Filing info */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">📋 Filing information</p>
          <ul className="space-y-1 text-xs text-blue-700">
            <li>• File quarterly MWST returns at <a href="https://www.estv.admin.ch" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">estv.admin.ch</a> (ePortal)</li>
            <li>• Deadline: 60 days after quarter end — approx. 28 Feb, 31 May, 31 Aug, 30 Nov</li>
            <li>• Reporting method: <strong>vereinbarte Entgelte</strong> (accrual basis)</li>
            <li>• Click a quarter row to generate a full report with PDF export</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
