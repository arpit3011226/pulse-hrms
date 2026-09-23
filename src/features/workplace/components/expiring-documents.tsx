import { useQuery } from '@tanstack/react-query'
import { CalendarClock, FileWarning } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { formatDate } from '@/lib/utils'

/**
 * F32 — documents about to expire.
 *
 * The expiry_date columns already existed on both document tables; nothing ever
 * looked at them. A passport or a work permit expiring is not something to find
 * out about on the day.
 */
function daysUntil(date: string): number {
  return Math.round((new Date(date).getTime() - Date.now()) / 86400000)
}

export function ExpiringDocuments({ withinDays = 90 }: { withinDays?: number }) {
  const { organization } = useAuth()

  const { data } = useQuery({
    queryKey: ['expiring-documents', organization?.id, withinDays],
    enabled: !!organization?.id,
    queryFn: async () => {
      const until = new Date()
      until.setDate(until.getDate() + withinDays)
      const cutoff = until.toISOString().split('T')[0]

      const [identity, general] = await Promise.all([
        supabase
          .from('employee_identity_documents')
          .select('id, document_type, document_number, expiry_date, employee:employees!employee_identity_documents_employee_id_fkey(id, first_name, last_name, employee_code)')
          .not('expiry_date', 'is', null)
          .lte('expiry_date', cutoff)
          .order('expiry_date'),
        supabase
          .from('employee_documents')
          .select('id, document_name, document_category, expiry_date, employee:employees!employee_documents_employee_id_fkey(id, first_name, last_name, employee_code)')
          .not('expiry_date', 'is', null)
          .lte('expiry_date', cutoff)
          .order('expiry_date'),
      ])

      const rows = [
        ...((identity.data ?? []) as Array<Record<string, unknown>>).map((d) => ({
          id: d.id as string,
          label: (d.document_type as string) ?? 'Identity document',
          detail: (d.document_number as string) ?? '',
          expiry: d.expiry_date as string,
          employee: d.employee as Record<string, unknown> | null,
        })),
        ...((general.data ?? []) as Array<Record<string, unknown>>).map((d) => ({
          id: d.id as string,
          label: (d.document_name as string) ?? 'Document',
          detail: (d.document_category as string) ?? '',
          expiry: d.expiry_date as string,
          employee: d.employee as Record<string, unknown> | null,
        })),
      ]
      return rows.sort((a, b) => a.expiry.localeCompare(b.expiry))
    },
  })

  const rows = data ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4" /> Documents expiring
        </CardTitle>
        <CardDescription>
          Within the next {withinDays} days, plus anything already expired.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nothing expiring soon.
          </p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => {
              const left = daysUntil(r.expiry)
              const expired = left < 0
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.employee
                        ? `${r.employee.first_name} ${r.employee.last_name}`
                        : 'Unknown'}
                      {r.detail ? ` · ${r.detail}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatDate(r.expiry)}</span>
                    {expired ? (
                      <Badge className="bg-rose-100 text-rose-800">
                        <FileWarning className="mr-1 h-3 w-3" />
                        Expired
                      </Badge>
                    ) : left <= 30 ? (
                      <Badge className="bg-amber-100 text-amber-800">{left} days</Badge>
                    ) : (
                      <Badge variant="outline">{left} days</Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
