import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Mail, Phone } from 'lucide-react'
import { getInitials, cn } from '@/lib/utils'
import type { OrgChartEmployee } from '../utils/build-org-tree'

interface OrgChartNodeProps {
  employee: OrgChartEmployee
  childCount: number
  isExpanded: boolean
  isHighlighted: boolean
  showContactInfo: boolean
  onToggle: () => void
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function OrgChartNode({
  employee,
  childCount,
  isExpanded,
  isHighlighted,
  showContactInfo,
  onToggle,
}: OrgChartNodeProps) {
  const fullName = `${employee.first_name} ${employee.last_name}`
  const initials = getInitials(employee.first_name, employee.last_name)
  const avatarColor = getAvatarColor(fullName)

  return (
    <Card
      className={cn(
        'w-52 transition-all hover:shadow-md',
        isHighlighted && 'ring-2 ring-primary shadow-lg'
      )}
    >
      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
        <Link
          to="/employees/$employeeId"
          params={{ employeeId: employee.id }}
          className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={employee.avatar_url || undefined} />
            <AvatarFallback className={cn('text-sm font-medium', avatarColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm leading-tight">{fullName}</p>
            {employee.designation?.title && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {employee.designation.title}
              </p>
            )}
          </div>
        </Link>

        {employee.department?.name && (
          <Badge variant="secondary" className="text-[10px] px-2 py-0">
            {employee.department.name}
          </Badge>
        )}

        {showContactInfo && (
          <div className="text-xs text-muted-foreground space-y-0.5 w-full">
            {employee.email && (
              <p className="flex items-center justify-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{employee.email}</span>
              </p>
            )}
            {employee.phone && (
              <p className="flex items-center justify-center gap-1">
                <Phone className="h-3 w-3 shrink-0" />
                {employee.phone}
              </p>
            )}
          </div>
        )}

        {childCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1 text-muted-foreground"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggle()
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {childCount} report{childCount !== 1 ? 's' : ''}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
