import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  generateNextEmployeeCode,
  type EmployeeFilters,
} from '../api/employees.api'
import type { Employee } from '@/types/database.types'

export function useEmployees(filters?: EmployeeFilters) {
  const { organization } = useAuth()

  return useQuery({
    queryKey: ['employees', organization?.id, filters],
    queryFn: () => getEmployees(organization!.id, filters),
    enabled: !!organization?.id,
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => getEmployee(id),
    enabled: !!id,
  })
}

export function useNextEmployeeCode() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['next-employee-code', organization?.id],
    queryFn: () => generateNextEmployeeCode(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()

  return useMutation({
    mutationFn: (employee: Partial<Employee>) =>
      createEmployee({ ...employee, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Employee> & { id: string }) =>
      updateEmployee(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
