import { useState, useMemo } from 'react'
import {
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Filter,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useCurrentEmployee } from '../hooks/use-payroll'
import { useTaxDeclarations, useVerifyTaxDeclaration } from '../hooks/use-tax'
import { getCurrentFinancialYear, getFinancialYearOptions } from '../utils/tax-calculator'
import { formatCurrency } from '../utils/payroll-utils'
import type { TaxDeclarationWithRelations } from '@/types/database.types'

type StatusFilter = 'all' | 'draft' | 'submitted' | 'verified' | 'rejected'

export function TaxDeclarationsTab() {
  const { data: currentEmployee } = useCurrentEmployee()

  const fyOptions = getFinancialYearOptions()
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedDecl, setSelectedDecl] = useState<TaxDeclarationWithRelations | null>(null)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [verifyAction, setVerifyAction] = useState<'verified' | 'rejected'>('verified')
  const [verifyRemarks, setVerifyRemarks] = useState('')

  const { data: declarations, isLoading } = useTaxDeclarations(financialYear)
  const verifyMutation = useVerifyTaxDeclaration()

  const filtered = useMemo(() => {
    if (!declarations) return []
    let list = declarations as TaxDeclarationWithRelations[]
    if (statusFilter !== 'all') {
      list = list.filter((d) => d.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((d) => {
        const emp = d.employee
        if (!emp) return false
        const name = `${emp.first_name} ${emp.last_name}`.toLowerCase()
        const code = (emp.employee_code || '').toLowerCase()
        return name.includes(q) || code.includes(q) || (emp.email || '').toLowerCase().includes(q)
      })
    }
    return list
  }, [declarations, statusFilter, search])

  function getTotalExemptions(d: TaxDeclarationWithRelations): number {
    return (
      (d.section_80c || 0) +
      (d.section_80d || 0) +
      (d.home_loan_interest || 0) +
      (d.hra_claimed || 0) +
      (d.nps_contribution || 0) +
      (d.other_deductions || 0)
    )
  }

  function openVerifyDialog(decl: TaxDeclarationWithRelations, action: 'verified' | 'rejected') {
    setSelectedDecl(decl)
    setVerifyAction(action)
    setVerifyRemarks('')
    setVerifyDialogOpen(true)
  }

  async function handleVerify() {
    if (!selectedDecl || !currentEmployee) return
    try {
      await verifyMutation.mutateAsync({
        id: selectedDecl.id,
        verifiedBy: currentEmployee.id,
        status: verifyAction,
        remarks: verifyRemarks || undefined,
      })
      toast.success(
        `Tax declaration for ${selectedDecl.employee?.first_name} ${selectedDecl.employee?.last_name} has been ${verifyAction}.`
      )
      setVerifyDialogOpen(false)
      setSelectedDecl(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update declaration.')
    }
  }

  // Detail view state
  const [detailDecl, setDetailDecl] = useState<TaxDeclarationWithRelations | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  // If detail view
  if (detailDecl) {
    // We don't have the employee's annual income from the declaration alone;
    // show the exemption totals and regime info.
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setDetailDecl(null)}>
            Back
          </Button>
          <h3 className="text-lg font-semibold">
            {detailDecl.employee?.first_name} {detailDecl.employee?.last_name} &mdash; FY{' '}
            {detailDecl.financial_year}
          </h3>
          <StatusBadge status={detailDecl.status} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tax Regime</span>
                <Badge variant="outline">
                  {detailDecl.tax_regime === 'new' ? 'New Regime' : 'Old Regime'}
                </Badge>
              </div>
              {detailDecl.tax_regime === 'old' && (
                <>
                  <DetailRow label="Section 80C" value={detailDecl.section_80c} />
                  <DetailRow label="Section 80D" value={detailDecl.section_80d} />
                  <DetailRow label="Home Loan Interest" value={detailDecl.home_loan_interest} />
                  <DetailRow label="HRA Claimed" value={detailDecl.hra_claimed} />
                  <DetailRow label="NPS (80CCD 1B)" value={detailDecl.nps_contribution} />
                  <DetailRow label="Other Deductions" value={detailDecl.other_deductions} />
                  {detailDecl.other_deductions_detail && (
                    <div>
                      <span className="text-xs text-muted-foreground">Details:</span>
                      <p className="text-sm">{detailDecl.other_deductions_detail}</p>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <DetailRow
                      label="Total Exemptions"
                      value={getTotalExemptions(detailDecl)}
                      highlight
                    />
                  </div>
                </>
              )}
              {detailDecl.tax_regime === 'new' && (
                <p className="text-sm text-muted-foreground">
                  Under the New Regime, no Chapter VI-A exemptions are applicable. Standard
                  deduction of {formatCurrency(75000)} is auto-applied.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {detailDecl.remarks && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-amber-700">Reviewer Remarks</p>
                  <p className="mt-1 text-sm">{detailDecl.remarks}</p>
                </CardContent>
              </Card>
            )}

            {detailDecl.status === 'submitted' && (
              <div className="flex gap-3">
                <Button
                  onClick={() => openVerifyDialog(detailDecl, 'verified')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verify
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openVerifyDialog(detailDecl, 'rejected')}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Verify dialog - reused */}
        <VerifyDialog
          open={verifyDialogOpen}
          onOpenChange={setVerifyDialogOpen}
          action={verifyAction}
          remarks={verifyRemarks}
          onRemarksChange={setVerifyRemarks}
          onConfirm={handleVerify}
          isPending={verifyMutation.isPending}
          employeeName={
            selectedDecl
              ? `${selectedDecl.employee?.first_name} ${selectedDecl.employee?.last_name}`
              : ''
          }
        />
      </div>
    )
  }

  // Summary cards
  const totalDeclarations = (declarations as TaxDeclarationWithRelations[] | undefined)?.length || 0
  const submittedCount =
    (declarations as TaxDeclarationWithRelations[] | undefined)?.filter(
      (d) => d.status === 'submitted'
    ).length || 0
  const verifiedCount =
    (declarations as TaxDeclarationWithRelations[] | undefined)?.filter(
      (d) => d.status === 'verified'
    ).length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Tax Declarations</h3>
          <p className="text-sm text-muted-foreground">
            Review and verify employee tax declarations for FY {financialYear}.
          </p>
        </div>
        <Select value={financialYear} onValueChange={setFinancialYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fyOptions.map((fy) => (
              <SelectItem key={fy} value={fy}>
                FY {fy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-orange-600">Total Declarations</p>
            <p className="text-2xl font-bold text-orange-700">{totalDeclarations}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">Pending Review</p>
            <p className="text-2xl font-bold text-blue-700">{submittedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Verified</p>
            <p className="text-2xl font-bold text-green-700">{verifiedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Regime</TableHead>
              <TableHead className="text-right">Total Exemptions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No declarations found for FY {financialYear}.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((decl) => (
                <TableRow
                  key={decl.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setDetailDecl(decl)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {decl.employee?.first_name} {decl.employee?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {decl.employee?.employee_code} &middot;{' '}
                        {(decl.employee as TaxDeclarationWithRelations['employee'] & { department?: { name: string } | null })?.department?.name || 'N/A'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {decl.tax_regime === 'new' ? 'New' : 'Old'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {decl.tax_regime === 'old'
                      ? formatCurrency(getTotalExemptions(decl))
                      : '--'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={decl.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {decl.status === 'submitted' && (
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => openVerifyDialog(decl, 'verified')}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => openVerifyDialog(decl, 'rejected')}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Verify Dialog */}
      <VerifyDialog
        open={verifyDialogOpen}
        onOpenChange={setVerifyDialogOpen}
        action={verifyAction}
        remarks={verifyRemarks}
        onRemarksChange={setVerifyRemarks}
        onConfirm={handleVerify}
        isPending={verifyMutation.isPending}
        employeeName={
          selectedDecl
            ? `${selectedDecl.employee?.first_name} ${selectedDecl.employee?.last_name}`
            : ''
        }
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    submitted: 'bg-blue-100 text-blue-700 border-blue-200',
    verified: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }
  return (
    <Badge variant="outline" className={variants[status] || ''}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${highlight ? 'font-semibold' : 'text-muted-foreground'}`}>
        {label}
      </span>
      <span className={`text-sm ${highlight ? 'font-bold text-orange-700' : ''}`}>
        {formatCurrency(value || 0)}
      </span>
    </div>
  )
}

function VerifyDialog({
  open,
  onOpenChange,
  action,
  remarks,
  onRemarksChange,
  onConfirm,
  isPending,
  employeeName,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  action: 'verified' | 'rejected'
  remarks: string
  onRemarksChange: (v: string) => void
  onConfirm: () => void
  isPending: boolean
  employeeName: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'verified' ? 'Verify' : 'Reject'} Tax Declaration
          </DialogTitle>
          <DialogDescription>
            {action === 'verified'
              ? `Confirm that the tax declaration for ${employeeName} has been reviewed and is correct.`
              : `Reject the tax declaration for ${employeeName}. Please provide a reason.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Remarks {action === 'rejected' && <span className="text-red-500">*</span>}</Label>
            <Textarea
              value={remarks}
              onChange={(e) => onRemarksChange(e.target.value)}
              placeholder={
                action === 'rejected'
                  ? 'Reason for rejection (required)...'
                  : 'Optional remarks...'
              }
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending || (action === 'rejected' && !remarks.trim())}
            className={
              action === 'verified'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === 'verified' ? 'Verify' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
