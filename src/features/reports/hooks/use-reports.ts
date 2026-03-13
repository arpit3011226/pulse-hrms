import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/reports.api'

export function useEmployeeReport() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['report-employees', organization?.id],
    queryFn: () => api.fetchEmployeesByDepartment(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useLeaveReport() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['report-leave', organization?.id],
    queryFn: () => api.fetchLeaveReport(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useAttendanceReport(startDate: string, endDate: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['report-attendance', organization?.id, startDate, endDate],
    queryFn: () => api.fetchAttendanceReport(organization!.id, startDate, endDate),
    enabled: !!organization?.id && !!startDate && !!endDate,
  })
}

export function usePayrollReport() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['report-payroll', organization?.id],
    queryFn: () => api.fetchPayrollReport(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useRecruitmentReport() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['report-recruitment', organization?.id],
    queryFn: () => api.fetchRecruitmentReport(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useApplicationsReport() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['report-applications', organization?.id],
    queryFn: () => api.fetchApplicationsReport(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useLearningReport() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['report-learning', organization?.id],
    queryFn: () => api.fetchLearningReport(organization!.id),
    enabled: !!organization?.id,
  })
}
