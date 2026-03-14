import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCreateTemplate, useUpdateTemplate } from '../hooks/use-self-service'
import { LETTER_CATEGORIES, TEMPLATE_PLACEHOLDERS } from '@/lib/constants'
import { toast } from 'sonner'
import type { LetterTemplate, LetterApprovalType } from '@/types/database.types'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  body_html: z.string().min(1, 'Letter body is required'),
  approval_type: z.string().min(1),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: LetterTemplate | null
}

export function TemplateEditorDialog({ open, onOpenChange, template }: Props) {
  const { profile, organization } = useAuth()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      category: '',
      description: '',
      body_html: '',
      approval_type: 'auto',
    },
  })

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        category: template.category,
        description: template.description || '',
        body_html: template.body_html,
        approval_type: template.approval_type,
      })
    } else {
      form.reset({
        name: '',
        category: '',
        description: '',
        body_html: '',
        approval_type: 'auto',
      })
    }
  }, [template, open])

  // Auto-set approval type when category changes
  const watchCategory = form.watch('category')
  useEffect(() => {
    const cat = LETTER_CATEGORIES.find(c => c.value === watchCategory)
    if (cat) {
      form.setValue('approval_type', cat.approvalType)
    }
  }, [watchCategory])

  const isEditing = !!template
  const isSubmitting = createTemplate.isPending || updateTemplate.isPending

  async function onSubmit(data: FormData) {
    try {
      if (isEditing) {
        await updateTemplate.mutateAsync({
          id: template!.id,
          data: {
            name: data.name,
            category: data.category as any,
            description: data.description || null,
            body_html: data.body_html,
            approval_type: data.approval_type as LetterApprovalType,
          },
        })
        toast.success('Template updated')
      } else {
        await createTemplate.mutateAsync({
          organization_id: organization!.id,
          name: data.name,
          category: data.category as any,
          description: data.description || null,
          body_html: data.body_html,
          approval_type: data.approval_type as LetterApprovalType,
          is_active: true,
          created_by: profile!.id,
        })
        toast.success('Template created')
      }
      onOpenChange(false)
    } catch {
      toast.error('Error saving template')
    }
  }

  function insertPlaceholder(key: string) {
    const textarea = document.querySelector<HTMLTextAreaElement>('[name="body_html"]')
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const current = form.getValues('body_html')
      const newValue = current.substring(0, start) + key + current.substring(end)
      form.setValue('body_html', newValue)
      // Restore cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + key.length, start + key.length)
      }, 0)
    } else {
      form.setValue('body_html', form.getValues('body_html') + key)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Template' : 'Create Letter Template'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Experience Letter" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        {LETTER_CATEGORIES.map((cat) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="approval_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approval Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="auto">Auto (No Approval)</SelectItem>
                        <SelectItem value="approval_required">Requires Approval</SelectItem>
                        <SelectItem value="hr_only">HR Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Placeholder chips */}
            <div>
              <p className="text-sm font-medium mb-2">Insert Placeholders</p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_PLACEHOLDERS.map((ph) => (
                  <Badge
                    key={ph.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                    onClick={() => insertPlaceholder(ph.key)}
                  >
                    {ph.label}
                  </Badge>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="body_html"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Letter Body</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Dear {{employee_name}},\n\nThis is to certify that...`}
                      className="min-h-[300px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
