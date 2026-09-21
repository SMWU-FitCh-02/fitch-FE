"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Music2, BookmarkCheck, TrendingUp, User } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
    { href: "/library", label: "보관함", icon: BookmarkCheck },
    { href: "/recommendations", label: "추천곡", icon: Music2 },
    { href: "/home", label: "홈", icon: Home, center: true },
    { href: "/chart", label: "인기차트", icon: TrendingUp },
    { href: "/mypage", label: "마이", icon: User },
]

// 인스타그램 하단바처럼: 아래로 스크롤하면 바가 살짝 작아지고,
// 위로 스크롤할 때만 원래 크기로 돌아온다. 가만히 있을 땐 작아진 상태 그대로 유지.
function useShrinkOnScroll() {
    const [shrunk, setShrunk] = React.useState(false)
    const lastY = React.useRef(0)

    React.useEffect(() => {
        lastY.current = window.scrollY

        function handleScroll() {
            const y = window.scrollY
            const delta = y - lastY.current

            if (y < 24) {
                setShrunk(false) // 맨 위 근처에서는 항상 원래 크기
            } else if (delta > 4) {
                setShrunk(true) // 아래로 스크롤 중
            } else if (delta < -4) {
                setShrunk(false) // 위로 스크롤 중
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
    const home = items.find((it) => it.center)!
    const homeActive = pathname === home.href || pathname.startsWith(home.href + "/")
    const HomeIcon = home.icon
    const shrunk = useShrinkOnScroll()

    return (
        <nav className="fixed inset-x-0 bottom-0 z-30 px-[8px] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2">            <div
                className={cn(
                    "relative mx-auto max-w-md rounded-[35px] bg-surface-elevated/90 backdrop-blur border border-border/60 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out origin-bottom",
                    shrunk ? "scale-85" : "scale-100"
                )}
            >
                <ul className="grid grid-cols-5 items-end">
                    {items.map((it) => {
                        const active = pathname === it.href || pathname.startsWith(it.href + "/")
                        const Icon = it.icon

                        if (it.center) {
                            // 바 높이 계산에서 제외되는 투명 스페이서 (탭 클릭 영역/폭만 유지)
                            return (
                                <li key={it.href}>
                                    <Link
                                        href={it.href}
                                        aria-label={it.label}
                                        className="flex flex-col items-center justify-center gap-1 py-2.5"
                                    >
                                        <span className="h-5 w-5" />
                                        <span className="text-[10px] opacity-0">{it.label}</span>
                                    </Link>
                                </li>
                            )
                        }

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

                {/* 홈 버튼 — 그리드 밖, div 기준 absolute라 바 높이와 무관 */}
                <Link
                    href={home.href}
                    aria-label={home.label}
                    className="absolute left-1/2 -translate-x-1/2 -top-2.5"
                >
                    <span
                        className={cn(
                            "h-[60px] w-[60px] rounded-full grid place-items-center ring-4 ring-surface-elevated shadow-[0_6px_16px_-3px_rgba(0,0,0,0.45)] transition-colors",
                            homeActive
                                ? "bg-primary text-white"
                                : "bg-gradient-to-br from-primary to-brand text-white"
                        )}
                    >
                        <HomeIcon className="h-7 w-7" strokeWidth={2.5} />
                    </span>
                </Link>
            </div>
        </nav>
    )
}