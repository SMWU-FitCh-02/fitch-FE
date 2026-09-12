import { cn } from "@/lib/utils"

export function FitchLogo({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <defs>
          <linearGradient id="vfg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7b8cff" />
            <stop offset="100%" stopColor="#9d8cff" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#vfg)" />
        <g transform="translate(7 8)">
          <rect x="0" y="6" width="2.5" height="6" rx="1" fill="white" />
          <rect x="4" y="3" width="2.5" height="12" rx="1" fill="white" />
          <rect x="8" y="0" width="2.5" height="18" rx="1" fill="white" />
          <rect x="12" y="4" width="2.5" height="10" rx="1" fill="white" />
          <rect x="16" y="7" width="2.5" height="4" rx="1" fill="white" />
        </g>
      </svg>
      <span className="text-lg font-extrabold tracking-tight">FitCh</span>
    </div>
  )
}

export function WaveBars({ active = false }: { active?: boolean }) {
  return (
    <div className="flex items-end gap-1 h-12">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="wave-bar w-1.5 bg-gradient-to-t from-primary to-brand rounded-full"
          style={{
            height: "100%",
            animationDelay: `${i * 0.12}s`,
            animationPlayState: active ? "running" : "paused",
            opacity: active ? 1 : 0.45,
          }}
        />
      ))}
    </div>
  )
}
