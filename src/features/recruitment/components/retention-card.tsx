import { useState } from 'react'
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import {
  useDocumentsDueForPurge, usePurgeCandidateDocuments, useSetRetentionDays,
} from '../hooks/use-preboarding'
import type { PurgeCandidate } from '../api/preboarding.api'

/**
 * Documents from people we did not hire, past the time we have a reason to
 * keep them.
 *
 * Deliberately a button rather than a scheduled job. Pulse has no server it
 * can rely on across the move to Azure, and a purge that runs itself where
 * nobody is watching is how documents disappear that somebody needed. Making
 * the obligation visible is also far easier to evidence to a regulator than
 * a cron job nobody can describe.
 */
export function RetentionCard() {
  const { organization } = useAuth()
  // August's choice: the administrator sets how long documents are kept. HR
  // runs the erasing, which is the part that needs doing often.
  const { isAdmin } = usePermissions()
  const { data: due, isLoading } = useDocumentsDueForPurge()
  const purge = usePurgeCandidateDocuments()
  const setDays = useSetRetentionDays()

  const current = (organization as { candidate_data_retention_days?: number } | null)
    ?.candidate_data_retention_days ?? 180
  const [days, setLocalDays] = useState(String(current))
  const [confirming, setConfirming] = useState<PurgeCandidate | null>(null)

  const rows = due ?? []

  async function handlePurge() {
    if (!confirming) return
    try {
      const result = await purge.mutateAsync({
        candidate_id: confirming.candidate_id,
        storage_paths: confirming.storage_paths ?? [],
      })
      toast.success(
        `Erased ${result.filesRemoved} file${result.filesRemoved === 1 ? '' : 's'}. ` +
          'The record of what was asked for is kept.'
      )
      setConfirming(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not erase them')
    }
  }

  return (
    <>
      <Card className={rows.length > 0 ? 'border-amber-200 bg-amber-50/40' : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Keeping documents no longer than needed
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Under the DPDP Act, personal data must be erased once the purpose it was collected
            for has been served. A PAN card collected to assess somebody we then turned down has
            served its purpose. The main obligations apply from 13 May 2027.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Keep for (days after their last application closed)</Label>
              <Input
                type="number"
                min={30}
                max={3650}
                className="w-36"
                value={days}
                disabled={!isAdmin}
                onChange={(e) => setLocalDays(e.target.value)}
              />
            </div>
            {isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                disabled={setDays.isPending || Number(days) === current || !Number(days)}
                onClick={async () => {
                  if (!organization?.id) return
                  try {
                    await setDays.mutateAsync({ orgId: organization.id, days: Number(days) })
                    toast.success('Saved')
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not save it')
                  }
                }}
              >
                Save
              </Button>
            ) : (
              <p className="pb-2 text-xs text-muted-foreground">
                Set by an administrator. You can still erase what is overdue below.
              </p>
            )}
          </div>

          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing is overdue. Candidates still in the running are never listed here, however
              old their application.
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                {rows.length} {rows.length === 1 ? 'person has' : 'people have'} documents past
                the retention period
              </p>
              {rows.map((r) => (
                <div
                  key={r.candidate_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.candidate_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.document_count} document{r.document_count === 1 ? '' : 's'} · closed{' '}
                      {formatDate(r.closed_on)} · held {r.days_held} days
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirming(r)}
                    disabled={purge.isPending}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Erase
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        title="Erase these documents?"
        description={
          confirming
            ? `${confirming.document_count} file${confirming.document_count === 1 ? '' : 's'} belonging to ${confirming.candidate_name} will be deleted and cannot be recovered. The record of what was asked for stays, so you can still show what was collected — you just will not hold it.`
            : ''
        }
        confirmLabel="Erase them"
        variant="destructive"
        isLoading={purge.isPending}
        onConfirm={handlePurge}
      />
    </>
  )
}
