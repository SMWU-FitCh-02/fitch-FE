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
            <clipPath id="fitchMicHead">
              <circle cx="16" cy="9.3" r="5" />
            </clipPath>
          </defs>
          <rect width="32" height="32" rx="9" fill="url(#vfg)" />

          {/* 배경에 살짝 비치는 원래 웨이브바 로고 */}
          <g transform="translate(6.5 9)" opacity="0.18">
            <rect x="0" y="6" width="2.5" height="6" rx="1" fill="white" />
            <rect x="4" y="3" width="2.5" height="12" rx="1" fill="white" />
            <rect x="8" y="0" width="2.5" height="18" rx="1" fill="white" />
            <rect x="12" y="4" width="2.5" height="10" rx="1" fill="white" />
            <rect x="16" y="7" width="2.5" height="4" rx="1" fill="white" />
          </g>

          {/* 노래방 핸드마이크: 대각선으로 기울인 원형 메쉬 헤드 + 칼라 링 + 완만하게 좁아지는 몸통 */}
          <g transform="rotate(-18 16 16)">
            <path
                d="M14 15.7
               L18 15.7
               L17.7 25.5
               C17.65 27.2 16.95 28 16 28
               C15.05 28 14.35 27.2 14.3 25.5
               Z"
                fill="white"
            />
            <rect x="14" y="15.7" width="0.9" height="8.3" fill="url(#vfg)" opacity="0.12" />
            <rect x="14.5" y="18.3" width="1.2" height="1.8" rx="0.35" fill="url(#vfg)" opacity="0.4" />
            <path
                d="M14.35 25.6 C15 25.85 17 25.85 17.65 25.6"
                stroke="url(#vfg)"
                strokeWidth="0.35"
                opacity="0.3"
                fill="none"
            />

            <rect x="13.2" y="14.1" width="5.6" height="1.9" rx="0.5" fill="#eef0f8" />
            <rect x="13.2" y="14.1" width="5.6" height="0.5" fill="white" opacity="0.7" />

            <circle cx="16" cy="9.3" r="5" fill="white" />
            <g clipPath="url(#fitchMicHead)" stroke="url(#vfg)" strokeWidth="0.32" opacity="0.3">
              <line x1="9.1" y1="4.2" x2="17" y2="16.4" />
              <line x1="11" y1="2.5" x2="19.5" y2="14.8" />
              <line x1="13.2" y1="1.5" x2="21.7" y2="13.3" />
              <line x1="15.5" y1="1.2" x2="23.4" y2="11.7" />
              <line x1="17.8" y1="1.5" x2="24.6" y2="9.6" />
              <line x1="22.9" y1="4.2" x2="15" y2="16.4" />
              <line x1="21" y1="2.5" x2="12.5" y2="14.8" />
              <line x1="18.8" y1="1.5" x2="10.3" y2="13.3" />
              <line x1="16.5" y1="1.2" x2="8.6" y2="11.7" />
              <line x1="14.2" y1="1.5" x2="7.4" y2="9.6" />
            </g>
            <circle cx="16" cy="9.3" r="5" fill="none" stroke="url(#vfg)" strokeWidth="0.45" opacity="0.22" />
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