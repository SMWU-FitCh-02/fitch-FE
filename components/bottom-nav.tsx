"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Music2, BookmarkCheck, TrendingUp, User } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/recommendations", label: "추천곡", icon: Music2 },
  { href: "/library", label: "보관함", icon: BookmarkCheck },
  { href: "/chart", label: "인기차트", icon: TrendingUp },
  { href: "/mypage", label: "마이", icon: User },
]

export function BottomNav() {
  const pathname = usePathname() ?? ""
  return (
      <nav className="sticky bottom-0 left-0 right-0 z-30 mt-auto px-4 pb-4 pt-2">
        <div className="mx-auto max-w-md rounded-[28px] bg-surface-elevated/90 backdrop-blur border border-border/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5)]">
          <ul className="grid grid-cols-5">
            {items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/")
              const Icon = it.icon
              return (
                  <li key={it.href}>
                    <Link
                        href={it.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                            active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                      {it.label}
                    </Link>
                  </li>
              )
            })}
          </ul>
        </div>
      </nav>
  )
}