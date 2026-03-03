import { formatChf } from '@/lib/helpers/format'

interface SummaryBarProps {
  totalGross: number
  totalVat: number
  totalNet: number
  label?: string
  count?: number
}

export function SummaryBar({ totalGross, totalVat, totalNet, label = 'Total', count }: SummaryBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
      {count !== undefined && (
        <div className="mr-2">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm font-semibold text-gray-700">{count} records</p>
        </div>
      )}
      <div className="flex flex-1 flex-wrap gap-6">
        <div>
          <p className="text-xs text-gray-400">Total Gross</p>
          <p className="text-base font-bold text-gray-900 tabular-nums">{formatChf(totalGross)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Total VAT</p>
          <p className="text-base font-bold text-amber-600 tabular-nums">{formatChf(totalVat)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Total Net</p>
          <p className="text-base font-bold text-gray-700 tabular-nums">{formatChf(totalNet)}</p>
        </div>
      </div>
    </div>
  )
}
