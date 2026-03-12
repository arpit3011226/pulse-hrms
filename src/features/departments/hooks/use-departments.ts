import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from '../api/departments.api'
import type { Department, Designation } from '@/types/database.types'

export function useDepartments() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['departments', organization?.id],
    queryFn: () => getDepartments(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateDepartment() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (dept: Partial<Department>) =>
      createDepartment({ ...dept, organization_id: organization!.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Department> & { id: string }) =>
      updateDepartment(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useDesignations() {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['designations', organization?.id],
    queryFn: () => getDesignations(organization!.id),
    enabled: !!organization?.id,
  })
}

export function useCreateDesignation() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (des: Partial<Designation>) =>
      createDesignation({ ...des, organization_id: organization!.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['designations'] }),
  })
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Designation> & { id: string }) =>
      updateDesignation(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['designations'] }),
  })
}

export function useDeleteDesignation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDesignation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['designations'] }),
  })
}
