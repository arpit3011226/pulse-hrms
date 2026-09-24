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
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCreateGeneralRequest } from '../hooks/use-general-requests'
import { GENERAL_REQUEST_TYPES } from '@/lib/constants'
import { toast } from 'sonner'

const schema = z.object({
  request_type: z.string().min(1, 'Request type is required'),
  description: z.string().optional(),
  // Dynamic fields stored in custom_fields
  reason: z.string().optional(),
  asset_type: z.string().optional(),
  justification: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  current_shift: z.string().optional(),
  requested_shift: z.string().optional(),
  effective_date: z.string().optional(),
  overtime_date: z.string().optional(),
  hours: z.coerce.number().optional(),
})

type FormData = z.output<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
}

function generateTitle(type: string, data: FormData): string {
  const typeLabel = GENERAL_REQUEST_TYPES.find(t => t.value === type)?.label || type
  switch (type) {
    case 'wfh_request':
      return data.start_date && data.end_date
        ? `WFH: ${new Date(data.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(data.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`
        : typeLabel
    case 'asset_request':
      return data.asset_type ? `Asset: ${data.asset_type}` : typeLabel
    case 'overtime_request':
      return data.overtime_date
        ? `Overtime: ${new Date(data.overtime_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} (${data.hours || 0}h)`
        : typeLabel
    case 'shift_change_request':
      return data.requested_shift ? `Shift Change → ${data.requested_shift}` : typeLabel
    default:
      return typeLabel
  }
}

function buildCustomFields(type: string, data: FormData): Record<string, any> {
  switch (type) {
    case 'id_card_request':
      return { reason: data.reason || '' }
    case 'asset_request':
      return { asset_type: data.asset_type || '', justification: data.justification || '' }
    case 'wfh_request':
      return { start_date: data.start_date || '', end_date: data.end_date || '', reason: data.reason || '' }
    case 'shift_change_request':
      return {
        current_shift: data.current_shift || '',
        requested_shift: data.requested_shift || '',
        effective_date: data.effective_date || '',
        reason: data.reason || '',
      }
    case 'overtime_request':
      return { date: data.overtime_date || '', hours: data.hours || 0, reason: data.reason || '' }
    default:
      return {}
  }
}

export function GeneralRequestFormDialog({ open, onOpenChange, employeeId }: Props) {
  const { profile, organization } = useAuth()
  const createRequest = useCreateGeneralRequest()

  const form = useForm<z.input<typeof schema>, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      request_type: '',
      description: '',
      reason: '',
      asset_type: '',
      justification: '',
      start_date: '',
      end_date: '',
      current_shift: '',
      requested_shift: '',
      effective_date: '',
      overtime_date: '',
      hours: undefined as any,
    },
  })

  const requestType = form.watch('request_type')

  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open])

  async function onSubmit(data: FormData) {
    if (!organization || !profile) return

    try {
      const title = generateTitle(data.request_type, data)
      const custom_fields = buildCustomFields(data.request_type, data)

      await createRequest.mutateAsync({
        organization_id: organization.id,
        employee_id: employeeId,
        requested_by: profile.id,
        request_type: data.request_type as any,
        title,
        description: data.description,
        custom_fields,
      })

      toast.success('Request submitted successfully')
      form.reset()
      onOpenChange(false)
    } catch {
      toast.error('Failed to submit request')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="request_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENERAL_REQUEST_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic fields based on request type */}
            {requestType === 'id_card_request' && (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. New joining / Lost card / Damaged" className="min-h-[60px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {requestType === 'asset_request' && (
              <>
                <FormField
                  control={form.control}
                  name="asset_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Laptop">Laptop</SelectItem>
                          <SelectItem value="Monitor">Monitor</SelectItem>
                          <SelectItem value="Keyboard">Keyboard</SelectItem>
                          <SelectItem value="Mouse">Mouse</SelectItem>
                          <SelectItem value="Headset">Headset</SelectItem>
                          <SelectItem value="Mobile Phone">Mobile Phone</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="justification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Justification</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Why do you need this asset?" className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {requestType === 'wfh_request' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Reason for working from home" className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {requestType === 'shift_change_request' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="current_shift"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Shift</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Morning (9AM-6PM)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requested_shift"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Shift</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Evening (2PM-11PM)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="effective_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Reason for shift change" className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {requestType === 'overtime_request' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="overtime_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" min="0.5" max="12" placeholder="e.g. 2" {...field} value={(field.value as string | number | undefined) ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Reason for overtime" className="min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* General description for all types */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional information..." className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
