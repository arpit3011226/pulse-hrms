import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Upload, X, FileText } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCreateReimbursement } from '../hooks/use-reimbursements'
import { uploadFile, validateFile, FileValidationError } from '@/lib/storage'
import { REIMBURSEMENT_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'

const schema = z.object({
  category: z.enum(['travel', 'medical', 'mobile_internet', 'relocation', 'training', 'meal_food']),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  expense_date: z.string().min(1, 'Expense date is required'),
  description: z.string().min(1, 'Description is required'),
})

type FormData = z.output<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
}

export function ReimbursementFormDialog({ open, onOpenChange, employeeId }: Props) {
  const { profile, organization } = useAuth()
  const createReimbursement = useCreateReimbursement()
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const form = useForm<z.input<typeof schema>, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: undefined,
      amount: undefined,
      expense_date: '',
      description: '',
    },
  })

  async function onSubmit(data: FormData) {
    if (!organization || !profile) return

    try {
      setUploading(true)
      let receipt_url: string | null = null

      if (receiptFile) {
        try {
          validateFile(receiptFile)
          const ext = receiptFile.name.split('.').pop() || 'pdf'
          const path = `${organization.id}/${employeeId}/${crypto.randomUUID()}.${ext}`
          receipt_url = await uploadFile('reimbursement-receipts', path, receiptFile)
        } catch (err) {
          if (err instanceof FileValidationError) {
            toast.error(err.message)
            return
          }
          throw err
        }
      }

      await createReimbursement.mutateAsync({
        organization_id: organization.id,
        employee_id: employeeId,
        requested_by: profile.id,
        category: data.category,
        amount: data.amount,
        description: data.description,
        expense_date: data.expense_date,
        receipt_url,
      })

      toast.success('Reimbursement request submitted')
      form.reset()
      setReceiptFile(null)
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit reimbursement')
    } finally {
      setUploading(false)
    }
  }

  const isSubmitting = createReimbursement.isPending || uploading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>New Reimbursement Request</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REIMBURSEMENT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} value={(field.value as string | number | undefined) ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expense_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the expense..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Receipt (optional)</label>
              {receiptFile ? (
                <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/30">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{receiptFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setReceiptFile(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Upload receipt (JPG, PNG, PDF — max 5MB)
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setReceiptFile(file)
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
