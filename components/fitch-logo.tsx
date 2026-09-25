import { cn } from "@/lib/utils"

export function FitchLogo({ className }: { className?: string }) {
    return (
        <div className={cn("inline-flex items-center gap-2", className)}>
            <img src="/logo-icon.png" alt="" width={32} height={32} className="h-6.5 w-6.5 object-contain" />
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