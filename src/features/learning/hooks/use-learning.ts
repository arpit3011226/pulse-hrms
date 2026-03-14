import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/learning.api'

// ── Current Employee ──────────────────────────────────────────

export function useCurrentEmployee() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['current-employee', profile?.id],
    queryFn: () => api.getCurrentEmployee(profile!.id),
    enabled: !!profile?.id,
  })
}

// ── Course Categories ──────────────────────────────────────────

export function useCourseCategories() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['course-categories', organization?.id],
    queryFn: () => api.fetchCourseCategories(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Parameters<typeof api.createCourseCategory>[0]) =>
      api.createCourseCategory({ ...data, organization_id: organization!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<any>) =>
      api.updateCourseCategory(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteCourseCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-categories'] }),
  })
}

// ── Training Courses ──────────────────────────────────────────

export function useTrainingCourses() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['training-courses', organization?.id],
    queryFn: () => api.fetchTrainingCourses(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useTrainingCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['training-course', id],
    queryFn: () => api.fetchTrainingCourse(id!),
    enabled: !!id,
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Parameters<typeof api.createTrainingCourse>[0]) =>
      api.createTrainingCourse({ ...data, organization_id: organization!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-courses'] }),
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<any>) =>
      api.updateTrainingCourse(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-courses'] })
      qc.invalidateQueries({ queryKey: ['training-course'] })
    },
  })
}

export function useUpdateCourseStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateCourseStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-courses'] })
      qc.invalidateQueries({ queryKey: ['training-course'] })
    },
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteTrainingCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-courses'] }),
  })
}

// ── Training Enrollments ──────────────────────────────────────

export function useEnrollments() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['enrollments', organization?.id],
    queryFn: () => api.fetchEnrollments(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCourseEnrollments(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-enrollments', courseId],
    queryFn: () => api.fetchCourseEnrollments(courseId!),
    enabled: !!courseId,
  })
}

export function useMyEnrollments(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['my-enrollments', employeeId],
    queryFn: () => api.fetchMyEnrollments(employeeId!),
    enabled: !!employeeId,
  })
}

export function useCreateEnrollment() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Parameters<typeof api.createEnrollment>[0]) =>
      api.createEnrollment({
        ...data,
        organization_id: organization!.id,
        enrolled_date: data.enrolled_date ?? new Date().toISOString().split('T')[0],
        status: data.status ?? 'enrolled',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['course-enrollments'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    },
  })
}

export function useBulkEnroll() {
  const qc = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (payloads: Parameters<typeof api.bulkEnroll>[0]) =>
      api.bulkEnroll(
        payloads.map((p) => ({ ...p, organization_id: organization!.id }))
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['course-enrollments'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    },
  })
}

export function useUpdateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<any>) =>
      api.updateEnrollment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['course-enrollments'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    },
  })
}

export function useDeleteEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEnrollment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['course-enrollments'] })
    },
  })
}

// ── Assessments ──────────────────────────────────────────

export function useAssessments(courseId: string | undefined) {
  return useQuery({
    queryKey: ['assessments', courseId],
    queryFn: () => api.fetchAssessments(courseId!),
    enabled: !!courseId,
  })
}

export function useAllAssessments() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['all-assessments', organization?.id],
    queryFn: () => api.fetchAllAssessments(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createAssessment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] })
      qc.invalidateQueries({ queryKey: ['all-assessments'] })
    },
  })
}

export function useUpdateAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<any>) =>
      api.updateAssessment(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] })
      qc.invalidateQueries({ queryKey: ['all-assessments'] })
    },
  })
}

export function useDeleteAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteAssessment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] })
      qc.invalidateQueries({ queryKey: ['all-assessments'] })
    },
  })
}

// ── Assessment Attempts ──────────────────────────────────

export function useAttempts(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['attempts', assessmentId],
    queryFn: () => api.fetchAttempts(assessmentId!),
    enabled: !!assessmentId,
  })
}

export function useCreateAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createAttempt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attempts'] }),
  })
}

export function useUpdateAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<any>) =>
      api.updateAttempt(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attempts'] }),
  })
}
