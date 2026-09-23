import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/helpdesk.api'
import type { HelpdeskCategory, HelpdeskTicket } from '../api/helpdesk.api'

const bust = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ['helpdesk'] })

export function useHelpdeskCategories() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['helpdesk', 'categories', organization?.id],
    queryFn: () => api.getCategories(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateHelpdeskCategory() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Partial<HelpdeskCategory>) =>
      api.createCategory({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc),
  })
}

export function useTickets() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['helpdesk', 'tickets', organization?.id],
    queryFn: () => api.getTickets(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useRaiseTicket() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Omit<Parameters<typeof api.raiseTicket>[0], 'orgId'>) =>
      api.raiseTicket({ ...p, orgId: organization!.id }),
    onSuccess: () => bust(qc),
  })
}

export function useUpdateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...u }: Partial<HelpdeskTicket> & { id: string }) => api.updateTicket(id, u),
    onSuccess: () => bust(qc),
  })
}

export function useEscalateTicket() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: api.escalateTicket, onSuccess: () => bust(qc) })
}

export function useTicketComments(ticketId: string | undefined) {
  return useQuery({
    queryKey: ['helpdesk', 'comments', ticketId],
    queryFn: () => api.getComments(ticketId!),
    enabled: !!ticketId,
  })
}

export function useAddTicketComment() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Omit<Parameters<typeof api.addComment>[0], 'organization_id'>) =>
      api.addComment({ ...p, organization_id: organization!.id }),
    onSuccess: () => bust(qc),
  })
}
