import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import * as api from '../api/employee-lifecycle.api'
import type {
  EmployeeAddress,
  EmployeeEmergencyContact,
  EmployeeIdentityDocument,
  EmployeeBankAccount,
  EmployeeDependent,
  EmployeeNominee,
  EmployeeWorkProfile,
  EmployeeExitRecord,
  EmployeeOrgHistory,
  EmployeeDocument,
} from '@/types/database.types'

// ============================================================================
// ADDRESSES
// ============================================================================

export function useEmployeeAddresses(employeeId: string) {
  return useQuery({
    queryKey: ['employee-addresses', employeeId],
    queryFn: () => api.getEmployeeAddresses(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateAddress() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (address: Partial<EmployeeAddress>) =>
      api.createEmployeeAddress({ ...address, organization_id: organization!.id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-addresses', variables.employee_id] })
    },
  })
}

export function useUpdateAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeAddress> & { id: string }) =>
      api.updateEmployeeAddress(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-addresses'] })
    },
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEmployeeAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-addresses'] })
    },
  })
}

// ============================================================================
// EMERGENCY CONTACTS
// ============================================================================

export function useEmergencyContacts(employeeId: string) {
  return useQuery({
    queryKey: ['emergency-contacts', employeeId],
    queryFn: () => api.getEmergencyContacts(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateEmergencyContact() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (contact: Partial<EmployeeEmergencyContact>) =>
      api.createEmergencyContact({ ...contact, organization_id: organization!.id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts', variables.employee_id] })
    },
  })
}

export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeEmergencyContact> & { id: string }) =>
      api.updateEmergencyContact(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] })
    },
  })
}

export function useDeleteEmergencyContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEmergencyContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] })
    },
  })
}

// ============================================================================
// IDENTITY DOCUMENTS
// ============================================================================

export function useIdentityDocuments(employeeId: string) {
  return useQuery({
    queryKey: ['identity-documents', employeeId],
    queryFn: () => api.getIdentityDocuments(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateIdentityDocument() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (doc: Partial<EmployeeIdentityDocument>) =>
      api.createIdentityDocument({ ...doc, organization_id: organization!.id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['identity-documents', variables.employee_id] })
    },
  })
}

export function useUpdateIdentityDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeIdentityDocument> & { id: string }) =>
      api.updateIdentityDocument(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-documents'] })
    },
  })
}

export function useDeleteIdentityDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteIdentityDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity-documents'] })
    },
  })
}

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export function useBankAccounts(employeeId: string) {
  return useQuery({
    queryKey: ['bank-accounts', employeeId],
    queryFn: () => api.getBankAccounts(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (account: Partial<EmployeeBankAccount>) =>
      api.createBankAccount({ ...account, organization_id: organization!.id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts', variables.employee_id] })
    },
  })
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeBankAccount> & { id: string }) =>
      api.updateBankAccount(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
  })
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
  })
}

export function useSetSalaryAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, accountId }: { employeeId: string; accountId: string }) =>
      api.setSalaryAccount(employeeId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
    },
  })
}

// ============================================================================
// DEPENDENTS
// ============================================================================

export function useDependents(employeeId: string) {
  return useQuery({
    queryKey: ['dependents', employeeId],
    queryFn: () => api.getDependents(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateDependent() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (dependent: Partial<EmployeeDependent>) =>
      api.createDependent({ ...dependent, organization_id: organization!.id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dependents', variables.employee_id] })
    },
  })
}

export function useUpdateDependent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeDependent> & { id: string }) =>
      api.updateDependent(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependents'] })
    },
  })
}

export function useDeleteDependent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteDependent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependents'] })
    },
  })
}

// ============================================================================
// NOMINEES
// ============================================================================

export function useNominees(employeeId: string) {
  return useQuery({
    queryKey: ['nominees', employeeId],
    queryFn: () => api.getNominees(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateNominee() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (nominee: Partial<EmployeeNominee>) =>
      api.createNominee({ ...nominee, organization_id: organization!.id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nominees', variables.employee_id] })
    },
  })
}

export function useUpdateNominee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeNominee> & { id: string }) =>
      api.updateNominee(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominees'] })
    },
  })
}

export function useDeleteNominee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteNominee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nominees'] })
    },
  })
}

// ============================================================================
// WORK PROFILES
// ============================================================================

export function useWorkProfiles(employeeId: string) {
  return useQuery({
    queryKey: ['work-profiles', employeeId],
    queryFn: () => api.getWorkProfiles(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateWorkProfile() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: ({ orgHistory, ...profile }: Partial<EmployeeWorkProfile> & { orgHistory?: Partial<EmployeeOrgHistory> }) =>
      api.createWorkProfile({ ...profile, organization_id: organization!.id }, orgHistory ? { ...orgHistory, organization_id: organization!.id } : undefined),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-profiles', variables.employee_id] })
      queryClient.invalidateQueries({ queryKey: ['org-history', variables.employee_id] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

// ============================================================================
// EXIT RECORDS
// ============================================================================

export function useExitRecord(employeeId: string) {
  return useQuery({
    queryKey: ['exit-record', employeeId],
    queryFn: () => api.getExitRecord(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateExitRecord() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (record: Partial<EmployeeExitRecord>) =>
      api.createExitRecord({ ...record, organization_id: organization!.id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exit-record', variables.employee_id] })
      queryClient.invalidateQueries({ queryKey: ['status-history', variables.employee_id] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

export function useUpdateExitRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeExitRecord> & { id: string }) =>
      api.updateExitRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exit-record'] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}

// ============================================================================
// STATUS & ORG HISTORY (read-only)
// ============================================================================

export function useStatusHistory(employeeId: string) {
  return useQuery({
    queryKey: ['status-history', employeeId],
    queryFn: () => api.getStatusHistory(employeeId),
    enabled: !!employeeId,
  })
}

export function useOrgHistory(employeeId: string) {
  return useQuery({
    queryKey: ['org-history', employeeId],
    queryFn: () => api.getOrgHistory(employeeId),
    enabled: !!employeeId,
  })
}

// ============================================================================
// EMPLOYEE DOCUMENTS
// ============================================================================

export function useEmployeeDocuments(employeeId: string) {
  return useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: () => api.getEmployeeDocuments(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateEmployeeDocument() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (doc: Partial<EmployeeDocument>) =>
      api.createEmployeeDocument({ ...doc, organization_id: organization!.id }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', variables.employee_id] })
    },
  })
}

export function useUpdateEmployeeDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<EmployeeDocument> & { id: string }) =>
      api.updateEmployeeDocument(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] })
    },
  })
}

export function useDeleteEmployeeDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEmployeeDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents'] })
    },
  })
}
