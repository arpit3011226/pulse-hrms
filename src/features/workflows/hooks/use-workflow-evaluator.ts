import { useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { evaluateAndRunWorkflows } from '../utils/evaluate-triggers'

/**
 * Fires workflow evaluation once per dashboard mount (deduped per session tab).
 * Should be placed inside DashboardPage so it runs each time the user loads the dashboard.
 * The evaluate function itself deduplicates via workflow_runs, so multiple calls are safe.
 */
export function useWorkflowEvaluator() {
  const { organization } = useAuth()
  const hasRun = useRef(false)

  useEffect(() => {
    if (!organization?.id || hasRun.current) return
    hasRun.current = true

    // Fire and forget — never block the dashboard
    evaluateAndRunWorkflows(organization.id).catch((err) => {
      console.error('[Workflows] Auto-evaluation failed:', err)
    })
  }, [organization?.id])
}
