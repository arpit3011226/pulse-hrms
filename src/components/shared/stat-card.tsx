import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: { value: number; trend: 'up' | 'down' }
  icon: LucideIcon
  description?: string
  className?: string
  /** Color key for the icon badge — maps to predefined vibrant palettes */
  color?: 'purple' | 'blue' | 'amber' | 'emerald' | 'rose' | 'cyan' | 'orange' | 'indigo' | 'teal' | 'pink'
}

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  purple:  { bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-600 dark:text-purple-400',  ring: 'ring-purple-200 dark:ring-purple-800' },
  blue:    { bg: 'bg-blue-100 dark:bg-blue-900/30',      text: 'text-blue-600 dark:text-blue-400',      ring: 'ring-blue-200 dark:ring-blue-800' },
  amber:   { bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-600 dark:text-amber-400',    ring: 'ring-amber-200 dark:ring-amber-800' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800' },
  rose:    { bg: 'bg-rose-100 dark:bg-rose-900/30',      text: 'text-rose-600 dark:text-rose-400',      ring: 'ring-rose-200 dark:ring-rose-800' },
  cyan:    { bg: 'bg-cyan-100 dark:bg-cyan-900/30',      text: 'text-cyan-600 dark:text-cyan-400',      ring: 'ring-cyan-200 dark:ring-cyan-800' },
  orange:  { bg: 'bg-orange-100 dark:bg-orange-900/30',  text: 'text-orange-600 dark:text-orange-400',  ring: 'ring-orange-200 dark:ring-orange-800' },
  indigo:  { bg: 'bg-indigo-100 dark:bg-indigo-900/30',  text: 'text-indigo-600 dark:text-indigo-400',  ring: 'ring-indigo-200 dark:ring-indigo-800' },
  teal:    { bg: 'bg-teal-100 dark:bg-teal-900/30',      text: 'text-teal-600 dark:text-teal-400',      ring: 'ring-teal-200 dark:ring-teal-800' },
  pink:    { bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-600 dark:text-pink-400',      ring: 'ring-pink-200 dark:ring-pink-800' },
}

export function StatCard({ title, value, change, icon: Icon, description, className, color = 'purple' }: StatCardProps) {
  const palette = COLOR_MAP[color] ?? COLOR_MAP.purple

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p className={cn(
                'text-xs font-medium',
                change.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
              )}>
                {change.trend === 'up' ? '+' : '-'}{Math.abs(change.value)}%
                <span className="ml-1 text-muted-foreground">from last month</span>
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl ring-1', palette.bg, palette.ring)}>
            <Icon className={cn('h-6 w-6', palette.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
