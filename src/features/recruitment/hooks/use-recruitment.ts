import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type {
  InterviewStage,
  JobRequisition,
  Candidate,
  CandidateApplication,
  Interview,
  InterviewFeedback,
  OfferLetter,
  CandidateConversionRecord,
} from '@/types/database.types'
import {
  getInterviewStages,
  createInterviewStage,
  updateInterviewStage,
  deleteInterviewStage,
  getJobRequisitions,
  createJobRequisition,
  updateJobRequisition,
  updateJobRequisitionStatus,
  deleteJobRequisition,
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  getCandidateApplications,
  createCandidateApplication,
  updateCandidateApplicationStatus,
  moveCandidateToStage,
  getCandidateStageHistory,
  getInterviews,
  createInterview,
  updateInterview,
  updateInterviewStatus,
  submitInterviewFeedback,
  getOfferLetters,
  createOfferLetter,
  updateOfferLetter,
  updateOfferStatus,
  createCandidateConversion,
} from '../api/recruitment.api'

// ============================================
// Interview Stages
// ============================================

export function useInterviewStages() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['interview-stages', organization?.id],
    queryFn: () => getInterviewStages(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateInterviewStage() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<InterviewStage>) =>
      createInterviewStage({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-stages'] })
    },
  })
}

export function useUpdateInterviewStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<InterviewStage> & { id: string }) =>
      updateInterviewStage(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-stages'] })
    },
  })
}

export function useDeleteInterviewStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteInterviewStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-stages'] })
    },
  })
}

// ============================================
// Job Requisitions
// ============================================

export function useJobRequisitions() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['job-requisitions', organization?.id],
    queryFn: () => getJobRequisitions(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateJobRequisition() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<JobRequisition>) =>
      createJobRequisition({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-requisitions'] })
    },
  })
}

export function useUpdateJobRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<JobRequisition> & { id: string }) =>
      updateJobRequisition(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-requisitions'] })
    },
  })
}

export function useUpdateJobRequisitionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateJobRequisitionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-requisitions'] })
    },
  })
}

export function useDeleteJobRequisition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteJobRequisition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-requisitions'] })
    },
  })
}

// ============================================
// Candidates
// ============================================

export function useCandidates() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['candidates', organization?.id],
    queryFn: () => getCandidates(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateCandidate() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<Candidate>) =>
      createCandidate({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Candidate> & { id: string }) =>
      updateCandidate(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
  })
}

// ============================================
// Candidate Applications
// ============================================

export function useCandidateApplications(requisitionId?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['candidate-applications', organization?.id, requisitionId],
    queryFn: () => getCandidateApplications(organization!.id, requisitionId),
    enabled: !!organization?.id,
  })
}

export function useCreateCandidateApplication() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<CandidateApplication>) =>
      createCandidateApplication({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
    },
  })
}

export function useUpdateCandidateApplicationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) =>
      updateCandidateApplicationStatus(id, status, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
    },
  })
}

export function useMoveCandidateToStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ applicationId, toStageId, fromStageId, movedBy, notes }: {
      applicationId: string
      toStageId: string
      fromStageId: string | null
      movedBy: string | null
      notes?: string
    }) => moveCandidateToStage(applicationId, toStageId, fromStageId, movedBy, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
      queryClient.invalidateQueries({ queryKey: ['candidate-stage-history'] })
    },
  })
}

export function useCandidateStageHistory(applicationId: string) {
  return useQuery({
    queryKey: ['candidate-stage-history', applicationId],
    queryFn: () => getCandidateStageHistory(applicationId),
    enabled: !!applicationId,
  })
}

// ============================================
// Interviews
// ============================================

export function useInterviews() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['interviews', organization?.id],
    queryFn: () => getInterviews(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateInterview() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<Interview>) =>
      createInterview({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
    },
  })
}

export function useUpdateInterview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Interview> & { id: string }) =>
      updateInterview(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
    },
  })
}

export function useUpdateInterviewStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateInterviewStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
    },
  })
}

// ============================================
// Interview Feedback
// ============================================

export function useSubmitInterviewFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<InterviewFeedback>) => submitInterviewFeedback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] })
    },
  })
}

// ============================================
// Offer Letters
// ============================================

export function useOfferLetters() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['offer-letters', organization?.id],
    queryFn: () => getOfferLetters(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateOfferLetter() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<OfferLetter>) =>
      createOfferLetter({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] })
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
    },
  })
}

export function useUpdateOfferLetter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<OfferLetter> & { id: string }) =>
      updateOfferLetter(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] })
    },
  })
}

export function useUpdateOfferStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, offerStatus, applicationId }: { id: string; offerStatus: string; applicationId?: string }) =>
      updateOfferStatus(id, offerStatus, applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] })
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
    },
  })
}

// ============================================
// Candidate Conversion
// ============================================

export function useCreateCandidateConversion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CandidateConversionRecord>) => createCandidateConversion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] })
      queryClient.invalidateQueries({ queryKey: ['offer-letters'] })
    },
  })
}
