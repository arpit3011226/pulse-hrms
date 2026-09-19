import { Clock, CalendarDays, Star, FileText, Target, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

export type HubPanel = 'attendance' | 'time-off' | 'reviews' | 'documents' | 'goals' | 'payroll'

interface TileConfig {
  key: HubPanel
  label: string
  icon: React.ElementType
  bg: string
  activeBg: string
  borderColor: string
  iconColor: string
}

const TILES: TileConfig[] = [
  { key: 'attendance', label: 'Attendance', icon: Clock, bg: 'bg-blue-50/70', activeBg: 'bg-blue-100', borderColor: 'border-blue-300', iconColor: 'text-blue-500' },
  { key: 'time-off', label: 'Time Off', icon: CalendarDays, bg: 'bg-emerald-50/70', activeBg: 'bg-emerald-100', borderColor: 'border-emerald-300', iconColor: 'text-emerald-500' },
  { key: 'reviews', label: 'Reviews', icon: Star, bg: 'bg-amber-50/70', activeBg: 'bg-amber-100', borderColor: 'border-amber-300', iconColor: 'text-amber-500' },
  { key: 'documents', label: 'Documents', icon: FileText, bg: 'bg-violet-50/70', activeBg: 'bg-violet-100', borderColor: 'border-violet-300', iconColor: 'text-violet-500' },
  { key: 'goals', label: 'Goals', icon: Target, bg: 'bg-rose-50/70', activeBg: 'bg-rose-100', borderColor: 'border-rose-300', iconColor: 'text-rose-500' },
  { key: 'payroll', label: 'Payroll', icon: Wallet, bg: 'bg-orange-50/70', activeBg: 'bg-orange-100', borderColor: 'border-orange-300', iconColor: 'text-orange-500' },
]

interface HubQuickTilesProps {
  active: HubPanel
  onChange: (panel: HubPanel) => void
  visibleTiles?: HubPanel[]
}

export function HubQuickTiles({ active, onChange, visibleTiles }: HubQuickTilesProps) {
  const tiles = visibleTiles ? TILES.filter((t) => visibleTiles.includes(t.key)) : TILES

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tiles.map((tile) => {
        const isActive = active === tile.key
        const Icon = tile.icon
        return (
          <button
            key={tile.key}
            onClick={() => onChange(tile.key)}
            className={cn(
              'flex min-w-[100px] flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium transition-all',
              isActive
                ? cn(tile.activeBg, tile.borderColor, 'shadow-sm')
                : cn(tile.bg, 'border-transparent hover:border-border')
            )}
          >
            <Icon className={cn('h-5 w-5', tile.iconColor)} />
            <span className={isActive ? 'text-foreground' : 'text-muted-foreground'}>
              {tile.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
