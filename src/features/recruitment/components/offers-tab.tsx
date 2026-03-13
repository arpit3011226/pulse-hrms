import { useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal, Plus, Pencil, Send, CheckCircle, XCircle, Ban } from 'lucide-react'
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
import { OfferFormDialog } from './offer-form-dialog'
import {
  useOfferLetters,
  useUpdateOfferStatus,
} from '../hooks/use-recruitment'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { OfferLetterWithRelations } from '@/types/database.types'
import { toast } from 'sonner'

export function OffersTab() {
  const { canManageRecruitment, isAdmin, isHR } = usePermissions()
  const canManage = canManageRecruitment || isAdmin || isHR

  const { data: offers, isLoading } = useOfferLetters()
  const updateStatus = useUpdateOfferStatus()

  const [formOpen, setFormOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<OfferLetterWithRelations | undefined>()
  const [statusChange, setStatusChange] = useState<{
    id: string
    offerStatus: string
    applicationId?: string
    label: string
  } | null>(null)

  const getStatusActions = (offer: OfferLetterWithRelations) => {
    const actions: { offerStatus: string; label: string; icon: typeof Send }[] = []
    switch (offer.offer_status) {
      case 'draft':
        actions.push({ offerStatus: 'sent', label: 'Send Offer', icon: Send })
        break
      case 'sent':
        actions.push({ offerStatus: 'accepted', label: 'Accept', icon: CheckCircle })
        actions.push({ offerStatus: 'rejected', label: 'Reject', icon: XCircle })
        actions.push({ offerStatus: 'withdrawn', label: 'Withdraw', icon: Ban })
        break
      case 'accepted':
        actions.push({ offerStatus: 'withdrawn', label: 'Withdraw', icon: Ban })
        break
      default:
        break
    }
    return actions
  }

  const columns: ColumnDef<OfferLetterWithRelations>[] = [
    {
      id: 'candidate',
      header: 'Candidate',
      cell: ({ row }) => {
        const c = row.original.candidate_application?.candidate
        return c ? (
          <span className="font-medium">{c.first_name} {c.last_name}</span>
        ) : '-'
      },
      accessorFn: (row) => {
        const c = row.candidate_application?.candidate
        return c ? `${c.first_name} ${c.last_name}` : ''
      },
    },
    {
      id: 'job',
      header: 'Job',
      cell: ({ row }) => row.original.candidate_application?.job_requisition?.title || '-',
    },
    {
      accessorKey: 'offered_designation',
      header: 'Designation',
      cell: ({ row }) => row.original.offered_designation || '-',
    },
    {
      accessorKey: 'offered_ctc',
      header: 'CTC',
      cell: ({ row }) => formatCurrency(row.original.offered_ctc),
    },
    {
      accessorKey: 'joining_date',
      header: 'Joining Date',
      cell: ({ row }) =>
        row.original.joining_date ? formatDate(row.original.joining_date) : '-',
    },
    {
      accessorKey: 'offer_status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.offer_status} />,
    },
    {
      accessorKey: 'valid_until',
      header: 'Valid Until',
      cell: ({ row }) =>
        row.original.valid_until ? formatDate(row.original.valid_until) : '-',
    },
  ]

  if (canManage) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const offer = row.original
        const statusActions = getStatusActions(offer)
        const canEdit = offer.offer_status === 'draft'

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditingOffer(offer)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {statusActions.length > 0 && canEdit && <DropdownMenuSeparator />}
              {statusActions.map((action) => (
                <DropdownMenuItem
                  key={action.offerStatus}
                  className={
                    action.offerStatus === 'rejected' || action.offerStatus === 'withdrawn'
                      ? 'text-destructive'
                      : undefined
                  }
                  onClick={() =>
                    setStatusChange({
                      id: offer.id,
                      offerStatus: action.offerStatus,
                      applicationId: offer.candidate_application_id,
                      label: action.label,
                    })
                  }
                >
                  <action.icon className="mr-2 h-4 w-4" /> {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }

  const getStatusChangeDescription = () => {
    if (!statusChange) return ''
    switch (statusChange.offerStatus) {
      case 'sent':
        return 'Are you sure you want to mark this offer as sent? The candidate will be notified.'
      case 'accepted':
        return 'Are you sure you want to mark this offer as accepted? The application status will be updated.'
      case 'rejected':
        return 'Are you sure you want to mark this offer as rejected by the candidate?'
      case 'withdrawn':
        return 'Are you sure you want to withdraw this offer? This action cannot be easily undone.'
      default:
        return `Are you sure you want to change this offer status to "${statusChange.label}"?`
    }
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={(offers || []) as OfferLetterWithRelations[]}
        searchKey="candidate"
        searchPlaceholder="Search offers..."
        isLoading={isLoading}
        toolbarActions={
          canManage && (
            <Button
              onClick={() => {
                setEditingOffer(undefined)
                setFormOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Create Offer
            </Button>
          )
        }
      />

      <OfferFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingOffer(undefined)
        }}
        offer={editingOffer}
      />

      <ConfirmDialog
        open={!!statusChange}
        onOpenChange={() => setStatusChange(null)}
        title={`${statusChange?.label || 'Change'} Offer`}
        description={getStatusChangeDescription()}
        confirmLabel={statusChange?.label || 'Confirm'}
        variant={
          statusChange?.offerStatus === 'rejected' || statusChange?.offerStatus === 'withdrawn'
            ? 'destructive'
            : 'default'
        }
        isLoading={updateStatus.isPending}
        onConfirm={async () => {
          if (statusChange) {
            try {
              await updateStatus.mutateAsync({
                id: statusChange.id,
                offerStatus: statusChange.offerStatus,
                applicationId: statusChange.applicationId,
              })
              toast.success(`Offer ${statusChange.label.toLowerCase()}`)
            } catch {
              toast.error('Failed to update offer status')
            }
            setStatusChange(null)
          }
        }}
      />
    </>
  )
}
