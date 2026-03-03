'use client'

import Link from 'next/link'
import { AlertCircle, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatChf } from '@/lib/helpers/format'
import { getDaysUntilDeadline, getMwstDeadline } from '@/lib/helpers/mwst'

interface MwstWidgetProps {
  year:     number
  quarter:  1 | 2 | 3 | 4
  vatPayable: number
  vatCollected: number
  inputTax: number
}

export function MwstWidget({ year, quarter, vatPayable, vatCollected, inputTax }: MwstWidgetProps) {
  const daysLeft = getDaysUntilDeadline(year, quarter)
  const deadline = getMwstDeadline(year, quarter)

  const urgency = daysLeft < 0
    ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', label: `${Math.abs(daysLeft)}d overdue` }
    : daysLeft <= 14
    ? { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700', label: `${daysLeft}d left` }
    : { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-600', label: `${daysLeft} days` }

  return (
    <Card className={`border ${urgency.border} ${urgency.bg}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">MWST — Q{quarter} {year}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Due {deadline.toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${urgency.badge}`}>
            <Clock className="h-3 w-3 inline mr-1" />
            {urgency.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-white/70 border border-white px-3 py-2.5">
            <p className="text-xs text-gray-400">VAT Collected</p>
            <p className="text-sm font-bold text-amber-700 tabular-nums mt-0.5">{formatChf(vatCollected)}</p>
          </div>
          <div className="rounded-lg bg-white/70 border border-white px-3 py-2.5">
            <p className="text-xs text-gray-400">Input Tax</p>
            <p className="text-sm font-bold text-blue-600 tabular-nums mt-0.5">− {formatChf(inputTax)}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2.5 ${vatPayable > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className="text-xs text-gray-400">Net Payable</p>
            <p className={`text-sm font-bold tabular-nums mt-0.5 ${vatPayable > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {formatChf(vatPayable)}
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/mwst"
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:border-amber-400 hover:text-amber-700 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            View full MWST report
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  )
}
