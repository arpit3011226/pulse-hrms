import { useState } from 'react'
import { Plus, Pencil, Trash2, Landmark, Star, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import {
  useBankAccounts,
  useDependents,
  useNominees,
  useDeleteBankAccount,
  useDeleteDependent,
  useDeleteNominee,
  useSetSalaryAccount,
} from '../hooks/use-employee-lifecycle'
import { EmployeeBankForm } from './employee-bank-form'
import { EmployeeDependentForm } from './employee-dependent-form'
import type { Employee, EmployeeBankAccount, EmployeeDependent, EmployeeNominee } from '@/types/database.types'
import { NOMINEE_APPLICABLE_FOR } from '@/lib/constants'
import { toast } from 'sonner'

interface EmployeeBankTabProps {
  employee: Employee
}

export function EmployeeBankTab({ employee }: EmployeeBankTabProps) {
  const permissions = usePermissions()
  const canEdit = permissions.canManageEmployees
  const { data: accounts, isLoading: loadingAccounts } = useBankAccounts(employee.id)
  const { data: dependents, isLoading: loadingDependents } = useDependents(employee.id)
  const { data: nominees, isLoading: loadingNominees } = useNominees(employee.id)

  const deleteBankAccount = useDeleteBankAccount()
  const deleteDependent = useDeleteDependent()
  const deleteNominee = useDeleteNominee()
  const setSalaryAccount = useSetSalaryAccount()

  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [dependentDialogOpen, setDependentDialogOpen] = useState(false)
  const [nomineeDialogOpen, setNomineeDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<EmployeeBankAccount | undefined>()
  const [editingDependent, setEditingDependent] = useState<EmployeeDependent | undefined>()
  const [editingNominee, setEditingNominee] = useState<EmployeeNominee | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'bank' | 'dependent' | 'nominee'; id: string } | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    try {
      if (deleteConfirm.type === 'bank') await deleteBankAccount.mutateAsync(deleteConfirm.id)
      else if (deleteConfirm.type === 'dependent') await deleteDependent.mutateAsync(deleteConfirm.id)
      else await deleteNominee.mutateAsync(deleteConfirm.id)
      toast.success('Deleted successfully')
    } catch {
      toast.error('Failed to delete')
    }
    setDeleteConfirm(null)
  }

  const handleSetSalary = async (accountId: string) => {
    try {
      await setSalaryAccount.mutateAsync({ employeeId: employee.id, accountId })
      toast.success('Salary account updated')
    } catch {
      toast.error('Failed to update salary account')
    }
  }

  const getApplicableLabel = (val: string) =>
    NOMINEE_APPLICABLE_FOR.find(n => n.value === val)?.label || val

  return (
    <div className="space-y-6">
      {/* Bank Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Bank Accounts</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => { setEditingAccount(undefined); setBankDialogOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" /> Add Account
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingAccounts ? (
            <div className="space-y-3"><Skeleton className="h-20 w-full" /></div>
          ) : !accounts?.length ? (
            <p className="text-sm text-muted-foreground">No bank accounts added yet.</p>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="flex gap-3">
                    <Landmark className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{acc.bank_name}</span>
                        {acc.is_salary_account && <StatusBadge status="salary" />}
                        <StatusBadge status={acc.verification_status} />
                      </div>
                      <p className="text-sm text-muted-foreground">A/C: {acc.account_number}</p>
                      <p className="text-xs text-muted-foreground">IFSC: {acc.ifsc_code} {acc.branch_name && `| ${acc.branch_name}`}</p>
                      <p className="text-xs text-muted-foreground capitalize">{acc.account_type} Account</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      {!acc.is_salary_account && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleSetSalary(acc.id)}>
                          <Star className="mr-1 h-3 w-3" /> Set as Salary
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingAccount(acc); setBankDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'bank', id: acc.id })}>
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

      {/* Dependents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dependents</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => { setEditingDependent(undefined); setDependentDialogOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" /> Add Dependent
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingDependents ? (
            <Skeleton className="h-16 w-full" />
          ) : !dependents?.length ? (
            <p className="text-sm text-muted-foreground">No dependents added yet.</p>
          ) : (
            <div className="space-y-3">
              {dependents.map((dep) => (
                <div key={dep.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="flex gap-3">
                    <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{dep.dependent_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{dep.relationship}</p>
                      {dep.dob && <p className="text-xs text-muted-foreground">DOB: {formatDate(dep.dob)}</p>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingDependent(dep); setDependentDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'dependent', id: dep.id })}>
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

      {/* Nominees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Nominees</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => { setEditingNominee(undefined); setNomineeDialogOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" /> Add Nominee
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingNominees ? (
            <Skeleton className="h-16 w-full" />
          ) : !nominees?.length ? (
            <p className="text-sm text-muted-foreground">No nominees added yet.</p>
          ) : (
            <div className="space-y-3">
              {nominees.map((nom) => (
                <div key={nom.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{nom.nominee_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{nom.relationship} | {nom.allocation_percent}% | {getApplicableLabel(nom.applicable_for)}</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingNominee(nom); setNomineeDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'nominee', id: nom.id })}>
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
      <EmployeeBankForm open={bankDialogOpen} onOpenChange={setBankDialogOpen} employeeId={employee.id} account={editingAccount} />
      <EmployeeDependentForm open={dependentDialogOpen} onOpenChange={setDependentDialogOpen} employeeId={employee.id} dependent={editingDependent} type="dependent" />
      <EmployeeDependentForm open={nomineeDialogOpen} onOpenChange={setNomineeDialogOpen} employeeId={employee.id} nominee={editingNominee} type="nominee" />
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Confirmation"
        description="Are you sure you want to delete this record?"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}
