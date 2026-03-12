import { useEffect } from 'react'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/auth-provider'
import { useUIStore } from '@/store/ui-store'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
})

function ThemeSync() {
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ThemeSync />
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
