import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Employee } from '@/types/database.types'

interface HubProfileCardProps {
  employee: Employee & {
    department?: { id: string; name: string } | null
    designation?: { id: string; title: string } | null
  }
  managerName: string | null
  ctcDisplay: string | null
}

function formatJoinDate(date: string | null): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export function HubProfileCard({ employee, managerName, ctcDisplay }: HubProfileCardProps) {
  const isExiting = ['on_notice', 'resigned', 'terminated', 'absconding'].includes(employee.status)

  return (
    <div className="rounded-xl border bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-white p-6">
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
          <AvatarImage src={employee.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {getInitials(employee.first_name, employee.last_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {employee.designation?.title || 'No designation'}
                {employee.department?.name && ` · ${employee.department.name}`}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {employee.employee_code || 'No code'}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isExiting
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}
            >
              {isExiting ? 'Exiting' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-4 divide-x rounded-lg border bg-white/80">
        <StatItem label="Joined" value={formatJoinDate(employee.date_of_joining)} />
        <StatItem label="Manager" value={managerName || '-'} />
        <StatItem label="Department" value={employee.department?.name || '-'} />
        <StatItem label="CTC" value={ctcDisplay || '-'} />
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
