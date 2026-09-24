import { useState } from 'react'
import { toast } from 'sonner'
import { Download, FileText, Loader2, Receipt, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useMyAlumniRecords } from '../hooks/use-alumni'
import { getPayslipDetail } from '@/features/payroll/api/payroll.api'
import { generatePayslipPdf } from '@/features/payroll/utils/generate-payslip-pdf'
import { formatCurrency, formatDate } from '@/lib/utils'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * F39 — what an ex-employee can fetch about themselves.
 *
 * Works because the employees row survives their leaving and the login is on a
 * personal email (F43), so "my own records" policies keep matching.
 */
export function MyRecordsPage() {
  const { profile, organization } = useAuth()
  const { data, isLoading } = useMyAlumniRecords(profile?.id)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  /**
   * Same document an employee gets, from the same generator. An alumnus can read
   * their own payslip and its lines because those policies are written around
   * ownership, not around still working here.
   */
  async function handleDownload(payslipId: string) {
    if (!organization) return
    setDownloadingId(payslipId)
    try {
      const detail = await getPayslipDetail(payslipId)
      generatePayslipPdf(detail, organization)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not produce that payslip. Please contact HR.'
      )
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your records…
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="My Records" description="Your documents from your time here." />
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-medium">No records found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This login is not linked to an employee record.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { employee, payslips, letters, settlement, exit } = data
  const published = (payslips as Array<Record<string, unknown>>).filter((p) => p.published_flag)

  return (
    <div>
      <PageHeader
        title="My Records"
        description={
          exit
            ? `Your documents from your time here. Last working day ${formatDate((exit as Record<string, unknown>).last_working_date as string)}.`
            : 'Your payslips, letters and settlement.'
        }
      />

      <div className="space-y-6">
        {settlement && (
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4" /> Full and final settlement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(Math.abs((settlement as Record<string, unknown>).net_payable as number ?? 0))}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {((settlement as Record<string, unknown>).net_payable as number ?? 0) < 0
                      ? 'Recoverable'
                      : 'Net payable'}
                  </p>
                </div>
                <Badge
                  className={
                    (settlement as Record<string, unknown>).status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }
                >
                  {String((settlement as Record<string, unknown>).status).replace('_', ' ')}
                </Badge>
              </div>
              {(settlement as Record<string, unknown>).paid_on ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Paid on {formatDate((settlement as Record<string, unknown>).paid_on as string)}
                </p>
              ) : null}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" /> Payslips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {published.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No published payslips are available.
              </p>
            ) : (
              <div className="divide-y">
                {published.map((p) => (
                  <div key={p.id as string} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">
                        {MONTHS[(p.payroll_month as number) - 1]} {p.payroll_year as number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(p.payslip_number as string) ?? ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatCurrency((p.net_pay as number) ?? 0)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download payslip"
                        disabled={downloadingId === (p.id as string)}
                        onClick={() => handleDownload(p.id as string)}
                      >
                        {downloadingId === (p.id as string) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Letters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(letters as Array<Record<string, unknown>>).length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No letters have been issued to you.
              </p>
            ) : (
              <div className="divide-y">
                {(letters as Array<Record<string, unknown>>).map((l) => {
                  const tpl = l.letter_template as Record<string, unknown> | null
                  return (
                    <div key={l.id as string} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-medium">{(tpl?.name as string) ?? 'Letter'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(l.created_at as string)}
                        </p>
                      </div>
                      <Badge variant={l.status === 'issued' ? 'default' : 'secondary'}>
                        {String(l.status).replace('_', ' ')}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Signed in as {employee.personal_email ?? employee.email}. If something you expect is
          missing, contact HR.
        </p>
      </div>
    </div>
  )
}
