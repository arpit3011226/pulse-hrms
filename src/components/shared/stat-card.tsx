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
}

export function StatCard({ title, value, change, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card className={cn('', className)}>
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
