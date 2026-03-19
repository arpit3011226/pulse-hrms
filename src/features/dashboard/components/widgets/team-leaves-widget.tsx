import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getInitials, formatDate } from '@/lib/utils'
import { useTeamOnLeave, useOrgOnLeave } from '../../hooks/use-dashboard'

interface TeamLeavesWidgetProps {
  employeeId: string | undefined
  isOrgWide: boolean // true for HR/admin/leadership
}

export function TeamLeavesWidget({ employeeId, isOrgWide }: TeamLeavesWidgetProps) {
  const teamQuery = useTeamOnLeave(isOrgWide ? undefined : employeeId)
  const orgQuery = useOrgOnLeave()
  const { data: leaves } = isOrgWide ? orgQuery : teamQuery

  const today = new Date().toISOString().split('T')[0]

  const onLeaveToday = (leaves ?? []).filter(
    (l) => l.start_date <= today && l.end_date >= today && l.status === 'approved'
  )
  const upcoming = (leaves ?? []).filter(
    (l) => l.start_date > today
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-rose-500" />
          {isOrgWide ? 'Who\'s On Leave' : 'Team On Leave'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(leaves ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No one on leave this week</p>
        ) : (
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-2">
              {onLeaveToday.length > 0 && (
                <p className="text-xs font-semibold uppercase text-muted-foreground">Today</p>
              )}
              {onLeaveToday.map((l) => (
                <LeaveRow key={l.id} item={l} />
              ))}
              {upcoming.length > 0 && (
                <p className="mt-2 text-xs font-semibold uppercase text-muted-foreground">Upcoming</p>
              )}
              {upcoming.map((l) => (
                <LeaveRow key={l.id} item={l} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function LeaveRow({ item }: { item: { employee_name: string; avatar_url: string | null; leave_type_name: string; start_date: string; end_date: string; is_half_day: boolean; status: string } }) {
  const nameParts = item.employee_name.split(' ')
  return (
    <div className="flex items-center gap-3 rounded-lg border p-2.5">
      <Avatar className="h-8 w-8">
        <AvatarImage src={item.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(nameParts[0], nameParts[1])}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.employee_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(item.start_date)}
          {item.start_date !== item.end_date && ` - ${formatDate(item.end_date)}`}
          {item.is_half_day && ' (Half day)'}
        </p>
      </div>
      <Badge variant={item.status === 'approved' ? 'default' : 'secondary'} className="text-xs shrink-0">
        {item.leave_type_name}
      </Badge>
    </div>
  )
}
