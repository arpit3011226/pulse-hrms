import { Laptop, PackageCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useEmployeeAssets } from '../hooks/use-assets'
import { ASSET_TYPE_LABELS } from '../api/assets.api'
import { formatDate } from '@/lib/utils'

/**
 * F29 — what this person still holds.
 *
 * Shown inside exit clearance so nobody is cleared while a laptop is
 * unaccounted for. Quiet when there is nothing outstanding.
 */
export function OutstandingAssets({ employeeId }: { employeeId: string | undefined }) {
  const { data: assets } = useEmployeeAssets(employeeId)
  const rows = assets ?? []

  if (!employeeId) return null

  if (rows.length === 0) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm">
        <PackageCheck className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>No company assets outstanding.</span>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Laptop className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="text-sm font-medium">
          {rows.length} asset{rows.length === 1 ? '' : 's'} still to come back
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate">{a.asset?.name ?? 'Asset'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {a.asset?.asset_code ?? ''}
                {a.asset?.asset_type ? ` · ${ASSET_TYPE_LABELS[a.asset.asset_type] ?? a.asset.asset_type}` : ''}
                {` · issued ${formatDate(a.assigned_on)}`}
              </p>
            </div>
            <Badge
              className={
                a.status === 'pending_return'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-blue-100 text-blue-800'
              }
            >
              {a.status === 'pending_return' ? 'Awaiting return' : 'With employee'}
            </Badge>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Record returns in Assets before completing clearance.
      </p>
    </div>
  )
}
