"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  return (
    <header className={cn("flex items-center gap-2 pt-2 pb-3 px-1", className)}>
      <button
        type="button"
        onClick={() => router.back()}
        className="h-10 w-10 grid place-items-center rounded-[10px] hover:bg-muted text-muted-foreground"
        aria-label="뒤로"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold truncate">{title}</div>
        {subtitle && (
          <div className="text-[11px] text-muted-foreground truncate">{subtitle}</div>
        )}
      </div>
      {right}
    </header>
  )
}
