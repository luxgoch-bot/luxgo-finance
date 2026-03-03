import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { formatChf } from '@/lib/helpers/vat'

interface KpiCardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: number        // percentage change vs last period
  variant?: 'default' | 'positive' | 'negative' | 'warning'
  description?: string
}

export function KpiCard({ title, value, icon: Icon, trend, variant = 'default', description }: KpiCardProps) {
  const iconColors = {
    default: 'text-blue-500 bg-blue-50',
    positive: 'text-emerald-500 bg-emerald-50',
    negative: 'text-red-500 bg-red-50',
    warning: 'text-amber-500 bg-amber-50',
  }

  const valueColors = {
    default: 'text-gray-900',
    positive: 'text-emerald-700',
    negative: 'text-red-700',
    warning: 'text-amber-700',
  }

  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className={cn('mt-1 text-2xl font-bold tracking-tight', valueColors[variant])}>
              {formatChf(value)}
            </p>
            {description && (
              <p className="mt-1 text-xs text-gray-400">{description}</p>
            )}
            {trend !== undefined && (
              <p className={cn('mt-1 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs last year
              </p>
            )}
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ml-4', iconColors[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
