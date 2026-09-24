import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useLetterTemplates, useRequestLetter } from '../hooks/use-self-service'
import { resolvePlaceholders } from '../utils/resolve-placeholders'
import { generateLetterPdf } from '../utils/generate-letter-pdf'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  template_id: z.string().min(1, 'Template is required'),
  remarks: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HrGenerateLetterDialog({ open, onOpenChange }: Props) {
  const { profile, organization } = useAuth()
  const { data: templates } = useLetterTemplates()
  const requestLetter = useRequestLetter()
  const [employees, setEmployees] = useState<any[]>([])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { employee_id: '', template_id: '', remarks: '' },
  })

  // Fetch all active employees
  useEffect(() => {
    if (!open || !organization?.id) return
    supabase
      .from('employees')
      .select(`
        id, first_name, last_name, employee_code,
        department:departments!department_id(id, name),
        designation:designations!designation_id(id, title)
      `)
      .eq('organization_id', organization.id)
      .eq('status', 'active')
      .order('first_name')
      .then(({ data }) => {
        if (data) setEmployees(data)
      })
  }, [open, organization?.id])

  // Filter to HR-only templates + all other templates for HR
  const hrTemplates = templates || []

  async function onSubmit(data: z.infer<typeof schema>) {
    if (!organization || !profile) return

    try {
      await requestLetter.mutateAsync({
        organization_id: organization.id,
        template_id: data.template_id,
        employee_id: data.employee_id,
        requested_by: profile.id,
        remarks: data.remarks,
      })

      // Generate PDF
      const template = templates?.find(t => t.id === data.template_id)
      const employee = employees.find(e => e.id === data.employee_id)

      if (template && employee && organization) {
        const resolved = resolvePlaceholders(template.body_html, {
          employee: employee as any,
          organization,
        })
        generateLetterPdf(
          resolved,
          template.name,
          organization,
          `${employee.first_name} ${employee.last_name}`,
          new Date().toISOString()
        )
      }

      toast.success('Letter generated and downloaded')
      form.reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to generate letter')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Letter for Employee</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                          {emp.employee_code ? ` (${emp.employee_code})` : ''}
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
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Letter Template</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hrTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
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
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this letter"
                      className="min-h-[60px]"
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
              <Button type="submit" disabled={requestLetter.isPending}>
                {requestLetter.isPending ? 'Generating...' : 'Generate & Download'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
