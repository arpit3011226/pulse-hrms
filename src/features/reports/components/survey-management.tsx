import { useState } from 'react'
import { format } from 'date-fns'
import {
  Plus,
  MoreHorizontal,
  ClipboardList,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePermissions } from '@/hooks/use-permissions'
import {
  useSurveys,
  useSurveyResponseCounts,
  useUpdateSurvey,
  useDeleteSurvey,
} from '../hooks/use-surveys'
import { SurveyBuilderDialog } from './survey-builder-dialog'
import { SurveyResultsView } from './survey-results-view'
import type { SurveyWithQuestions, Survey } from '@/types/database.types'

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>
    case 'closed':
      return <Badge variant="secondary">Closed</Badge>
    default:
      return <Badge variant="outline">Draft</Badge>
  }
}

export function SurveyManagement() {
  const { isAdmin, isHR } = usePermissions()
  const { data: surveys, isLoading } = useSurveys()
  const { data: responseCounts } = useSurveyResponseCounts()
  const updateSurvey = useUpdateSurvey()
  const deleteSurvey = useDeleteSurvey()

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<SurveyWithQuestions | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null)
  const [viewingResultsId, setViewingResultsId] = useState<string | null>(null)

  if (!isAdmin && !isHR) return null

  // Show results view if viewing a specific survey
  if (viewingResultsId) {
    return <SurveyResultsView surveyId={viewingResultsId} onBack={() => setViewingResultsId(null)} />
  }

  function handleEdit(survey: Survey) {
    // Cast to SurveyWithQuestions -- the builder will load questions if needed
    setEditingSurvey(survey as SurveyWithQuestions)
    setBuilderOpen(true)
  }

  function handleCreate() {
    setEditingSurvey(null)
    setBuilderOpen(true)
  }

  async function handleStatusChange(surveyId: string, orgId: string, status: 'active' | 'closed') {
    try {
      await updateSurvey.mutateAsync({
        surveyId,
        orgId,
        data: { status },
      })
      toast.success(`Survey ${status === 'active' ? 'activated' : 'closed'}`)
    } catch {
      toast.error('Failed to update survey status')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteSurvey.mutateAsync(deleteTarget.id)
      toast.success('Survey deleted')
    } catch {
      toast.error('Failed to delete survey')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Surveys</h3>
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Create Survey
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !surveys || surveys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mb-3" />
          <p className="text-sm">No surveys yet</p>
          <p className="text-xs mt-1">Create your first survey to gather employee feedback.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-center">Responses</TableHead>
                <TableHead className="text-center">Anonymous</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((s) => {
                const count = responseCounts?.get(s.id) ?? 0
                const rulesCount = s.target_rules?.length ?? 0
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rulesCount === 0
                        ? 'All Employees'
                        : `${rulesCount} condition${rulesCount > 1 ? 's' : ''}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(s.start_date), 'MMM d, yyyy')} &ndash;{' '}
                      {format(new Date(s.end_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-center">{count}</TableCell>
                    <TableCell className="text-center">
                      {s.is_anonymous ? (
                        <Check className="h-4 w-4 mx-auto text-emerald-600" />
                      ) : (
                        <X className="h-4 w-4 mx-auto text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(s.status === 'active' || s.status === 'closed') && (
                            <DropdownMenuItem onClick={() => setViewingResultsId(s.id)}>
                              View Results
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(s)}>
                            Edit
                          </DropdownMenuItem>
                          {s.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(s.id, s.organization_id, 'active')}
                            >
                              Activate
                            </DropdownMenuItem>
                          )}
                          {s.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(s.id, s.organization_id, 'closed')}
                            >
                              Close
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(s)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <SurveyBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        survey={editingSurvey}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v: boolean) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete survey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot; and all associated
              responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
