/**
 * The address Pulse is reachable at, for links we put in front of other people.
 *
 * Every set-password and reactivation link was built from
 * window.location.origin. That is whatever the person generating the link
 * happens to be browsing — http://localhost:5173 today — so every link HR
 * handed out pointed at a machine nobody else can reach.
 *
 * Harmless while nothing is deployed, and a live defect the moment a real
 * candidate or leaver is invited, because the link looks perfectly fine and
 * simply does not work for them.
 *
 * Set VITE_PUBLIC_APP_URL to the address people actually use. The browser's
 * own origin stays as the fallback so local development needs no setup.
 */
export function publicAppUrl(): string {
  const configured = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim()
  if (configured) return configured.replace(/\/+$/, '')
  return window.location.origin
}

/** A link into Pulse that is safe to send to somebody else. */
export function publicAppLink(path: string): string {
  return `${publicAppUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * True when links would point somewhere only this machine can reach, so the
 * screens that hand out a link can say so rather than letting HR send it.
 */
export function appUrlIsLocal(): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(publicAppUrl())
}
