"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface DateRangePickerProps {
  className?: string
  date: { from?: Date; to?: Date } | undefined
  onDateChange: (date: { from?: Date; to?: Date } | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [fromDate, setFromDate] = React.useState<string>(
    date?.from ? format(date.from, "yyyy-MM-dd") : ""
  )
  const [toDate, setToDate] = React.useState<string>(
    date?.to ? format(date.to, "yyyy-MM-dd") : ""
  )

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFromDate(value)
    const newDate = {
      from: value ? new Date(value) : undefined,
      to: date?.to
    }
    onDateChange(newDate)
  }

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setToDate(value)
    const newDate = {
      from: date?.from,
      to: value ? new Date(value) : undefined
    }
    onDateChange(newDate)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={fromDate}
            onChange={handleFromChange}
            className="w-[140px]"
            placeholder="From"
          />
        </div>
        <span className="text-muted-foreground">to</span>
        <div className="flex items-center">
          <Input
            type="date"
            value={toDate}
            onChange={handleToChange}
            className="w-[140px]"
            placeholder="To"
          />
        </div>
      </div>
    </div>
  )
}