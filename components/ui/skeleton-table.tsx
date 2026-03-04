import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton
              key={j}
              className={`h-8 bg-gray-800 rounded ${j === 0 ? 'w-32' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
      <Skeleton className="h-4 w-24 bg-gray-800" />
      <Skeleton className="h-8 w-40 bg-gray-800" />
      <Skeleton className="h-3 w-32 bg-gray-800" />
    </div>
  )
}
