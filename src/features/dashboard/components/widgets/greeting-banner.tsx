import { useAuth } from '@/features/auth/hooks/use-auth'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDateString(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function GreetingBanner() {
  const { profile } = useAuth()
  const firstName = profile?.first_name || 'there'

  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg">
      <h1 className="text-2xl font-bold">
        {getGreeting()}, {firstName}!
      </h1>
      <p className="mt-1 text-sm text-white/80">{getDateString()}</p>
    </div>
  )
}
