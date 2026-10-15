import { useCallback } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'

/**
 * Which tab a module is showing, kept in the address bar as `?tab=`.
 *
 * Tabs used to be internal state, so there was no way to send somebody to a
 * particular screen. The Quick Actions on the home page tried anyway and
 * landed on whichever tab happened to open first — "Approve Leaves" dropped
 * you on your own leave, "Run Payroll" on your payslips — and "Apply Leave"
 * pointed at /leave/apply, which was never a route, so it just said Not Found.
 *
 * With the tab in the URL a link can name the screen it means, the back button
 * works through tabs, and a refresh keeps you where you were.
 *
 * `allowed` matters: tabs differ by role, so a link to a tab this person does
 * not have would otherwise leave the page blank. An unknown or forbidden tab
 * falls back to the default rather than showing nothing.
 */
export function useModuleTab(defaultTab: string, allowed: readonly string[]) {
  const navigate = useNavigate()
  const location = useLocation()

  const requested = (location.search as { tab?: string } | undefined)?.tab
  const tab = requested && allowed.includes(requested) ? requested : defaultTab

  const setTab = useCallback(
    (next: string) => {
      // `replace` so flicking between tabs does not fill the back button with
      // one entry per tab.
      navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({ ...prev, tab: next }),
        replace: true,
      })
    },
    [navigate]
  )

  return [tab, setTab] as const
}

/**
 * A one-shot instruction in the URL, such as `?action=apply` to open the apply
 * form as soon as the screen loads.
 *
 * Returns the action and a way to clear it. Clearing matters: without it the
 * form would open again every time the page re-rendered, and again on a
 * refresh, which is maddening.
 */
export function useModuleAction() {
  const navigate = useNavigate()
  const location = useLocation()
  const action = (location.search as { action?: string } | undefined)?.action ?? null

  const clearAction = useCallback(() => {
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => {
        const next = { ...prev }
        delete next.action
        return next
      },
      replace: true,
    })
  }, [navigate])

  return { action, clearAction }
}
