import { cn } from '@/lib/utils'

interface PulseLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function PulseLogo({ className, size = 'md', showText = true }: PulseLogoProps) {
  const sizes = {
    sm: { icon: 'h-7 w-7', text: 'text-base' },
    md: { icon: 'h-9 w-9', text: 'text-lg' },
    lg: { icon: 'h-12 w-12', text: 'text-2xl' },
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={sizes[size].icon}
      >
        <defs>
          <linearGradient id="pulse-wave" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B8BFF" />
            <stop offset="35%" stopColor="#7B4CFF" />
            <stop offset="65%" stopColor="#FF4F8B" />
            <stop offset="100%" stopColor="#FF7C2D" />
          </linearGradient>
          <linearGradient id="pulse-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Main wave/leaf shape */}
        <path
          d="M8 72 C8 72 20 48 42 42 C58 38 62 50 78 44 C94 38 102 24 108 20 C108 20 104 56 82 68 C66 76 58 62 42 68 C26 74 16 82 8 72Z"
          fill="url(#pulse-wave)"
        />
        {/* White highlight curve */}
        <path
          d="M14 68 C14 68 26 50 44 46 C56 43 60 52 72 48"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />
        {/* Floating bubbles */}
        <circle cx="72" cy="22" r="5" fill="#FF7C2D" />
        <circle cx="82" cy="14" r="4" fill="#FF7C2D" />
        <circle cx="64" cy="16" r="3.5" fill="#FF4F8B" />
        <circle cx="58" cy="24" r="2.5" fill="#FF4F8B" opacity="0.8" />
        <circle cx="54" cy="16" r="2" fill="#7B4CFF" />
        <circle cx="48" cy="22" r="1.5" fill="#7B4CFF" opacity="0.7" />
        <circle cx="90" cy="10" r="3" fill="#FF7C2D" opacity="0.7" />
      </svg>
      {showText && (
        <span className={cn('font-semibold tracking-tight text-foreground', sizes[size].text)}>
          Pulse
        </span>
      )}
    </div>
  )
}

export function PulseLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8', className)}
    >
      <defs>
        <linearGradient id="pulse-wave-icon" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B8BFF" />
          <stop offset="35%" stopColor="#7B4CFF" />
          <stop offset="65%" stopColor="#FF4F8B" />
          <stop offset="100%" stopColor="#FF7C2D" />
        </linearGradient>
      </defs>
      <path
        d="M8 72 C8 72 20 48 42 42 C58 38 62 50 78 44 C94 38 102 24 108 20 C108 20 104 56 82 68 C66 76 58 62 42 68 C26 74 16 82 8 72Z"
        fill="url(#pulse-wave-icon)"
      />
      <path
        d="M14 68 C14 68 26 50 44 46 C56 43 60 52 72 48"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <circle cx="72" cy="22" r="5" fill="#FF7C2D" />
      <circle cx="82" cy="14" r="4" fill="#FF7C2D" />
      <circle cx="64" cy="16" r="3.5" fill="#FF4F8B" />
      <circle cx="58" cy="24" r="2.5" fill="#FF4F8B" opacity="0.8" />
      <circle cx="54" cy="16" r="2" fill="#7B4CFF" />
      <circle cx="48" cy="22" r="1.5" fill="#7B4CFF" opacity="0.7" />
      <circle cx="90" cy="10" r="3" fill="#FF7C2D" opacity="0.7" />
    </svg>
  )
}
