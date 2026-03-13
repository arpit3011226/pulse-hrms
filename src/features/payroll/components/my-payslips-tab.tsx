import { useState, useMemo } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentEmployee, useMyPayslips } from '../hooks/use-payroll'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { formatCurrency, getMonthName } from '../utils/payroll-utils'
import { generatePayslipPdf } from '../utils/generate-payslip-pdf'
import { getPayslipDetail } from '../api/payroll.api'
import { PayslipViewDialog } from './payslip-view-dialog'
import type { Payslip } from '@/types/database.types'

export function MyPayslipsTab() {
  const { data: employee } = useCurrentEmployee()
  const { data: payslips, isLoading } = useMyPayslips(employee?.id || '')
  const { organization } = useAuth()

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownloadPdf = async (payslip: Payslip, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!organization) return
    setDownloadingId(payslip.id)
    try {
      const detail = await getPayslipDetail(payslip.id)
      generatePayslipPdf(detail, organization)
    } catch (err) {
      console.error('Failed to generate payslip PDF:', err)
    } finally {
      setDownloadingId(null)
    }
  }

  const availableYears = useMemo(() => {
    if (!payslips || payslips.length === 0) return [currentYear]
    const years = [...new Set((payslips as Payslip[]).map((p) => p.payroll_year))]
    years.sort((a, b) => b - a)
    return years
  }, [payslips, currentYear])

  const filteredPayslips = useMemo(() => {
    if (!payslips) return []
    return (payslips as Payslip[])
      .filter((p) => p.payroll_year === Number(selectedYear))
      .sort((a, b) => b.payroll_month - a.payroll_month)
  }, [payslips, selectedYear])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[180px]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">My Payslips</h3>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredPayslips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No payslips found for {selectedYear}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPayslips.map((payslip) => (
            <Card
              key={payslip.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedPayslip(payslip)}
            >
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold">
                    {getMonthName(payslip.payroll_month)} {payslip.payroll_year}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => handleDownloadPdf(payslip, e)}
                      disabled={downloadingId === payslip.id}
                      title="Download PDF"
                    >
                      {downloadingId === payslip.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {payslip.payslip_number}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Earnings</span>
                    <span>{formatCurrency(payslip.gross_earnings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Deductions</span>
                    <span className="text-destructive">
                      {formatCurrency(payslip.total_deductions)}
                    </span>
                  </div>
                  <div className="mt-2 border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Net Pay</span>
                      <span className="text-primary text-lg">
                        {formatCurrency(payslip.net_pay)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PayslipViewDialog
        open={!!selectedPayslip}
        onOpenChange={(open) => {
          if (!open) setSelectedPayslip(null)
        }}
        payslip={selectedPayslip}
      />
    </div>
  )
}
