export function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="wave1" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#5B9BFF" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#7B4CFF" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#C77DFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF7C2D" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="wave2" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#3B8BFF" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#9B7AFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FF4F8B" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="wave3" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF7C2D" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#FF4F8B" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#C77DFF" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="glow1" cx="70%" cy="30%" r="40%">
            <stop offset="0%" stopColor="#FF7C2D" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FF7C2D" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glow2" cx="20%" cy="70%" r="35%">
            <stop offset="0%" stopColor="#5B9BFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#5B9BFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft background glows */}
        <rect width="1440" height="900" fill="url(#glow1)" />
        <rect width="1440" height="900" fill="url(#glow2)" />

        {/* Main wave — bottom flowing left to right */}
        <path
          d="M-100 650 C100 580 300 520 500 500 C700 480 800 560 1000 520 C1200 480 1300 420 1540 460 L1540 900 L-100 900 Z"
          fill="url(#wave1)"
        />

        {/* Second wave — mid, offset */}
        <path
          d="M-100 700 C150 640 350 600 550 620 C750 640 850 580 1050 600 C1250 620 1350 560 1540 580 L1540 900 L-100 900 Z"
          fill="url(#wave2)"
        />

        {/* Top accent wave — upper right area */}
        <path
          d="M600 0 C800 30 900 80 1050 120 C1200 160 1300 100 1440 130 L1440 0 Z"
          fill="url(#wave3)"
        />

        {/* Sparkle dots */}
        <circle cx="900" cy="320" r="6" fill="#FF4F8B" opacity="0.35" />
        <circle cx="960" cy="280" r="8" fill="#FF7C2D" opacity="0.3" />
        <circle cx="850" cy="290" r="4" fill="#7B4CFF" opacity="0.4" />
        <circle cx="1020" cy="310" r="5" fill="#FF7C2D" opacity="0.25" />
        <circle cx="820" cy="340" r="3" fill="#FF4F8B" opacity="0.3" />
        <circle cx="980" cy="250" r="3.5" fill="#7B4CFF" opacity="0.3" />

        {/* Subtle sparkle stars */}
        <circle cx="300" cy="200" r="1.5" fill="white" opacity="0.3" />
        <circle cx="1100" cy="500" r="1.5" fill="white" opacity="0.25" />
        <circle cx="200" cy="600" r="1" fill="white" opacity="0.2" />
        <circle cx="1200" cy="300" r="1.5" fill="white" opacity="0.2" />
        <circle cx="700" cy="150" r="1" fill="white" opacity="0.15" />
      </svg>
    </div>
  )
}
