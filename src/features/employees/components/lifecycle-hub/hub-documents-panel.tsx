import { FileText, ShieldCheck } from 'lucide-react'
import { useIdentityDocuments, useEmployeeDocuments } from '../../hooks/use-employee-lifecycle'
import { StatusBadge } from '@/components/shared/status-badge'

interface HubDocumentsPanelProps {
  employeeId: string
}

export function HubDocumentsPanel({ employeeId }: HubDocumentsPanelProps) {
  const { data: idDocs, isLoading: loadingId } = useIdentityDocuments(employeeId)
  const { data: empDocs, isLoading: loadingDocs } = useEmployeeDocuments(employeeId)

  if (loadingId || loadingDocs) {
    return <div className="animate-pulse rounded-lg border bg-muted/30 p-6 h-20" />
  }

  const identityDocs = idDocs ?? []
  const generalDocs = empDocs ?? []
  const totalCount = identityDocs.length + generalDocs.length

  if (totalCount === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
        <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
        No documents uploaded
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-violet-50/50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-violet-600">{identityDocs.length}</p>
          <p className="text-xs text-muted-foreground">Identity Docs</p>
        </div>
        <div className="rounded-lg border bg-blue-50/50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-blue-600">{generalDocs.length}</p>
          <p className="text-xs text-muted-foreground">General Docs</p>
        </div>
      </div>

      {/* Identity documents list */}
      {identityDocs.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Identity Documents
          </p>
          {identityDocs.map((doc) => {
            const d = doc as typeof doc & {
              document_type?: string
              document_number?: string
              verification_status?: string
            }
            return (
              <div key={d.id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-medium capitalize">
                    {(d.document_type || '').replace(/_/g, ' ')}
                  </p>
                  {d.document_number && (
                    <p className="text-xs text-muted-foreground">{d.document_number}</p>
                  )}
                </div>
                {d.verification_status && (
                  <StatusBadge status={d.verification_status} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* General documents list */}
      {generalDocs.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Employee Documents
          </p>
          {generalDocs.slice(0, 5).map((doc) => {
            const d = doc as typeof doc & {
              document_name?: string
              document_category?: string
              verification_status?: string
            }
            return (
              <div key={d.id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{d.document_name || 'Untitled'}</p>
                  {d.document_category && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {d.document_category.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
                {d.verification_status && (
                  <StatusBadge status={d.verification_status} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
