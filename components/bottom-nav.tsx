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

    // 탭이 바뀌는 순간엔 글래스 효과가 반짝, 멈추면 수수한 회색 필로 가라앉음
    const [isMoving, setIsMoving] = React.useState(false)
    const prevIndexRef = React.useRef(activeIndex)

    React.useEffect(() => {
        if (prevIndexRef.current !== activeIndex && activeIndex >= 0) {
            setIsMoving(true)
            const t = setTimeout(() => setIsMoving(false), 320)
            prevIndexRef.current = activeIndex
            return () => clearTimeout(t)
        }
        prevIndexRef.current = activeIndex
    }, [activeIndex])

    return (
        <nav className="fixed inset-x-0 bottom-0 z-30 px-[8px] pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
            <div
                className={cn(
                    "relative mx-auto max-w-md rounded-full bg-surface-elevated/50 backdrop-blur-xl border border-white/10 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out origin-bottom p-1.5",
                    shrunk ? "scale-95" : "scale-100"
                )}
            >
                <ul className="relative grid grid-cols-5">
                    {activeIndex >= 0 && (
                        <li
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-1/5 pointer-events-none transition-transform duration-300 ease-out"
                            style={{
                                transform: `translateX(${activeIndex * 100}%) scale(${isMoving ? 1.1 : 1})`,
                            }}
                        >
                            {/* 평소: 은은한 회색 필 */}
                            <div
                                className="absolute inset-0.5 rounded-full bg-foreground/10 transition-opacity duration-300"
                                style={{ opacity: isMoving ? 0 : 1 }}
                            />
                            {/* 이동 중: 반짝이는 글래스 필 */}
                            <div
                                className="absolute inset-0.5 rounded-full transition-opacity duration-300"
                                style={{
                                    opacity: isMoving ? 1 : 0,
                                    backdropFilter: "blur(10px)",
                                    background:
                                        "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 100%)",
                                    boxShadow:
                                        "inset 0 1px 1.5px rgba(255,255,255,0.7), inset 0 -1px 3px rgba(0,0,0,0.2), 0 4px 14px rgba(0,0,0,0.18)",
                                    border: "1px solid rgba(255,255,255,0.55)",
                                }}
                            />
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