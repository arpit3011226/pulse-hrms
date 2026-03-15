import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as surveyApi from '../api/survey.api'
import type { SurveyCategory, SurveyTargetRule, SurveyQuestionType, SurveyQuestionOption, SurveyDisplayAs } from '@/types/database.types'

// ── Query hooks ──────────────────────────────────────────

export function useSurveys() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['surveys', organization?.id],
    queryFn: () => surveyApi.getSurveys(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useSurvey(surveyId: string | undefined) {
  return useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => surveyApi.getSurvey(surveyId!),
    enabled: !!surveyId,
  })
}

export function useMyResponse(surveyId: string | undefined, employeeId: string | undefined) {
  return useQuery({
    queryKey: ['survey-my-response', surveyId, employeeId],
    queryFn: () => surveyApi.getMyResponse(surveyId!, employeeId!),
    enabled: !!surveyId && !!employeeId,
  })
}

export function useSurveyResponseCounts() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['survey-response-counts', organization?.id],
    queryFn: () => surveyApi.getSurveyResponseCounts(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useSentimentData(startDate: string, endDate: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['sentiment-data', organization?.id, startDate, endDate],
    queryFn: () => surveyApi.getSentimentAggregation(organization!.id, startDate, endDate),
    enabled: !!organization?.id && !!startDate && !!endDate,
  })
}

export function useSentimentByDepartment(startDate: string, endDate: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['sentiment-dept', organization?.id, startDate, endDate],
    queryFn: () => surveyApi.getSentimentByDepartment(organization!.id, startDate, endDate),
    enabled: !!organization?.id && !!startDate && !!endDate,
  })
}

export function useActiveSurveysForEmployee(employee: {
  id: string
  gender?: string | null
  department_id?: string | null
  designation_id?: string | null
  employment_type?: string | null
  status?: string | null
  date_of_joining?: string | null
  date_of_birth?: string | null
} | null) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['active-surveys-for-employee', organization?.id, employee?.id],
    queryFn: () => surveyApi.getActiveSurveysForEmployee(organization!.id, employee!),
    enabled: !!organization?.id && !!employee?.id,
  })
}

// ── Mutation hooks ──────────────────────────────────────────

export function useCreateSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      organization_id: string
      title: string
      description?: string | null
      target_rules?: SurveyTargetRule[]
      start_date: string
      end_date: string
      is_anonymous?: boolean
      created_by: string
      questions: {
        question_text: string
        category: SurveyCategory
        question_order: number
        is_required: boolean
        question_type?: SurveyQuestionType
        options?: SurveyQuestionOption[] | null
        display_as?: SurveyDisplayAs | null
      }[]
    }) => {
      const { questions, ...surveyData } = data
      const survey = await surveyApi.createSurvey(surveyData)
      if (questions.length > 0) {
        await surveyApi.addSurveyQuestions(survey.id, data.organization_id, questions)
      }
      return survey
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

export function useUpdateSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      surveyId,
      orgId,
      data,
      questions,
    }: {
      surveyId: string
      orgId: string
      data: {
        title?: string
        description?: string | null
        status?: 'draft' | 'active' | 'closed'
        target_rules?: SurveyTargetRule[]
        start_date?: string
        end_date?: string
        is_anonymous?: boolean
      }
      questions?: {
        question_text: string
        category: SurveyCategory
        question_order: number
        is_required: boolean
        question_type?: SurveyQuestionType
        options?: SurveyQuestionOption[] | null
        display_as?: SurveyDisplayAs | null
      }[]
    }) => {
      const survey = await surveyApi.updateSurvey(surveyId, data)
      if (questions) {
        await surveyApi.deleteSurveyQuestions(surveyId)
        if (questions.length > 0) {
          await surveyApi.addSurveyQuestions(surveyId, orgId, questions)
        }
      }
      return survey
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['survey', variables.surveyId] })
    },
  })
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (surveyId: string) => surveyApi.deleteSurvey(surveyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
    },
  })
}

export function useSubmitSurveyResponse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      surveyId: string
      orgId: string
      employeeId: string
      isAnonymous: boolean
      answers: {
        question_id: string
        rating?: number | null
        comment?: string | null
        selected_options?: string[] | null
        text_value?: string | null
      }[]
    }) =>
      surveyApi.submitSurveyResponse(
        data.surveyId,
        data.orgId,
        data.employeeId,
        data.isAnonymous,
        data.answers
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['survey-my-response', variables.surveyId] })
      queryClient.invalidateQueries({ queryKey: ['survey-response-counts'] })
      queryClient.invalidateQueries({ queryKey: ['sentiment-data'] })
      queryClient.invalidateQueries({ queryKey: ['sentiment-dept'] })
      queryClient.invalidateQueries({ queryKey: ['active-surveys-for-employee'] })
    },
  })
}
