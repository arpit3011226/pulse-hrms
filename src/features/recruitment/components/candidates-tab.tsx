import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Trash2, KeyRound, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CandidateFormDialog } from './candidate-form-dialog'
import { useCandidates, useDeleteCandidate } from '../hooks/use-recruitment'
import { usePermissions } from '@/hooks/use-permissions'
import type { Candidate } from '@/types/database.types'
import { toast } from 'sonner'
import { useCreateLogin } from '@/features/auth/hooks/use-user-admin'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export function CandidatesTab() {
  const { canManageRecruitment, isAdmin, isHR } = usePermissions()
  const canManage = canManageRecruitment || isAdmin || isHR

  const { data: candidates, isLoading, refetch } = useCandidates()
  const deleteCandidate = useDeleteCandidate()

  const [formOpen, setFormOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [portalFor, setPortalFor] = useState<Candidate | null>(null)
  const [portalLink, setPortalLink] = useState<string | null>(null)
  const createLogin = useCreateLogin()

  /**
   * Gives a candidate a login so they can follow their own application. They get
   * the candidate role, which reaches nothing but their own record — see the
   * candidate_reads_own_* policies.
   */
  async function handleCreatePortalLogin() {
    if (!portalFor) return
    try {
      const result = await createLogin.mutateAsync({
        email: portalFor.email,
        first_name: portalFor.first_name,
        last_name: portalFor.last_name,
        role: 'candidate',
        candidate_id: portalFor.id,
      })
      setPortalLink(result.set_password_link)
      toast.success(result.linked_existing ? 'Existing login linked' : 'Portal login created')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the login')
    }
  }

  const columns: ColumnDef<Candidate>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Link
          to="/recruitment/candidates/$candidateId"
          params={{ candidateId: row.original.id }}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {row.original.first_name} {row.original.last_name}
        </Link>
      ),
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      accessorKey: 'experience_years',
      header: 'Experience',
      cell: ({ row }) =>
        row.original.experience_years != null
          ? `${row.original.experience_years} yrs`
          : '-',
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => <StatusBadge status={row.original.source} />,
    },
    {
      accessorKey: 'current_company',
      header: 'Current Company',
      cell: ({ row }) => row.original.current_company || '-',
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const candidate = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditingCandidate(candidate); setFormOpen(true) }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {/* Without this the candidate portal exists but nobody can reach it. */}
              {candidate.profile_id ? (
                <DropdownMenuItem disabled>
                  <KeyRound className="mr-2 h-4 w-4" /> Portal login created
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setPortalFor(candidate)}>
                  <KeyRound className="mr-2 h-4 w-4" /> Create portal login
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(candidate.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(candidates || []) as Candidate[]}
        searchKey="name"
        searchPlaceholder="Search candidates..."
        isLoading={isLoading}
        toolbarActions={
          canManage && (
            <Button onClick={() => { setEditingCandidate(undefined); setFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add Candidate
            </Button>
          )
        }
      />

      <CandidateFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingCandidate(undefined) }}
        candidate={editingCandidate}
      />

      {/* Create a portal login, then hand the recruiter the link to send on. */}
      <Dialog
        open={!!portalFor}
        onOpenChange={() => { setPortalFor(null); setPortalLink(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a portal login</DialogTitle>
            <DialogDescription>
              {portalFor
                ? `${portalFor.first_name} ${portalFor.last_name} will be able to sign in with ${portalFor.email} and follow their own application. They see nothing else.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {portalLink ? (
            <div className="space-y-3 py-2">
              <p className="text-sm">Send this link so they can set a password.</p>
              <div className="rounded-md border bg-muted p-2">
                <p className="break-all font-mono text-xs">{portalLink}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { navigator.clipboard.writeText(portalLink); toast.success('Link copied') }}
              >
                <Copy className="mr-2 h-3.5 w-3.5" /> Copy link
              </Button>
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              They will set their own password, so you never handle it.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setPortalFor(null); setPortalLink(null) }}>
              {portalLink ? 'Done' : 'Cancel'}
            </Button>
            {!portalLink && (
              <Button onClick={handleCreatePortalLogin} disabled={createLogin.isPending}>
                {createLogin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create login
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Candidate"
        description="This will permanently delete this candidate. Candidates with existing applications cannot be deleted."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteCandidate.isPending}
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteCandidate.mutateAsync(deleteId)
              toast.success('Candidate deleted')
            } catch {
              toast.error('Failed to delete candidate. The candidate may have existing applications.')
            }
            setDeleteId(null)
          }
        }}
      />
    </>
  )
}
