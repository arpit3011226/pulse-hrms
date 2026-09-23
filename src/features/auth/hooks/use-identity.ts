import { useQuery } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { getPersonContext } from '../api/identity.api'

/**
 * F43 — who is the signed-in person, across candidate, employee and alumnus?
 *
 * Use this instead of assuming the user is an employee. A candidate has no
 * employee record; an alumnus has one that is no longer active.
 */
export function usePersonContext() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['person-context', profile?.id],
    queryFn: getPersonContext,
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  })
}
