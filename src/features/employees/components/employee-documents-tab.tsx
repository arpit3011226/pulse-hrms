import { useState } from 'react'
import { Plus, Pencil, Trash2, FileText, ShieldCheck, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import {
  useIdentityDocuments,
  useEmployeeDocuments,
  useDeleteIdentityDocument,
  useDeleteEmployeeDocument,
} from '../hooks/use-employee-lifecycle'
import { EmployeeDocumentForm } from './employee-document-form'
import type { Employee, EmployeeIdentityDocument, EmployeeDocument } from '@/types/database.types'
import { IDENTITY_DOCUMENT_TYPES, DOCUMENT_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'

interface EmployeeDocumentsTabProps {
  employee: Employee
}

export function EmployeeDocumentsTab({ employee }: EmployeeDocumentsTabProps) {
  const permissions = usePermissions()
  const canEdit = permissions.canManageEmployees
  const { data: idDocs, isLoading: loadingIdDocs } = useIdentityDocuments(employee.id)
  const { data: empDocs, isLoading: loadingEmpDocs } = useEmployeeDocuments(employee.id)
  const deleteIdDoc = useDeleteIdentityDocument()
  const deleteEmpDoc = useDeleteEmployeeDocument()

  const [idDocDialogOpen, setIdDocDialogOpen] = useState(false)
  const [empDocDialogOpen, setEmpDocDialogOpen] = useState(false)
  const [editingIdDoc, setEditingIdDoc] = useState<EmployeeIdentityDocument | undefined>()
  const [editingEmpDoc, setEditingEmpDoc] = useState<EmployeeDocument | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'id' | 'doc'; id: string } | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    try {
      if (deleteConfirm.type === 'id') {
        await deleteIdDoc.mutateAsync(deleteConfirm.id)
      } else {
        await deleteEmpDoc.mutateAsync(deleteConfirm.id)
      }
      toast.success('Document deleted')
    } catch {
      toast.error('Failed to delete')
    }
    setDeleteConfirm(null)
  }

  const getDocTypeLabel = (type: string) =>
    IDENTITY_DOCUMENT_TYPES.find(t => t.value === type)?.label || type

  const getCategoryLabel = (cat: string) =>
    DOCUMENT_CATEGORIES.find(c => c.value === cat)?.label || cat

  return (
    <div className="space-y-6">
      {/* Identity Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Identity Documents</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => { setEditingIdDoc(undefined); setIdDocDialogOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" /> Add ID Document
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingIdDocs ? (
            <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : !idDocs?.length ? (
            <p className="text-sm text-muted-foreground">No identity documents added yet.</p>
          ) : (
            <div className="space-y-3">
              {idDocs.map((doc) => (
                <div key={doc.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{getDocTypeLabel(doc.document_type)}</span>
                        <StatusBadge status={doc.verification_status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{doc.document_number}</p>
                      {doc.name_on_document && <p className="text-xs text-muted-foreground">Name: {doc.name_on_document}</p>}
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        {doc.issue_date && <span>Issued: {formatDate(doc.issue_date)}</span>}
                        {doc.expiry_date && <span>Expires: {formatDate(doc.expiry_date)}</span>}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      {doc.file_url && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingIdDoc(doc); setIdDocDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'id', id: doc.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Documents</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => { setEditingEmpDoc(undefined); setEmpDocDialogOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" /> Upload Document
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingEmpDocs ? (
            <div className="space-y-3"><Skeleton className="h-16 w-full" /></div>
          ) : !empDocs?.length ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {empDocs.map((doc) => (
                <div key={doc.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="flex gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{doc.document_name}</span>
                        <StatusBadge status={doc.verification_status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{getCategoryLabel(doc.document_category)}</p>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        {doc.file_size && <span>{(doc.file_size / 1024).toFixed(0)} KB</span>}
                        {doc.expiry_date && <span>Expires: {formatDate(doc.expiry_date)}</span>}
                        <span>Uploaded: {formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingEmpDoc(doc); setEmpDocDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'doc', id: doc.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EmployeeDocumentForm
        open={idDocDialogOpen}
        onOpenChange={setIdDocDialogOpen}
        employeeId={employee.id}
        type="identity"
        identityDocument={editingIdDoc}
      />
      <EmployeeDocumentForm
        open={empDocDialogOpen}
        onOpenChange={setEmpDocDialogOpen}
        employeeId={employee.id}
        type="document"
        employeeDocument={editingEmpDoc}
      />
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Document"
        description="Are you sure you want to delete this document?"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}
