import * as React from 'react'
import { CalendarRange, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  ALL_TIME,
  DateRangeContext,
  PRESET_LABELS,
  PRESET_ORDER,
  isoDate,
  rangeForPreset,
  useDateRange,
  type DateRange,
  type DateRangeContextValue,
  type PresetKey,
} from '@/hooks/use-date-range'

/**
 * Holds the date range for everything rendered inside it.
 *
 * It starts at "All time" on purpose. A filter that quietly hides last year's
 * records the moment you open a screen is the sort of thing people only notice
 * when a number does not add up.
 */
export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = React.useState<DateRange>(ALL_TIME)

  const value = React.useMemo<DateRangeContextValue>(() => {
    const { from, to } = range
    return {
      range,
      setRange,
      isFiltering: !!from || !!to,
      inRange: (value) => {
        if (!from && !to) return true
        if (value === null || value === undefined || value === '') return true
        const d = typeof value === 'string' ? value.slice(0, 10) : isoDate(value)
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      },
    }
  }, [range])

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
}

/** The control itself, meant to sit beside a module's title. */
export function DateRangeFilter({ className }: { className?: string }) {
  const { range, setRange, isFiltering } = useDateRange()
  const [open, setOpen] = React.useState(false)

  const label = range.preset === 'custom'
    ? `${range.from || 'Start'} to ${range.to || 'Today'}`
    : PRESET_LABELS[range.preset]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={isFiltering ? 'default' : 'outline'} size="sm">
            <CalendarRange className="mr-2 h-3.5 w-3.5" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Period</Label>
            <Select
              value={range.preset}
              onValueChange={(v) => {
                if (v === 'custom') {
                  setRange({ ...range, preset: 'custom' })
                } else {
                  setRange(rangeForPreset(v as PresetKey))
                  setOpen(false)
                }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESET_ORDER.map((key) => (
                  <SelectItem key={key} value={key}>{PRESET_LABELS[key]}</SelectItem>
                ))}
                <SelectItem value="custom">{PRESET_LABELS.custom}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {range.preset === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={range.from ?? ''}
                  onChange={(e) =>
                    setRange({ ...range, preset: 'custom', from: e.target.value || null })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={range.to ?? ''}
                  onChange={(e) =>
                    setRange({ ...range, preset: 'custom', to: e.target.value || null })
                  }
                />
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {isFiltering && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setRange(ALL_TIME)}
          title="Show all dates"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Clear the date filter</span>
        </Button>
      )}
    </div>
  )
}
