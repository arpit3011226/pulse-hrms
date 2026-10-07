import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePersonContext } from '@/features/auth/hooks/use-identity'
import * as api from '../api/mentorship.api'

/** Everything mentorship-related reloads together; the lists are small. */
function useBust() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['mentorships'] })
    qc.invalidateQueries({ queryKey: ['mentorship-requests'] })
    qc.invalidateQueries({ queryKey: ['mentor-directory'] })
    qc.invalidateQueries({ queryKey: ['my-mentor-profile'] })
    qc.invalidateQueries({ queryKey: ['mentorship-goals'] })
    qc.invalidateQueries({ queryKey: ['mentorship-checkins'] })
  }
}

/** The signed-in person's employee record, which every call here needs. */
export function useMyEmployeeId(): string | undefined {
  const { data } = usePersonContext()
  return data?.employee_id ?? undefined
}

export function useMentorDirectory() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['mentor-directory', organization?.id],
    queryFn: () => api.getMentorDirectory(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useMyMentorProfile() {
  const employeeId = useMyEmployeeId()
  return useQuery({
    queryKey: ['my-mentor-profile', employeeId],
    queryFn: () => api.getMyMentorProfile(employeeId!),
    enabled: !!employeeId,
  })
}

export function useSaveMentorProfile() {
  const bust = useBust()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Record<string, unknown>) =>
      api.upsertMentorProfile({ ...p, organization_id: organization!.id }),
    onSuccess: bust,
  })
}

export function useLeaveMentorPool() {
  const bust = useBust()
  return useMutation({ mutationFn: api.leaveMentorPool, onSuccess: bust })
}

export function useMentorshipRequests() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['mentorship-requests', organization?.id],
    queryFn: () => api.getMentorshipRequests(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useRequestMentor() {
  const bust = useBust()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: { mentee_id: string; mentor_id: string; message: string; goal_summary: string }) =>
      api.requestMentor({ ...p, organization_id: organization!.id }),
    onSuccess: bust,
  })
}

export function useAcceptRequest() {
  const bust = useBust()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: { request_id: string; objective: string; frequency: string; mentee_id: string }) =>
      api.acceptMentorshipRequest({ ...p, organization_id: organization!.id }),
    onSuccess: bust,
  })
}

export function useDeclineRequest() {
  const bust = useBust()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: { request_id: string; reason: string; mentee_id: string }) =>
      api.declineMentorshipRequest({ ...p, organization_id: organization!.id }),
    onSuccess: bust,
  })
}

export function useWithdrawRequest() {
  const bust = useBust()
  return useMutation({ mutationFn: api.withdrawMentorshipRequest, onSuccess: bust })
}

export function useMentorships() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['mentorships', organization?.id],
    queryFn: () => api.getMentorships(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useUpdateMentorship() {
  const bust = useBust()
  return useMutation({
    mutationFn: ({ id, ...updates }: Record<string, unknown> & { id: string }) =>
      api.updateMentorship(id, updates),
    onSuccess: bust,
  })
}

export function useEndMentorship() {
  const bust = useBust()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: {
      id: string
      status: 'completed' | 'ended'
      reason: string
      notify_employee_id: string
    }) => api.endMentorship({ ...p, organization_id: organization!.id }),
    onSuccess: bust,
  })
}

export function useMentorshipGoals(mentorshipId: string | undefined) {
  return useQuery({
    queryKey: ['mentorship-goals', mentorshipId],
    queryFn: () => api.getMentorshipGoals(mentorshipId!),
    enabled: !!mentorshipId,
  })
}

export function useAddMentorshipGoal() {
  const bust = useBust()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Record<string, unknown>) =>
      api.addMentorshipGoal({ ...p, organization_id: organization!.id }),
    onSuccess: bust,
  })
}

export function useUpdateMentorshipGoal() {
  const bust = useBust()
  return useMutation({
    mutationFn: ({ id, ...updates }: Record<string, unknown> & { id: string }) =>
      api.updateMentorshipGoal(id, updates),
    onSuccess: bust,
  })
}

export function useDeleteMentorshipGoal() {
  const bust = useBust()
  return useMutation({ mutationFn: api.deleteMentorshipGoal, onSuccess: bust })
}

export function useMentorshipCheckins(mentorshipId: string | undefined) {
  return useQuery({
    queryKey: ['mentorship-checkins', mentorshipId],
    queryFn: () => api.getMentorshipCheckins(mentorshipId!),
    enabled: !!mentorshipId,
  })
}

export function useLogCheckin() {
  const bust = useBust()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (p: Record<string, unknown>) =>
      api.logMentorshipCheckin({ ...p, organization_id: organization!.id }),
    onSuccess: bust,
  })
}
