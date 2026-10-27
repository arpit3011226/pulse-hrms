/**
 * Where a person belongs when they sign in.
 *
 * Kept in one place because two layouts used to answer it separately and
 * disagreed. AuthLayout sent everybody to /dashboard; AppLayout then bounced
 * candidates and alumni to their own screen. The extra hop briefly mounted
 * the staff dashboard for somebody who is not staff, firing a burst of
 * queries they cannot answer — visible as a 406 on /employees at every
 * candidate sign-in, and as a spinner while it happened.
 *
 * Neither layout should know the rule. They should both ask.
 */
export function landingPathFor(role: string | null | undefined): string {
  if (role === 'candidate') return '/my-application'
  if (role === 'alumni') return '/my-records'
  return '/dashboard'
}
