import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, formatDate } from '@/lib/utils'

interface Activity {
  id: string
  user: string
  action: string
  timestamp: string
}

interface RecentActivityProps {
  activities: Activity[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(activity.user.split(' ')[0], activity.user.split(' ')[1])}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user}</span>{' '}
                    <span className="text-muted-foreground">{activity.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(activity.timestamp, 'relative')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
