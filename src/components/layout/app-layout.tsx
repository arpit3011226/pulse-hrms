import { Outlet, Navigate } from '@tanstack/react-router'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export function AppLayout() {
  const { session, isLoading, profile } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  // If user has no organization, redirect to onboarding
  if (profile && !profile.organization_id) {
    return <Navigate to="/onboarding" />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="relative">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="relative flex-1 overflow-auto bg-muted/30 p-6">
          <div className="pointer-events-none fixed bottom-0 right-0 -z-0 h-[70vh] w-[60vw]" aria-hidden="true">
            <svg
              viewBox="0 0 800 600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
              preserveAspectRatio="xMaxYMax slice"
            >
              <defs>
                <linearGradient id="app-wave1" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#5B9BFF" stopOpacity="0.08" />
                  <stop offset="40%" stopColor="#7B4CFF" stopOpacity="0.07" />
                  <stop offset="70%" stopColor="#C77DFF" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#FF7C2D" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="app-wave2" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="#3B8BFF" stopOpacity="0.06" />
                  <stop offset="50%" stopColor="#9B7AFF" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#FF4F8B" stopOpacity="0.04" />
                </linearGradient>
                <linearGradient id="app-wave3" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FF7C2D" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#C77DFF" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <path
                d="M0 380 C120 320 250 300 400 310 C550 320 620 360 800 330 L800 600 L0 600 Z"
                fill="url(#app-wave1)"
              />
              <path
                d="M0 430 C150 380 300 370 450 390 C600 410 700 370 800 380 L800 600 L0 600 Z"
                fill="url(#app-wave2)"
              />
              <path
                d="M400 0 C550 20 650 60 750 90 C800 110 800 80 800 100 L800 0 Z"
                fill="url(#app-wave3)"
              />
              <circle cx="580" cy="240" r="8" fill="#FF4F8B" opacity="0.08" />
              <circle cx="640" cy="210" r="10" fill="#FF7C2D" opacity="0.07" />
              <circle cx="530" cy="220" r="5" fill="#7B4CFF" opacity="0.09" />
              <circle cx="700" cy="250" r="6" fill="#FF7C2D" opacity="0.06" />
              <circle cx="500" cy="260" r="4" fill="#C77DFF" opacity="0.07" />
              <circle cx="660" cy="190" r="4.5" fill="#7B4CFF" opacity="0.06" />
            </svg>
          </div>
          <div className="relative z-10">
            <Outlet />
          </div>
          <footer className="relative z-10 mt-8 flex items-center justify-between border-t border-border/40 px-2 py-4 text-xs text-muted-foreground">
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
        </main>
      </div>
    </div>
  )
}
