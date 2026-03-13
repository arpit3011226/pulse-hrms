import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IDENTITY_DOCUMENT_TYPES, DOCUMENT_CATEGORIES, VERIFICATION_STATUSES } from '@/lib/constants'
import {
  useCreateIdentityDocument,
  useUpdateIdentityDocument,
  useCreateEmployeeDocument,
  useUpdateEmployeeDocument,
} from '../hooks/use-employee-lifecycle'
import type { EmployeeIdentityDocument, EmployeeDocument } from '@/types/database.types'
import { toast } from 'sonner'

const identityDocSchema = z.object({
  document_type: z.string().min(1, 'Document type is required'),
  document_number: z.string().min(1, 'Document number is required'),
  name_on_document: z.string().optional(),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  file_url: z.string().optional(),
  verification_status: z.string().optional(),
})

const employeeDocSchema = z.object({
  document_category: z.string().min(1, 'Category is required'),
  document_name: z.string().min(1, 'Document name is required'),
  file_url: z.string().min(1, 'File URL is required'),
  file_size: z.number().optional(),
  expiry_date: z.string().optional(),
  verification_status: z.string().optional(),
})

interface EmployeeDocumentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  type: 'identity' | 'document'
  identityDocument?: EmployeeIdentityDocument
  employeeDocument?: EmployeeDocument
}

export function EmployeeDocumentForm({ open, onOpenChange, employeeId, type, identityDocument, employeeDocument }: EmployeeDocumentFormProps) {
  if (type === 'identity') {
    return <IdentityDocForm open={open} onOpenChange={onOpenChange} employeeId={employeeId} document={identityDocument} />
  }
  return <EmpDocForm open={open} onOpenChange={onOpenChange} employeeId={employeeId} document={employeeDocument} />
}

function IdentityDocForm({ open, onOpenChange, employeeId, document }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: string; document?: EmployeeIdentityDocument }) {
  const isEditing = !!document
  const createDoc = useCreateIdentityDocument()
  const updateDoc = useUpdateIdentityDocument()

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(identityDocSchema),
    defaultValues: document ? {
      document_type: document.document_type,
      document_number: document.document_number,
      name_on_document: document.name_on_document || '',
      issue_date: document.issue_date || '',
      expiry_date: document.expiry_date || '',
      file_url: document.file_url || '',
      verification_status: document.verification_status,
    } : { verification_status: 'pending' },
  })

  const onSubmit = async (data: z.infer<typeof identityDocSchema>) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      if (isEditing) {
        await updateDoc.mutateAsync({ id: document.id, ...cleaned })
        toast.success('Document updated')
      } else {
        await createDoc.mutateAsync({ ...cleaned, employee_id: employeeId })
        toast.success('Document added')
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save document')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Identity Document' : 'Add Identity Document'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select onValueChange={(v) => setValue('document_type', v)} defaultValue={document?.document_type}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {IDENTITY_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.document_type && <p className="text-sm text-destructive">{errors.document_type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_number">Document Number *</Label>
              <Input id="document_number" {...register('document_number')} />
              {errors.document_number && <p className="text-sm text-destructive">{errors.document_number.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name_on_document">Name on Document</Label>
            <Input id="name_on_document" {...register('name_on_document')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date</Label>
              <Input id="issue_date" type="date" {...register('issue_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input id="expiry_date" type="date" {...register('expiry_date')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_url">File URL</Label>
            <Input id="file_url" placeholder="https://..." {...register('file_url')} />
          </div>

          <div className="space-y-2">
            <Label>Verification Status</Label>
            <Select onValueChange={(v) => setValue('verification_status', v)} defaultValue={document?.verification_status || 'pending'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VERIFICATION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EmpDocForm({ open, onOpenChange, employeeId, document }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: string; document?: EmployeeDocument }) {
  const isEditing = !!document
  const createDoc = useCreateEmployeeDocument()
  const updateDoc = useUpdateEmployeeDocument()

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(employeeDocSchema),
    defaultValues: document ? {
      document_category: document.document_category,
      document_name: document.document_name,
      file_url: document.file_url,
      file_size: document.file_size || undefined,
      expiry_date: document.expiry_date || '',
      verification_status: document.verification_status,
    } : { verification_status: 'pending' },
  })

  const onSubmit = async (data: z.infer<typeof employeeDocSchema>) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      if (isEditing) {
        await updateDoc.mutateAsync({ id: document.id, ...cleaned })
        toast.success('Document updated')
      } else {
        await createDoc.mutateAsync({ ...cleaned, employee_id: employeeId })
        toast.success('Document uploaded')
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save document')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Document' : 'Upload Document'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select onValueChange={(v) => setValue('document_category', v)} defaultValue={document?.document_category}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.document_category && <p className="text-sm text-destructive">{errors.document_category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_name">Document Name *</Label>
            <Input id="document_name" {...register('document_name')} />
            {errors.document_name && <p className="text-sm text-destructive">{errors.document_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_url">File URL *</Label>
            <Input id="file_url" placeholder="https://..." {...register('file_url')} />
            {errors.file_url && <p className="text-sm text-destructive">{errors.file_url.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input id="expiry_date" type="date" {...register('expiry_date')} />
            </div>
            <div className="space-y-2">
              <Label>Verification Status</Label>
              <Select onValueChange={(v) => setValue('verification_status', v)} defaultValue={document?.verification_status || 'pending'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VERIFICATION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
