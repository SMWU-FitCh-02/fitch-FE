"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, Mic, TrendingUp } from "lucide-react"
import { FitchLogo, WaveBars } from "@/components/fitch-logo"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { SONGS } from "@/lib/songs"
import { noteToKorean } from "@/lib/songs"
import { SongCard } from "@/components/song-card"
import { type ChartEntry } from "@/lib/itunes"
import { fetchTjTop100 } from "@/lib/tjchart"
import { ChartSongRow } from "@/components/chart-song-row"
import { api } from "@/lib/api"

export default function HomePage() {
    const { profile, setProfile } = useStore()
    const greeting = greetByHour()
    const hasRange = !!profile.range

    const [popular, setPopular] = React.useState<ChartEntry[]>([])
    const [popularLoading, setPopularLoading] = React.useState(true)

    // keep the greeting/photo in sync with the backend (e.g. after a nickname change)
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
            .catch(() => {})
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile.userId])

    // TJ미디어 노래방 인기차트 (TOP100 중 상위 5곡 미리보기)
    React.useEffect(() => {
        let cancelled = false
        fetchTjTop100(5)
            .then((data) => {
                if (!cancelled) setPopular(data)
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setPopularLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    const preferredArtistSongs = React.useMemo(() => {
        if (!profile.preferredArtists.length) return []
        return SONGS.filter((s) => profile.preferredArtists.includes(s.artist)).slice(0, 8)
    }, [profile.preferredArtists])

    return (
        <main className="px-4 pt-4 pb-6 space-y-6">
            <header className="flex items-center justify-between px-1">
                <FitchLogo />
                <Link
                    href="/mypage"
                    className="h-10 w-10 grid place-items-center rounded-full bg-surface/70 border border-border text-lg overflow-hidden"
                    aria-label="마이페이지"
                >
                    {profile.profileImage ? (
                        <img src={profile.profileImage} alt="프로필 사진" className="h-full w-full object-cover" />
                    ) : (
                        profile.avatar || "🎤"
                    )}
                </Link>
            </header>

            <section className="px-1">
                <p className="text-xs text-muted-foreground">{greeting}</p>
                <h1 className="text-2xl font-extrabold leading-tight">
                    {profile.name || "FitCh 유저"}님,<br />
                    오늘은 어떤 곡을 부를까요?
                </h1>
            </section>

            {/* Range card */}
            {hasRange ? (
                <Link
                    href="/mypage/history"
                    className="block rounded-[14px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-4"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[11px] text-primary font-bold">내 음역대</div>
                            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-lg font-extrabold">{noteToKorean(profile.range!.lowestNote)}</span>
                                <span className="text-muted-foreground text-sm">—</span>
                                <span className="text-lg font-extrabold text-brand">{noteToKorean(profile.range!.highestNote)}</span>
                            </div>
                            {/* <div className="mt-1 text-[11px] text-muted-foreground">
                                편한음 | {noteToKorean(profile.range!.comfortableHigh)}
                            </div>*/}
                        </div>
                        <WaveBars />
                    </div>
                </Link>
            ) : (
                <Link
                    href="/mypage/range-test"
                    className="block rounded-[14px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-brand grid place-items-center">
                            <Mic className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold">먼저 음역대를 측정해보세요</div>
                            <div className="text-xs text-muted-foreground">3분이면 충분해요</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                </Link>
            )}

            {/* Preferred artist songs */}
            {preferredArtistSongs.length > 0 && (
                <Section
                    title="내가 좋아한 아티스트의 곡"
                    subtitle="가입 시 선택하신 아티스트 기반"
                    href="/mypage/artist-recommendations"
                >
                    <div className="space-y-2">
                        {preferredArtistSongs.slice(0, 3).map((s) => (
                            <SongCard key={s.id} song={s} />
                        ))}
                    </div>
                </Section>
            )}

            {/* Popular chart preview — TJ미디어 노래방 인기차트 기준 */}
            <Section
                title="실시간 인기차트"
                subtitle="TJ미디어 노래방 인기차트 기준"
                icon={<TrendingUp className="h-4 w-4 text-primary" />}
                href="/tjchart"
            >
                {popularLoading ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">차트를 불러오는 중...</div>
                ) : (
                    <div className="space-y-2">
                        {popular.map((entry) => (
                            <ChartSongRow key={entry.id} entry={entry} />
                        ))}
                    </div>
                )}
            </Section>

            <Link
                href="/mypage/range-test"
                className="block rounded-[14px] border border-border/80 p-5 text-center"
            >
                <div className="text-sm font-semibold">다시 측정하기</div>
                <div className="mt-1 text-xs text-muted-foreground">
                    음역대가 달라졌다면 한 번 더 측정해보세요
                </div>
            </Link>
        </main>
    )
}

function Section({
                     title,
                     subtitle,
                     icon,
                     href,
                     children,
                 }: {
    title: string
    subtitle?: string
    icon?: React.ReactNode
    href?: string
    children: React.ReactNode
}) {
    return (
        <section>
            <div className="flex items-end justify-between mb-3 px-1">
                <div>
                    <div className="flex items-center gap-1.5">
                        {icon}
                        <h2 className="text-base font-extrabold">{title}</h2>
                    </div>
                    {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
                </div>
                {href && (
                    <Link
                        href={href}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center"
                    >
                        더보기 <ChevronRight className="h-3 w-3" />
                    </Link>
                )}
            </div>
            {children}
        </section>
    )
}

function greetByHour() {
    const h = new Date().getHours()
    if (h < 5) return "별이 빛나는 새벽이에요 ✨"
    if (h < 12) return "좋은 아침이에요 ☀️"
    if (h < 18) return "오늘 하루도 화이팅 ☕"
    return "오늘 밤은 노래 한 곡 어때요 🎶"
}