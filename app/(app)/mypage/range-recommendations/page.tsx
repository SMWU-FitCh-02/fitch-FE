"use client"

import * as React from "react"
import Link from "next/link"
import { Mic } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { useStore } from "@/lib/store"
import { api, type SongResponse } from "@/lib/api"
import { BackendSongCard } from "@/components/backend-song-card"
import { Button } from "@/components/ui/button"
import { noteToKorean } from "@/lib/songs"

export default function RangeRecommendationsPage() {
    const { profile } = useStore()
    const hasRange = !!profile.range
    const [songs, setSongs] = React.useState<SongResponse[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")

    React.useEffect(() => {
        if (!hasRange || !profile.userId) return
        let cancelled = false
        setLoading(true)
        api
            .recommend(profile.userId)
            .then((rec) => {
                if (!cancelled) setSongs(rec.recommendedSongs ?? [])
            })
            .catch(() => {
                if (!cancelled) setError("추천곡을 불러오지 못했어요.")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [hasRange, profile.userId])

    if (!hasRange) {
        return (
            <main className="px-4 pb-6">
                <PageHeader title="음역대 기반 노래 추천" />
                <EmptyRange />
            </main>
        )
    }

    return (
        <main className="px-4 pb-6">
            <PageHeader
                title="음역대 기반 노래 추천"
                subtitle={`${noteToKorean(profile.range!.lowestNote)} – ${noteToKorean(profile.range!.highestNote)}`}
            />

            <div className="rounded-[14px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-4 mb-5">
                <div className="text-[11px] text-primary font-bold">맞춤 추천</div>
                <div className="mt-1 text-lg font-extrabold leading-tight">
                    {loading ? "불러오는 중..." : `내 음역대 기준 ${songs.length}곡`}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                    비슷한 음역대 곡들이에요. 너무 높지 않게 부르고 싶을 때 추천!
                </div>
            </div>

            {loading && <div className="text-center text-xs text-muted-foreground py-8">불러오는 중...</div>}
            {!loading && error && <div className="text-center text-xs text-destructive py-8">{error}</div>}

            {!loading && !error && (
                <div className="space-y-2">
                    {songs.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground py-8">추천할 곡이 없어요.</div>
                    ) : (
                        songs.map((s) => <BackendSongCard key={s.songId} song={s} />)
                    )}
                </div>
            )}
        </main>
    )
}

function EmptyRange() {
    return (
        <div className="mt-10 text-center">
            <div className="mx-auto h-20 w-20 rounded-full bg-surface/60 border border-border grid place-items-center">
                <Mic className="h-9 w-9 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-bold">먼저 음역대 측정이 필요해요</h2>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                3분이면 끝나요. 음역대 데이터가 있어야 맞춤 추천이 가능해요.
            </p>
            <Button variant="brand" size="lg" className="mt-6 w-full" asChild>
                <Link href="/mypage/range-test">음역대 테스트 시작</Link>
            </Button>
        </div>
    )
}