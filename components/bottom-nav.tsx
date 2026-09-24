"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Music2, BookmarkCheck, TrendingUp, User } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
    { href: "/library", label: "보관함", icon: BookmarkCheck },
    { href: "/recommendations", label: "추천곡", icon: Music2 },
    { href: "/home", label: "홈", icon: Home },
    { href: "/chart", label: "인기차트", icon: TrendingUp },
    { href: "/mypage", label: "마이", icon: User },
]

function useShrinkOnScroll() {
    const [shrunk, setShrunk] = React.useState(false)
    const lastY = React.useRef(0)

    React.useEffect(() => {
        lastY.current = window.scrollY

        function handleScroll() {
            const y = window.scrollY
            const delta = y - lastY.current

            if (y < 24) {
                setShrunk(false)
            } else if (delta > 4) {
                setShrunk(true)
            } else if (delta < -4) {
                setShrunk(false)
            }

            lastY.current = y
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return shrunk
}

export function BottomNav() {
    const pathname = usePathname() ?? ""
    const shrunk = useShrinkOnScroll()

    const activeIndex = items.findIndex(
        (it) => pathname === it.href || pathname.startsWith(it.href + "/")
    )

    return (
        <nav className="fixed inset-x-0 bottom-0 z-30 px-[8px] pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-2">
            <div
                className={cn(
                    "relative mx-auto max-w-md rounded-full bg-surface-elevated/50 backdrop-blur-xl border border-white/10 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out origin-bottom p-1.5",
                    shrunk ? "scale-75" : "scale-87"
                )}
            >
                <ul className="relative grid grid-cols-5">
                    {activeIndex >= 0 && (
                        <li
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-1/5 pointer-events-none transition-transform duration-300 ease-out"
                            style={{ transform: `translateX(${activeIndex * 100}%)` }}
                        >
                            <div className="absolute inset-0.5 rounded-full bg-foreground/10" />
                        </li>
                    )}

                    {items.map((it) => {
                        const active = pathname === it.href || pathname.startsWith(it.href + "/")
                        const Icon = it.icon

                        return (
                            <li key={it.href} className="relative flex justify-center">
                                <Link
                                    href={it.href}
                                    aria-label={it.label}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-1 w-full px-2 py-2 rounded-full text-[10px] font-semibold transition-colors",
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