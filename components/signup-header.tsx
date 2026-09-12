"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export function SignupHeader({ step, total }: { step: number; total: number }) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-3 pt-2 pb-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="h-10 w-10 grid place-items-center rounded-[10px] hover:bg-muted text-muted-foreground"
        aria-label="뒤로"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex-1 flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {step} / {total}
      </div>
    </div>
  )
}
