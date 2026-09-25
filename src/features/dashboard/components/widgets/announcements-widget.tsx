import { useState } from 'react'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate, getInitials, humanizeLabel } from '@/lib/utils'
import { useAnnouncements, useDeleteAnnouncement } from '../../hooks/use-dashboard'
import { AnnouncementFormDialog } from './announcement-form-dialog'
import type { AnnouncementWithCreator } from '@/types/database.types'

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

interface AnnouncementsWidgetProps {
  canManage: boolean
  userRole: string | undefined
  userDepartmentId: string | null | undefined
}

export function AnnouncementsWidget({ canManage, userRole, userDepartmentId }: AnnouncementsWidgetProps) {
  const [showForm, setShowForm] = useState(false)
  const { data: rawAnnouncements } = useAnnouncements()
  const deleteMutation = useDeleteAnnouncement()

  // Client-side audience filtering
  const announcements = (rawAnnouncements ?? []).filter((a) => {
    if (a.audience_type === 'all') return true
    if (a.audience_type === 'roles' && userRole && a.audience_roles.includes(userRole)) return true
    if (a.audience_type === 'departments' && userDepartmentId && a.audience_department_ids.includes(userDepartmentId)) return true
    // Admins can always see all
    if (userRole === 'super_admin' || userRole === 'hr_admin') return true
    return false
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-purple-500" />
            Announcements
          </CardTitle>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No announcements</p>
        ) : (
          <div className="overflow-y-auto max-h-[280px]">
            <div className="space-y-3">
              {announcements.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  canManage={canManage}
                  onDelete={() => deleteMutation.mutate(a.id)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
      {showForm && <AnnouncementFormDialog open={showForm} onClose={() => setShowForm(false)} />}
    </Card>
  )
}

function AnnouncementCard({
  announcement: a,
  canManage,
  onDelete,
}: {
  announcement: AnnouncementWithCreator
  canManage: boolean
  onDelete: () => void
}) {
  const creator = a.creator
  return (
    <div className={`rounded-lg border p-3 ${a.is_pinned ? 'border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/10' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {a.is_pinned && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pinned</Badge>}
            <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[a.priority] ?? PRIORITY_COLORS.normal}`}>
              {humanizeLabel(a.priority)}
            </Badge>
            {a.audience_type !== 'all' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {a.audience_type === 'roles' ? a.audience_roles.join(', ') : 'Select depts'}
              </Badge>
            )}
          </div>
          <h4 className="mt-1.5 text-sm font-semibold">{a.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{a.content}</p>
        </div>
        {canManage && (
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {creator && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={creator.avatar_url ?? undefined} />
            <AvatarFallback className="text-[8px]">
              {getInitials(creator.first_name ?? '', creator.last_name ?? '')}
            </AvatarFallback>
          </Avatar>
        )}
        <span className="text-[11px] text-muted-foreground">
          {creator ? `${creator.first_name} ${creator.last_name}` : 'System'}
          {' · '}
          {formatDate(a.published_at, 'relative')}
        </span>
      </div>
    </div>
  )
}
