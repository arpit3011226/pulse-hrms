import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight, CheckCircle2, ClipboardCheck, Inbox, Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useApprovalScope } from '@/features/settings/hooks/use-delegation'

/**
 * Home — what this person actually needs to do.
 *
 * Everything here is scoped by role and, for approvals, by the delegation
 * scope, so someone covering for a colleague sees their queue too.
 */

interface Item {
  label: string
  count: number
  to: string
  tone: 'urgent' | 'normal'
}

const today = () => new Date().toISOString().split('T')[0]

export function ThingsToDoWidget({ employeeId }: { employeeId?: string }) {
  const { organization } = useAuth()
  const { isAdmin, isHR, isPayrollAdmin, canApproveLeave } = usePermissions()
  const { approverIds } = useApprovalScope(employeeId)
  const isHrSide = isAdmin || isHR

  const { data, isLoading } = useQuery({
    queryKey: ['things-to-do', employeeId, organization?.id, approverIds, isHrSide, isPayrollAdmin],
    enabled: !!organization?.id && !!employeeId,
    staleTime: 60_000,
    queryFn: async (): Promise<Item[]> => {
      const orgId = organization!.id
      const items: Item[] = []
      const count = (q: { count: number | null }) => q.count ?? 0

      // ── Everyone ───────────────────────────────────────────
      const [policies, myAcks, onboarding, myTasks, myTickets] = await Promise.all([
        supabase.from('company_policies')
          .select('id', { count: 'exact', head: false })
          .eq('organization_id', orgId).eq('is_active', true)
          .eq('requires_acknowledgement', true),
        supabase.from('policy_acknowledgements')
          .select('policy_id').eq('employee_id', employeeId!),
        supabase.from('employee_onboarding')
          .select('id, onboarding_tasks(id, status, assigned_to)')
          .eq('employee_id', employeeId!).maybeSingle(),
        supabase.from('onboarding_tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_to', employeeId!).in('status', ['pending', 'in_progress']),
        supabase.from('helpdesk_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('raised_by', employeeId!).eq('status', 'waiting_on_employee'),
      ])

      const ackedIds = new Set((myAcks.data ?? []).map((a) => a.policy_id))
      const unacked = (policies.data ?? []).filter((p) => !ackedIds.has(p.id)).length
      if (unacked > 0) {
        items.push({ label: `${unacked} polic${unacked === 1 ? 'y' : 'ies'} to acknowledge`, count: unacked, to: '/settings', tone: 'normal' })
      }

      const myOnb = onboarding.data as { onboarding_tasks?: Array<Record<string, unknown>> } | null
      const mineOpen = (myOnb?.onboarding_tasks ?? []).filter(
        (t) => t.assigned_to === employeeId && t.status !== 'completed' && t.status !== 'skipped'
      ).length
      if (mineOpen > 0) {
        items.push({ label: `${mineOpen} onboarding task${mineOpen === 1 ? '' : 's'} of your own`, count: mineOpen, to: '/new-joiners', tone: 'normal' })
      }

      const assigned = count(myTasks)
      if (assigned > 0) {
        items.push({ label: `${assigned} onboarding task${assigned === 1 ? '' : 's'} assigned to you`, count: assigned, to: '/new-joiners', tone: 'normal' })
      }

      const waiting = count(myTickets)
      if (waiting > 0) {
        items.push({ label: `${waiting} helpdesk ticket${waiting === 1 ? '' : 's'} waiting on you`, count: waiting, to: '/helpdesk', tone: 'urgent' })
      }

      // ── Approvers ──────────────────────────────────────────
      if (canApproveLeave && approverIds.length > 0) {
        const { data: reports } = await supabase.from('employees')
          .select('id').eq('organization_id', orgId).in('reporting_manager_id', approverIds)
        const reportIds = (reports ?? []).map((r) => r.id)
        if (reportIds.length > 0) {
          const [leaves, regs, travel] = await Promise.all([
            supabase.from('leave_requests').select('id', { count: 'exact', head: true })
              .in('employee_id', reportIds).eq('status', 'pending'),
            supabase.from('attendance_regularization_requests').select('id', { count: 'exact', head: true })
              .in('employee_id', reportIds).eq('status', 'pending'),
            supabase.from('travel_requests').select('id', { count: 'exact', head: true })
              .in('manager_id', approverIds).eq('status', 'pending_manager'),
          ])
          if (count(leaves) > 0) items.push({ label: `${count(leaves)} leave request${count(leaves) === 1 ? '' : 's'} to approve`, count: count(leaves), to: '/leave', tone: 'urgent' })
          if (count(regs) > 0) items.push({ label: `${count(regs)} attendance correction${count(regs) === 1 ? '' : 's'} to review`, count: count(regs), to: '/attendance', tone: 'normal' })
          if (count(travel) > 0) items.push({ label: `${count(travel)} travel request${count(travel) === 1 ? '' : 's'} to approve`, count: count(travel), to: '/self-service', tone: 'normal' })
        }
      }

      // ── HR and admin ───────────────────────────────────────
      if (isHrSide) {
        const [probation, overdueTickets, pendingExits, dataReqs, settlements] = await Promise.all([
          supabase.from('employees').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).eq('status', 'active')
            .is('confirmation_date', null).not('probation_end_date', 'is', null)
            .lte('probation_end_date', today()),
          supabase.from('helpdesk_tickets').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).in('status', ['open', 'in_progress'])
            .lt('resolution_due_at', new Date().toISOString()),
          supabase.from('employee_exit_records').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).neq('status', 'completed'),
          supabase.from('data_requests').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).eq('status', 'pending'),
          supabase.from('final_settlements').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId).eq('status', 'pending_approval'),
        ])
        if (count(probation) > 0) items.push({ label: `${count(probation)} confirmation${count(probation) === 1 ? '' : 's'} overdue`, count: count(probation), to: '/new-joiners', tone: 'urgent' })
        if (count(overdueTickets) > 0) items.push({ label: `${count(overdueTickets)} helpdesk ticket${count(overdueTickets) === 1 ? '' : 's'} past SLA`, count: count(overdueTickets), to: '/helpdesk', tone: 'urgent' })
        if (count(pendingExits) > 0) items.push({ label: `${count(pendingExits)} exit${count(pendingExits) === 1 ? '' : 's'} in progress`, count: count(pendingExits), to: '/separation', tone: 'normal' })
        if (count(dataReqs) > 0) items.push({ label: `${count(dataReqs)} data request${count(dataReqs) === 1 ? '' : 's'} to handle`, count: count(dataReqs), to: '/settings', tone: 'urgent' })
        if (count(settlements) > 0) items.push({ label: `${count(settlements)} settlement${count(settlements) === 1 ? '' : 's'} to approve`, count: count(settlements), to: '/alumni', tone: 'normal' })
      }

      // ── Payroll ────────────────────────────────────────────
      if (isPayrollAdmin || isAdmin) {
        // payroll_cycles uses processing_status, not status
        const { count: cycles } = await supabase.from('payroll_cycles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .in('processing_status', ['draft', 'processing', 'computed'])
        if ((cycles ?? 0) > 0) {
          items.push({ label: `${cycles} payroll cycle${cycles === 1 ? '' : 's'} open`, count: cycles!, to: '/payroll', tone: 'normal' })
        }
      }

      return items.sort((a, b) => (a.tone === b.tone ? b.count - a.count : a.tone === 'urgent' ? -1 : 1))
    },
  })

  const items = data ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" /> Things to do
        </CardTitle>
        <CardDescription>What is waiting on you right now.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </p>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Nothing waiting on you</p>
              <p className="text-xs text-muted-foreground">
                No approvals, tasks or acknowledgements outstanding.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="group flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Inbox
                    className={`h-4 w-4 shrink-0 ${
                      item.tone === 'urgent' ? 'text-rose-600' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="truncate text-sm">{item.label}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.tone === 'urgent' && (
                    <Badge className="bg-rose-100 text-rose-800">Needs attention</Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
