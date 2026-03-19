import { Cake, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInitials } from '@/lib/utils'
import { useUpcomingBirthdays, useUpcomingAnniversaries } from '../../hooks/use-dashboard'
import type { UpcomingPerson } from '../../api/dashboard.api'

export function BirthdaysAnniversariesWidget() {
  const { data: birthdays } = useUpcomingBirthdays()
  const { data: anniversaries } = useUpcomingAnniversaries()

  return (
    <Card>
      <CardHeader className="pb-2">
        <Tabs defaultValue="birthdays" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="birthdays" className="text-xs">
              <Cake className="mr-1.5 h-3.5 w-3.5" />
              Birthdays ({birthdays?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="anniversaries" className="text-xs">
              <Award className="mr-1.5 h-3.5 w-3.5" />
              Anniversaries ({anniversaries?.length ?? 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="birthdays" className="mt-3">
            <PersonList items={birthdays ?? []} type="birthday" />
          </TabsContent>
          <TabsContent value="anniversaries" className="mt-3">
            <PersonList items={anniversaries ?? []} type="anniversary" />
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  )
}

function PersonList({ items, type }: { items: UpcomingPerson[]; type: 'birthday' | 'anniversary' }) {
  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No upcoming {type === 'birthday' ? 'birthdays' : 'anniversaries'}
      </p>
    )
  }

  return (
    <div className="overflow-y-auto max-h-[200px]">
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border p-2.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={p.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(p.first_name, p.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {p.first_name} {p.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {p.department_name ?? 'No department'}
                {type === 'anniversary' && p.years && ` · ${p.years} year${p.years > 1 ? 's' : ''}`}
              </p>
            </div>
            <Badge
              variant={p.days_away === 0 ? 'default' : 'secondary'}
              className={`text-xs shrink-0 ${p.days_away === 0 ? 'bg-pink-500' : ''}`}
            >
              {p.days_away === 0
                ? 'Today!'
                : p.days_away === 1
                  ? 'Tomorrow'
                  : `${p.days_away}d`}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
