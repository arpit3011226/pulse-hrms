import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogin, type CreateLoginInput } from '../api/user-admin.api'

export function useCreateLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLoginInput) => createLogin(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['alumni'] })
    },
  })
}
