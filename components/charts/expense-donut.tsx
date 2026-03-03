'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatChf } from '@/lib/helpers/vat'

interface CategoryData {
  category: string
  amount: number
}

interface ExpenseDonutProps {
  data: CategoryData[]
}

const CATEGORY_COLORS: Record<string, string> = {
  vehicle:     '#f59e0b',
  fuel:        '#ef4444',
  insurance:   '#3b82f6',
  maintenance: '#8b5cf6',
  office:      '#06b6d4',
  marketing:   '#ec4899',
  salary:      '#10b981',
  tax:         '#f97316',
  other:       '#6b7280',
}

const CATEGORY_LABELS: Record<string, string> = {
  vehicle:     'Vehicle',
  fuel:        'Fuel',
  insurance:   'Insurance',
  maintenance: 'Maintenance',
  office:      'Office',
  marketing:   'Marketing',
  salary:      'Salary',
  tax:         'Tax',
  other:       'Other',
}

export function ExpenseDonut({ data }: ExpenseDonutProps) {
  const total = data.reduce((s, d) => s + d.amount, 0)

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-800">
          Expense Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
            No expense data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={2}
                dataKey="amount"
                nameKey="category"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] ?? '#6b7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  formatChf(typeof value === 'string' ? parseFloat(value) : (value ?? 0)),
                  CATEGORY_LABELS[String(name)] ?? String(name),
                ]}
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f9fafb',
                  fontSize: '13px',
                }}
              />
              <Legend
                formatter={(value) => CATEGORY_LABELS[value] ?? value}
                wrapperStyle={{ fontSize: '11px', color: '#6b7280' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Total label */}
        {data.length > 0 && (
          <p className="text-center text-xs text-gray-400 -mt-2">
            Total: <span className="font-semibold text-gray-700">{formatChf(total)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
