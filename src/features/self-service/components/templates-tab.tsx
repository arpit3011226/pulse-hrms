import { useState } from 'react'
import {
  FileText, DollarSign, MapPin, Award, UserCheck, ShieldCheck,
  UserPlus, Mail, Briefcase, CheckCircle, AlertTriangle, XCircle,
  TrendingUp, Pencil, Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLetterTemplates, useDeleteTemplate } from '../hooks/use-self-service'
import { TemplateEditorDialog } from './template-editor-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import type { LetterTemplate } from '@/types/database.types'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  experience_letter: Award,
  salary_certificate: DollarSign,
  address_proof: MapPin,
  bonafide_certificate: FileText,
  relieving_letter: UserCheck,
  noc: ShieldCheck,
  reference_letter: UserPlus,
  offer_letter: Mail,
  appointment_letter: Briefcase,
  confirmation_letter: CheckCircle,
  warning_letter: AlertTriangle,
  termination_letter: XCircle,
  salary_revision_letter: TrendingUp,
}

const CATEGORY_COLORS: Record<string, string> = {
  experience_letter: 'bg-emerald-50 text-emerald-600',
  salary_certificate: 'bg-blue-50 text-blue-600',
  address_proof: 'bg-violet-50 text-violet-600',
  bonafide_certificate: 'bg-amber-50 text-amber-600',
  relieving_letter: 'bg-teal-50 text-teal-600',
  noc: 'bg-indigo-50 text-indigo-600',
  reference_letter: 'bg-pink-50 text-pink-600',
  offer_letter: 'bg-rose-50 text-rose-600',
  appointment_letter: 'bg-sky-50 text-sky-600',
  confirmation_letter: 'bg-green-50 text-green-600',
  warning_letter: 'bg-orange-50 text-orange-600',
  termination_letter: 'bg-red-50 text-red-600',
  salary_revision_letter: 'bg-cyan-50 text-cyan-600',
}

const APPROVAL_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  auto: { label: 'Auto', variant: 'secondary' },
  approval_required: { label: 'Approval', variant: 'outline' },
  hr_only: { label: 'HR Only', variant: 'default' },
}

export function TemplatesTab() {
  const { data: templates, isLoading } = useLetterTemplates()
  const deleteTemplate = useDeleteTemplate()
  const [editTemplate, setEditTemplate] = useState<LetterTemplate | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!templates?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
        <p>No templates created yet. Click "New Template" to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const Icon = CATEGORY_ICONS[template.category] || FileText
          const colorClass = CATEGORY_COLORS[template.category] || 'bg-gray-50 text-gray-600'
          const approval = APPROVAL_BADGES[template.approval_type] || APPROVAL_BADGES.auto

          return (
            <Card
              key={template.id}
              className="group relative hover:shadow-md transition-shadow cursor-pointer border-border/50"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant={approval.variant} className="text-xs">
                    {approval.label}
                  </Badge>
                </div>

                <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                {template.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                )}

                <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditTemplate(template)
                      setEditOpen(true)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteId(template.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <TemplateEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        template={editTemplate}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Template"
        description="Are you sure you want to delete this template? It will no longer be available for letter generation."
        onConfirm={() => {
          if (deleteId) {
            deleteTemplate.mutate(deleteId)
            setDeleteId(null)
          }
        }}
      />
    </>
  )
}
