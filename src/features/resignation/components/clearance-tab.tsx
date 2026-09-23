import { useState } from 'react'
import { Loader2, ShieldCheck, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OutstandingAssets } from '@/features/assets/components/outstanding-assets'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAllPendingClearances } from '../hooks/use-clearance'
import { ClearanceActionDialog } from './clearance-action-dialog'
import { formatDate } from '@/lib/utils'
import type { ExitClearance } from '@/types/database.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClearanceWithRelations = ExitClearance & { exit_record?: any }

interface GroupedClearances {
  exitRecordId: string
  employeeId: string | null
  employeeName: string
  department: string
  resignationDate: string | null
  lastWorkingDate: string | null
  clearances: ClearanceWithRelations[]
}

function groupClearances(clearances: ClearanceWithRelations[]): GroupedClearances[] {
  const map = new Map<string, GroupedClearances>()

  for (const c of clearances) {
    const exitId = c.exit_record_id
    if (!map.has(exitId)) {
      const emp = c.exit_record?.employee
      map.set(exitId, {
        exitRecordId: exitId,
        employeeId: emp?.id ?? null,
        employeeName: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        department: emp?.department?.name || '-',
        resignationDate: c.exit_record?.resignation_date || null,
        lastWorkingDate: c.exit_record?.last_working_date || null,
        clearances: [],
      })
    }
    map.get(exitId)!.clearances.push(c)
  }

  return Array.from(map.values())
}

interface ClearanceTabProps {
  approverEmployeeId: string
}

export function ClearanceTab({ approverEmployeeId }: ClearanceTabProps) {
  const { data: clearances, isLoading } = useAllPendingClearances()
  const [selectedClearance, setSelectedClearance] = useState<ClearanceWithRelations | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!clearances || clearances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">All Clear</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          There are no pending clearance items at this time.
        </p>
      </div>
    )
  }

  const grouped = groupClearances(clearances as ClearanceWithRelations[])

  return (
    <>
      <div className="space-y-4">
        {grouped.map((group) => {
          const cleared = group.clearances.filter((c) => c.clearance_status === 'no_objection').length
          const total = group.clearances.length

          return (
            <Card key={group.exitRecordId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                      {group.employeeName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{group.employeeName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{group.department}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {cleared}/{total} cleared
                  </Badge>
                </div>
                {(group.resignationDate || group.lastWorkingDate) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Resigned: {group.resignationDate ? formatDate(group.resignationDate) : '-'}
                    {' '}&middot;{' '}
                    LWD: {group.lastWorkingDate ? formatDate(group.lastWorkingDate) : '-'}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <OutstandingAssets employeeId={group.employeeId ?? undefined} />
                <div className="mt-3 space-y-2">
                  {group.clearances.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{c.department_name}</p>
                          {c.cleared_at && (
                            <p className="text-xs text-muted-foreground">
                              Cleared on {formatDate(c.cleared_at)}
                              {c.cleared_by && ` by ${c.cleared_by}`}
                            </p>
                          )}
                          {c.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">{c.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.clearance_status} />
                        {c.clearance_status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedClearance(c)
                              setDialogOpen(true)
                            }}
                          >
                            Submit NOC
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ClearanceActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clearance={selectedClearance}
        approverEmployeeId={approverEmployeeId}
      />
    </>
  )
}
