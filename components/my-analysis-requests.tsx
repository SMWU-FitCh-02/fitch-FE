"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2, AlertCircle, Mic2 } from "lucide-react"
import { api, buildSongKey } from "@/lib/api"
import { fetchArtwork } from "@/lib/artwork-cache"
import { ChartSongRow, type ChartEntryWithRange } from "@/components/chart-song-row"

type Req = { title: string; artist: string; status: string }
type Range = { minNote?: number; maxNote?: number }

function RequestRow({ req, index, range }: { req: Req; index: number; range?: Range }) {
    const [artworkUrl, setArtworkUrl] = React.useState<string | null>(null)

    React.useEffect(() => {
        let cancelled = false
        fetchArtwork(req.title, req.artist)
            .then((d) => {
                if (!cancelled) setArtworkUrl(d.artworkUrl ?? null)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [req.title, req.artist])

    const entry = {
        id: `req-${buildSongKey(req.title, req.artist)}`,
        rank: index + 1,
        title: req.title,
        artist: req.artist,
        artworkUrl: artworkUrl ?? "",
        minNote: range?.minNote,
        maxNote: range?.maxNote,
    } as unknown as ChartEntryWithRange

    const done = range?.minNote != null && range?.maxNote != null
    return (
        <div>
            <ChartSongRow entry={entry} />
            {!done && (
                <div className="mt-1.5 px-1">
                    {req.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-semibold text-destructive">
              <AlertCircle className="h-3 w-3" /> 분석 실패 · 곡을 열어 다시 요청해보세요
            </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <Loader2 className="h-3 w-3 animate-spin" /> 분석 중이에요
            </span>
                    )}
                </div>
            )}
        </div>
    )
}

export function MyAnalysisRequests() {
    const [items, setItems] = React.useState<Req[]>([])
    const [ranges, setRanges] = React.useState<Record<string, Range>>({})
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        let cancelled = false

        async function load() {
            try {
                const list = await api.getMyAnalysisRequests()
                if (cancelled) return
                setItems(list)
                const map = await api.getVocalRanges(list.map((r) => ({ title: r.title, artist: r.artist })))
                if (!cancelled) setRanges(map as Record<string, Range>)
            } catch {
                // 불러오지 못하면 빈 목록
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        // 분석 중인 곡이 있으면 15초마다 새로고침 (목록 화면을 보고 있어도 완료되면 바뀌게)
        const t = setInterval(load, 15000)
        return () => {
            cancelled = true
            clearInterval(t)
        }
    }, [])

    if (loading) {
        return <div className="text-center text-xs text-muted-foreground py-10">불러오는 중...</div>
    }

    if (items.length === 0) {
        return (
            <div className="mt-2 text-center py-10">
                <div className="mx-auto h-16 w-16 rounded-full bg-surface/60 border border-border grid place-items-center">
                    <Mic2 className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground max-w-xs mx-auto">
                    아직 분석 요청한 곡이 없어요. 내 키 찾기에서 곡을 검색하고 분석을 요청해보세요.
                </p>
                <Link href="/mypage/key-adjustment" className="mt-4 inline-block text-xs font-semibold text-primary">
                    내 키 찾기로 가기
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {items.map((r, i) => (
                <RequestRow key={buildSongKey(r.title, r.artist)} req={r} index={i} range={ranges[buildSongKey(r.title, r.artist)]} />
            ))}
        </div>
    )
}