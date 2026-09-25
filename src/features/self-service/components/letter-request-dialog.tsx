import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useRequestLetter } from '../hooks/use-self-service'
import { toast } from 'sonner'
import type { LetterTemplate } from '@/types/database.types'

const schema = z.object({
  remarks: z.string().optional(),
})

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: LetterTemplate | null
  employeeId: string
}

export function LetterRequestDialog({ open, onOpenChange, template, employeeId }: Props) {
  const { profile, organization } = useAuth()
  const requestLetter = useRequestLetter()

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { remarks: '' },
  })

  async function onSubmit(data: z.infer<typeof schema>) {
    if (!template || !organization || !profile) return

    try {
      await requestLetter.mutateAsync({
        organization_id: organization.id,
        template_id: template.id,
        employee_id: employeeId,
        requested_by: profile.id,
        remarks: data.remarks,
      })
      toast.success(`${template.name} requested successfully`)
      form.reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle>Request {template?.name || 'Letter'}</DialogTitle>
        </DialogHeader>

        {template && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{template.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Approval</span>
              <Badge variant="outline">Manager & HR</Badge>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason / Remarks (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Required for visa application"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={requestLetter.isPending}>
                {requestLetter.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
