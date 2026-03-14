import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import type { TaxDeclaration } from '@/types/database.types'
import {
  getTaxDeclarations,
  getMyTaxDeclaration,
  createTaxDeclaration,
  updateTaxDeclaration,
  verifyTaxDeclaration,
  calculateTds,
  getTdsRecords,
  upsertTdsRecord,
} from '../api/tax.api'

// ============================================
// Tax Declarations
// ============================================

export function useTaxDeclarations(financialYear?: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['tax-declarations', organization?.id, financialYear],
    queryFn: () => getTaxDeclarations(organization!.id, financialYear),
    enabled: !!organization?.id,
  })
}

export function useMyTaxDeclaration(employeeId: string, financialYear: string) {
  return useQuery({
    queryKey: ['my-tax-declaration', employeeId, financialYear],
    queryFn: () => getMyTaxDeclaration(employeeId, financialYear),
    enabled: !!employeeId && !!financialYear,
  })
}

export function useCreateTaxDeclaration() {
  const queryClient = useQueryClient()
  const { organization } = useAuth()
  return useMutation({
    mutationFn: (data: Partial<TaxDeclaration>) =>
      createTaxDeclaration({ ...data, organization_id: organization!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-declarations'] })
      queryClient.invalidateQueries({ queryKey: ['my-tax-declaration'] })
    },
  })
}

export function useUpdateTaxDeclaration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<TaxDeclaration> & { id: string }) =>
      updateTaxDeclaration(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-declarations'] })
      queryClient.invalidateQueries({ queryKey: ['my-tax-declaration'] })
    },
  })
}

export function useVerifyTaxDeclaration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      verifiedBy,
      status,
      remarks,
    }: {
      id: string
      verifiedBy: string
      status: 'verified' | 'rejected'
      remarks?: string
    }) => verifyTaxDeclaration(id, verifiedBy, status, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-declarations'] })
    },
  })
}

// ============================================
// TDS Calculation
// ============================================

export function useTdsCalculation(employeeId: string, financialYear?: string) {
  return useQuery({
    queryKey: ['tds-calculation', employeeId, financialYear],
    queryFn: () => calculateTds(employeeId, financialYear),
    enabled: !!employeeId,
  })
}

// ============================================
// TDS Records
// ============================================

export function useTdsRecords(financialYear: string) {
  const { organization } = useAuth()
  return useQuery({
    queryKey: ['tds-records', organization?.id, financialYear],
    queryFn: () => getTdsRecords(organization!.id, financialYear),
    enabled: !!organization?.id && !!financialYear,
  })
}

export function useUpsertTdsRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: upsertTdsRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tds-records'] })
      queryClient.invalidateQueries({ queryKey: ['tds-calculation'] })
    },
  })
}
