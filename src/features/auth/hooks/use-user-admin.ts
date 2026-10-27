import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogin, setLoginPassword, type CreateLoginInput } from '../api/user-admin.api'

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

/**
 * Set a password on an existing login and hand it over once.
 *
 * The set-password function has existed since the demo logins were created —
 * their domain is made up, so no email reaches them and "Forgot password" can
 * never work — but nothing in the app could call it. This is that caller.
 *
 * It is also the honest answer for a real person who has lost access to their
 * work email: a super admin sets one and gives it to them, rather than nobody
 * being able to help.
 */
export function useSetLoginPassword() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      setLoginPassword(email, password),
  })
}
