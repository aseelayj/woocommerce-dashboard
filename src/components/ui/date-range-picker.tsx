import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps {
  value?: DateRange
  onValueChange?: (date: DateRange | undefined) => void
  className?: string
}

export function DateRangePicker({
  value,
  onValueChange,
  className,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value)
  const [selectedPreset, setSelectedPreset] = React.useState<string>("")

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate)
    setSelectedPreset("")
    onValueChange?.(newDate)
  }

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let from: Date
    let to: Date = new Date()
    to.setHours(23, 59, 59, 999)

    switch (preset) {
      case "today":
        from = new Date(today)
        to = new Date(today)
        to.setHours(23, 59, 59, 999)
        break
      case "yesterday":
        from = new Date(today)
        from.setDate(from.getDate() - 1)
        to = new Date(from)
        to.setHours(23, 59, 59, 999)
        break
      case "last7days":
        from = new Date(today)
        from.setDate(from.getDate() - 6)
        break
      case "last30days":
        from = new Date(today)
        from.setDate(from.getDate() - 29)
        break
      case "thisMonth":
        from = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case "lastMonth":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        to = new Date(today.getFullYear(), today.getMonth(), 0)
        to.setHours(23, 59, 59, 999)
        break
      case "thisYear":
        from = new Date(today.getFullYear(), 0, 1)
        break
      default:
        return
    }

    const newRange = { from, to }
    setDate(newRange)
    onValueChange?.(newRange)
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Quick select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="last7days">Last 7 days</SelectItem>
          <SelectItem value="last30days">Last 30 days</SelectItem>
          <SelectItem value="thisMonth">This month</SelectItem>
          <SelectItem value="lastMonth">Last month</SelectItem>
          <SelectItem value="thisYear">This year</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}