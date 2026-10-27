import { Navigate, Outlet, useLocation } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { AuthBackground } from '@/components/shared/auth-background'
import { landingPathFor } from '@/lib/landing'

/**
 * Wraps the signed-out screens. Someone already signed in is sent to the page
 * that belongs to them — which is not the dashboard for a candidate or an
 * alumnus; someone signed in without an organisation is sent to set one up.
 *
 * Lives here rather than in router.tsx so that file only exports routes — a file
 * that mixes components and other exports breaks fast refresh.
 */
export function AuthLayout() {
  const { session, isLoading, profile } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Signed in and set up: go where this person actually belongs.
  //
  // This used to send everybody to /dashboard and let AppLayout bounce the
  // ones who did not belong there. That extra hop mounted the staff
  // dashboard for a candidate, which fired queries they cannot answer and
  // left them watching a spinner on the way through.
  //
  // The pathname check matters: <Navigate> commits a location while
  // rendering, so redirecting to the page we are already on re-commits it
  // and loops. AppLayout learned that the hard way; this is the same guard.
  if (session && profile?.organization_id) {
    const landing = landingPathFor(profile.role)
    return location.pathname === landing ? null : <Navigate to={landing} />
  }

  // If logged in but no org, redirect to onboarding (unless already there)
  if (session && profile && !profile.organization_id && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-white">
      <AuthBackground />
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <Outlet />
      </div>
      <footer className="relative z-10 flex items-center justify-between px-6 py-4 text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} | Augustinnovate Pvt. Ltd.</span>
        <a
          href="https://madewithloveinindia.org"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          Made with <span aria-label="Love" style={{ color: '#f43f5e' }}>&hearts;</span> in India
        </a>
      </footer>
    </div>
  )
}
