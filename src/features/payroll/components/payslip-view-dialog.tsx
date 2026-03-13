import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, getMonthName } from '../utils/payroll-utils'
import { formatDate } from '@/lib/utils'
import { generatePayslipPdf } from '../utils/generate-payslip-pdf'
import { getPayslipDetail } from '../api/payroll.api'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type { Payslip } from '@/types/database.types'

interface PayslipViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payslip: Payslip | null
}

export function PayslipViewDialog({
  open,
  onOpenChange,
  payslip,
}: PayslipViewDialogProps) {
  const { organization } = useAuth()
  const [downloading, setDownloading] = useState(false)

  if (!payslip) return null

  const handleDownloadPdf = async () => {
    if (!organization) return
    setDownloading(true)
    try {
      const detail = await getPayslipDetail(payslip.id)
      generatePayslipPdf(detail, organization)
    } catch (err) {
      console.error('Failed to generate payslip PDF:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                Payslip for {getMonthName(payslip.payroll_month)} {payslip.payroll_year}
              </DialogTitle>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline">{payslip.payslip_number}</Badge>
                {payslip.published_flag && (
                  <Badge variant="default">Published</Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pay Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gross Earnings</span>
                <span className="font-medium">
                  {formatCurrency(payslip.gross_earnings)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Deductions</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(payslip.total_deductions)}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Net Pay</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(payslip.net_pay)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Generated On</span>
                  <p className="font-medium">{formatDate(payslip.generated_on)}</p>
                </div>
                {payslip.published_at && (
                  <div>
                    <span className="text-muted-foreground">Published At</span>
                    <p className="font-medium">{formatDate(payslip.published_at)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
