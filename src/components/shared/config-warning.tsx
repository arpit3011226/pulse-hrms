import { AlertTriangle } from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { problems } from '@/lib/config'

/**
 * Says out loud when Pulse has been deployed without being told something
 * it needs.
 *
 * The one that matters is the public address. Without it, every invitation
 * and reactivation link is built from the browser's own origin, which on a
 * deployed instance is usually right and on a developer's machine is
 * localhost. The link looks completely normal and reaches nobody, so the
 * first anybody knows is a candidate saying it does not work.
 *
 * Shown only to administrators — nobody else can act on it, and a warning
 * aimed at somebody who cannot fix it is just noise. Silent while running
 * locally, because a developer does not need telling that localhost is
 * localhost.
 */
export function ConfigWarning() {
  const { isAdmin, isHR } = usePermissions()
  if (!isAdmin && !isHR) return null

  const found = problems()
  if (found.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {found.map((p) => (
        <div
          key={p.setting}
          className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 text-sm text-amber-900">
            <p className="font-medium">{p.says}</p>
            <p className="mt-0.5 text-xs">
              {p.fix} <span className="font-mono opacity-70">({p.setting})</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
