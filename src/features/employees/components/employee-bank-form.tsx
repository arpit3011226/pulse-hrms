import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BANK_ACCOUNT_TYPES } from '@/lib/constants'
import { useCreateBankAccount, useUpdateBankAccount } from '../hooks/use-employee-lifecycle'
import type { EmployeeBankAccount } from '@/types/database.types'
import { toast } from 'sonner'

const bankSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required'),
  branch_name: z.string().optional(),
  account_number: z.string().min(1, 'Account number is required'),
  ifsc_code: z.string().min(1, 'IFSC code is required'),
  account_type: z.string().optional(),
  is_salary_account: z.boolean().optional(),
})

type BankFormData = z.infer<typeof bankSchema>

interface EmployeeBankFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  account?: EmployeeBankAccount
}

export function EmployeeBankForm({ open, onOpenChange, employeeId, account }: EmployeeBankFormProps) {
  const isEditing = !!account
  const createAccount = useCreateBankAccount()
  const updateAccount = useUpdateBankAccount()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: account ? {
      bank_name: account.bank_name,
      branch_name: account.branch_name || '',
      account_number: account.account_number,
      ifsc_code: account.ifsc_code,
      account_type: account.account_type,
      is_salary_account: account.is_salary_account,
    } : {
      account_type: 'savings',
      is_salary_account: false,
    },
  })

  const onSubmit = async (data: BankFormData) => {
    try {
      const cleaned = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
      )
      if (isEditing) {
        await updateAccount.mutateAsync({ id: account.id, ...cleaned })
        toast.success('Bank account updated')
      } else {
        await createAccount.mutateAsync({ ...cleaned, employee_id: employeeId })
        toast.success('Bank account added')
      }
      reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to save bank account')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input id="bank_name" {...register('bank_name')} />
              {errors.bank_name && <p className="text-sm text-destructive">{errors.bank_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch_name">Branch Name</Label>
              <Input id="branch_name" {...register('branch_name')} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input id="account_number" {...register('account_number')} />
              {errors.account_number && <p className="text-sm text-destructive">{errors.account_number.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifsc_code">IFSC Code *</Label>
              <Input id="ifsc_code" {...register('ifsc_code')} placeholder="e.g. SBIN0001234" />
              {errors.ifsc_code && <p className="text-sm text-destructive">{errors.ifsc_code.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select onValueChange={(v) => setValue('account_type', v)} defaultValue={account?.account_type || 'savings'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BANK_ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={watch('is_salary_account')} onCheckedChange={(v) => setValue('is_salary_account', v)} />
            <Label>Salary Account</Label>
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
