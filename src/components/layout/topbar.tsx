import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getInitials } from '@/lib/utils'
import { NotificationPopover } from '@/components/layout/notification-popover'
import { GlobalSearch } from '@/components/layout/global-search'
import { Link } from '@tanstack/react-router'

export function Topbar() {
  const { profile, signOut } = useAuth()

  const firstName = profile?.first_name || ''
  const lastName = profile?.last_name || ''
  const email = profile?.email || ''

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* F45 — global search (was a dead input that did nothing) */}
      <div className="flex items-center gap-4">
        <div className="w-72">
          <GlobalSearch />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationPopover />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(firstName, lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{firstName} {lastName}</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role?.replace('_', ' ')}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">{firstName} {lastName}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
