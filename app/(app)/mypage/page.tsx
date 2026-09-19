"use client"

import Link from "next/link"
import {useRouter} from "next/navigation"
import {
    Music2,
    KeyRound,
    LineChart,
    Mic,
    ChevronRight,
    LogOut,
    Pencil,
    ShieldCheck,
} from "lucide-react"
import {useStore} from "@/lib/store"
import {Button} from "@/components/ui/button"
import {Separator} from "@/components/ui/separator"
import {clearTokens, api} from "@/lib/api"
import * as React from "react"
import { noteToKorean } from "@/lib/songs"

export default function MyPage() {
    const router = useRouter()
    const {profile, setProfile} = useStore()
    const hasRange = !!profile.range

    // keep the displayed name/photo in sync with the backend (e.g. after a nickname change)
    React.useEffect(() => {
        if (!profile.userId) return
        let cancelled = false
        api
            .getUser(profile.userId)
            .then((u) => {
                if (cancelled) return
                const displayName = u.nickname || u.name
                setProfile((p) => ({
                    ...p,
                    name: displayName && displayName !== p.name ? displayName : p.name,
                    profileImage: u.profileImage ?? null,
                }))
            })
            .catch(() => {
            })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile.userId])

    function logout() {
        clearTokens()
        setProfile((p) => ({...p, loggedIn: false, userId: undefined}))
        router.replace("/login")
    }

    const items = [
        {
            href: "/mypage/range-recommendations",
            icon: Music2,
            title: "음역대 기반 노래 추천",
            desc: "내 음역대에 맞는 곡 list",
            requiresRange: true,
        },
        {
            href: "/mypage/key-adjustment",
            icon: KeyRound,
            title: "키 조정",
            desc: "부르고 싶은 곡의 추천 키 제공",
            requiresRange: true,
        },
        {
            href: "/mypage/history",
            icon: LineChart,
            title: "보컬 히스토리",
            desc: "내 음역대 변화 기록",
            requiresRange: true,
        },
        {
            href: "/mypage/range-test",
            icon: Mic,
            title: "검사하기",
            desc: "다시 음역대 테스트",
            requiresRange: false,
        },
    ] as const

    return (
        <main className="px-4 pt-4 pb-6">
            {/* Profile */}
            <section className="rounded-[14px] bg-card border border-border/60 p-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/mypage/profile"
                        className="relative h-16 w-16 rounded-full border-2 border-border"
                        aria-label="프로필 사진 변경"
                    >
                        <div
                            className="h-full w-full rounded-full bg-gradient-to-br from-primary/60 to-brand/60 grid place-items-center text-3xl overflow-hidden">
                            {profile.profileImage ? (
                                <img src={profile.profileImage} alt="프로필 사진" className="h-full w-full object-cover"/>
                            ) : (
                                profile.avatar || "🎤"
                            )}
                        </div>
                        <span
                            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary grid place-items-center">
    <Pencil className="h-3 w-3 text-primary-foreground"/>
  </span>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="text-base font-extrabold truncate">{profile.name || "FitCh 유저"}</div>
                        <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                        {hasRange && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/15">
                                <span className="text-muted-foreground font-medium">내 음역대</span>
                                <span className="text-primary font-extrabold">
      {noteToKorean(profile.range!.lowestNote)} – {noteToKorean(profile.range!.highestNote)}
    </span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <h2 className="mt-6 mb-2 px-1 text-sm font-bold text-muted-foreground uppercase tracking-wide">
                음역대 기능
            </h2>
            <div className="rounded-[14px] bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                {items.map((it) => {
                    const Icon = it.icon
                    const lockedHint = it.requiresRange && !hasRange
                    return (
                        <Link
                            key={it.href}
                            href={lockedHint ? "/mypage/range-test" : it.href}
                            className="flex items-center gap-3 p-4 hover:bg-surface/50 transition-colors"
                        >
                            <div
                                className="h-10 w-10 rounded-[10px] bg-primary/15 text-primary grid place-items-center">
                                <Icon className="h-5 w-5"/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold">{it.title}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {lockedHint ? "먼저 음역대 측정이 필요해요" : it.desc}
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                        </Link>
                    )
                })}
            </div>

            <h2 className="mt-6 mb-2 px-1 text-sm font-bold text-muted-foreground uppercase tracking-wide">
                설정
            </h2>
            <div className="rounded-[14px] bg-card border border-border/60 divide-y divide-border/60 overflow-hidden">
                <Link href="/mypage/privacy" className="flex items-center gap-3 p-4 hover:bg-surface/50">
                    <div className="h-10 w-10 rounded-[10px] bg-accent text-foreground grid place-items-center">
                        <ShieldCheck className="h-5 w-5"/>
                    </div>
                    <div className="flex-1 text-sm font-semibold">개인정보 / 보안</div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground"/>
                </Link>
            </div>

            <Separator className="my-6"/>
            <Button variant="outline" size="lg" className="w-full" onClick={logout}>
                <LogOut className="h-4 w-4"/> 로그아웃
            </Button>
            <div className="mt-4 text-center text-[11px] text-muted-foreground">
                FitCh · v0.2 prototype
            </div>
        </main>
    )
}