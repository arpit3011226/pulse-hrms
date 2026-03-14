import { useState } from 'react'
import {
  FileText, DollarSign, MapPin, Award, Download, Clock,
  CheckCircle2, XCircle, Loader2, Send,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useLetterTemplates, useMyLetterRequests, useRequestLetter } from '../hooks/use-self-service'
import { resolvePlaceholders } from '../utils/resolve-placeholders'
import { generateLetterPdf } from '../utils/generate-letter-pdf'
import { LetterRequestDialog } from './letter-request-dialog'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { getCurrentEmployee } from '@/features/attendance/api/attendance.api'
import { supabase } from '@/lib/supabase'
import type { LetterTemplate } from '@/types/database.types'

const AUTO_CATEGORY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  experience_letter: { icon: Award, color: 'bg-emerald-50 text-emerald-600' },
  salary_certificate: { icon: DollarSign, color: 'bg-blue-50 text-blue-600' },
  address_proof: { icon: MapPin, color: 'bg-violet-50 text-violet-600' },
  bonafide_certificate: { icon: FileText, color: 'bg-amber-50 text-amber-600' },
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  pending_manager: { label: 'Pending Manager', color: 'bg-yellow-100 text-yellow-800' },
  manager_approved: { label: 'Manager Approved', color: 'bg-blue-100 text-blue-800' },
  manager_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  pending_hr: { label: 'Pending HR', color: 'bg-orange-100 text-orange-800' },
  hr_approved: { label: 'HR Approved', color: 'bg-green-100 text-green-800' },
  hr_rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
}

interface Props {
  employeeId: string
}

export function MyLettersTab({ employeeId }: Props) {
  const { profile, organization } = useAuth()
  const { data: templates, isLoading: templatesLoading } = useLetterTemplates()
  const { data: requests, isLoading: requestsLoading } = useMyLetterRequests(employeeId)
  const requestLetter = useRequestLetter()
  const [requestDialogTemplate, setRequestDialogTemplate] = useState<LetterTemplate | null>(null)

  // Fetch full employee data for placeholder resolution
  const { data: fullEmployee } = useQuery({
    queryKey: ['employee-detail', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments!department_id(id, name),
          designation:designations!designation_id(id, title)
        `)
        .eq('id', employeeId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!employeeId,
  })

  const autoTemplates = templates?.filter(t => t.approval_type === 'auto') || []
  const approvalTemplates = templates?.filter(t => t.approval_type === 'approval_required') || []

  async function handleAutoGenerate(template: LetterTemplate) {
    if (!organization || !profile || !fullEmployee) return

    try {
      await requestLetter.mutateAsync({
        organization_id: organization.id,
        template_id: template.id,
        employee_id: employeeId,
        requested_by: profile.id,
      })

      // Generate PDF immediately
      const resolved = resolvePlaceholders(template.body_html, {
        employee: fullEmployee as any,
        organization,
      })
      generateLetterPdf(
        resolved,
        template.name,
        organization,
        `${fullEmployee.first_name} ${fullEmployee.last_name}`,
        new Date().toISOString()
      )

      toast.success(`${template.name} generated and downloaded`)
    } catch {
      toast.error('Failed to generate letter')
    }
  }

  function handleDownload(request: any) {
    if (!organization || !fullEmployee || !request.template) return

    const resolved = request.resolved_body_html || resolvePlaceholders(request.template.body_html, {
      employee: fullEmployee as any,
      organization,
    })
    generateLetterPdf(
      resolved,
      request.template.name,
      organization,
      `${fullEmployee.first_name} ${fullEmployee.last_name}`,
      request.created_at
    )
  }

  const isLoading = templatesLoading || requestsLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Auto-generate section */}
      {autoTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Instant Letters (No Approval Required)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {autoTemplates.map((template) => {
              const cfg = AUTO_CATEGORY_ICONS[template.category] || { icon: FileText, color: 'bg-gray-50 text-gray-600' }
              const Icon = cfg.icon
              return (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-shadow cursor-pointer border-border/50"
                  onClick={() => handleAutoGenerate(template)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground">Click to generate & download</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Approval-required section */}
      {approvalTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Request Letters (Requires Approval)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {approvalTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow cursor-pointer border-border/50"
                onClick={() => setRequestDialogTemplate(template)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-orange-50 text-orange-600">
                    <Send className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground">Manager & HR approval needed</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Request History */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          My Letter History
        </h3>

        {!requests?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No letter requests yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => {
              const status = STATUS_STYLES[req.status] || STATUS_STYLES.draft
              return (
                <Card key={req.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{req.template?.name || 'Letter'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                      {req.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(req)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <LetterRequestDialog
        open={!!requestDialogTemplate}
        onOpenChange={(open) => { if (!open) setRequestDialogTemplate(null) }}
        template={requestDialogTemplate}
        employeeId={employeeId}
      />
    </div>
  )
}
