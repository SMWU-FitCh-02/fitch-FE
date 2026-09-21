"use client"

import { Heart } from "lucide-react"
import type { ChartEntry } from "@/lib/itunes"
import { useStore } from "@/lib/store"
import { noteToMidi } from "@/lib/songs"

export type ChartEntryWithRange = ChartEntry & {
    minNote?: number
    maxNote?: number
}

// 크롤링 곡의 minNote/maxNote(MIDI)와 내 음역대를 비교해 1~3점 난이도 산출
function useDifficultyStars(entry: ChartEntryWithRange): 1 | 2 | 3 | null {
    const { profile } = useStore()
    if (entry.minNote == null || entry.maxNote == null || !profile.range) return null
    const userMin = noteToMidi(profile.range.lowestNote)
    const userMax = noteToMidi(profile.range.highestNote)
    const overHigh = Math.max(0, entry.maxNote - userMax)
    const overLow = Math.max(0, userMin - entry.minNote)
    const totalOver = overHigh + overLow
    if (totalOver <= 0) return 1
    if (totalOver <= 3) return 2
    return 3
}

// 앨범 커버 위에 올라가는 작은 별 뱃지 (어느 배경에서도 잘 보이도록 어두운 배경 + 색 텍스트)
function DifficultyBadge({ stars, className = "" }: { stars: 1 | 2 | 3; className?: string }) {
    const color = stars === 1 ? "text-emerald-400" : stars === 2 ? "text-amber-400" : "text-rose-400"
    return (
        <div
            className={`inline-flex items-center rounded-full bg-black/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold leading-none ${color} ${className}`}
        >
            {"★".repeat(stars)}
            <span className="text-white/25">{"☆".repeat(3 - stars)}</span>
        </div>
    )
}

export function ChartSongRow({ entry }: { entry: ChartEntryWithRange }) {
    const { chartLikedIds, toggleChartLikeRemote } = useStore()
    const isSaved = chartLikedIds.has(entry.id)
    const stars = useDifficultyStars(entry)

    return (
        <div className="group flex items-center gap-3 rounded-[12px] bg-card/70 border border-border/60 p-2.5 transition-colors hover:bg-card">
            <div className="w-7 text-center text-base font-bold text-muted-foreground">
                {entry.rank}
            </div>
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
                {entry.artworkUrl ? (
                    <img
                        src={entry.artworkUrl}
                        alt={entry.title}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="h-full w-full bg-muted" />
                )}
                {stars && <DifficultyBadge stars={stars} className="absolute bottom-1 left-1" />}
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{entry.title}</div>
                <div className="truncate text-xs text-muted-foreground">{entry.artist}</div>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    toggleChartLikeRemote({
                        externalId: entry.id,
                        title: entry.title,
                        artist: entry.artist,
                        artworkUrl: entry.artworkUrl || null,
                    })
                }}
                className="shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted"
                aria-label={isSaved ? "좋아요 취소" : "좋아요"}
            >
                <Heart className={`h-4 w-4 ${isSaved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
        </div>
    )
}

export function ChartSongTile({ entry }: { entry: ChartEntryWithRange }) {
    const stars = useDifficultyStars(entry)
    return (
        <div className="w-32 shrink-0">
            <div className="relative w-32 h-32 overflow-hidden rounded-[12px] border border-border/40">
                {entry.artworkUrl ? (
                    <img
                        src={entry.artworkUrl}
                        alt={entry.title}
                        className="object-cover h-full w-full"
                    />
                ) : (
                    <div className="h-full w-full bg-muted" />
                )}
                {stars && <DifficultyBadge stars={stars} className="absolute bottom-1.5 left-1.5" />}
            </div>
            <div className="mt-2 truncate text-sm font-semibold">{entry.title}</div>
            <div className="truncate text-xs text-muted-foreground">{entry.artist}</div>
        </div>
    )
}

export function ChartPodiumItem({ entry }: { entry: ChartEntryWithRange }) {
    const { chartLikedIds, toggleChartLikeRemote } = useStore()
    const isSaved = chartLikedIds.has(entry.id)
    const stars = useDifficultyStars(entry)

    return (
        <div className="relative rounded-[12px] overflow-hidden bg-surface/60 border border-border/60 p-2.5">
            <div className="absolute top-2 left-2 z-10 h-7 w-7 rounded-full bg-gradient-to-br from-primary to-brand text-primary-foreground grid place-items-center text-xs font-extrabold">
                {entry.rank}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    toggleChartLikeRemote({
                        externalId: entry.id,
                        title: entry.title,
                        artist: entry.artist,
                        artworkUrl: entry.artworkUrl || null,
                    })
                }}
                className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/40 backdrop-blur grid place-items-center"
                aria-label={isSaved ? "좋아요 취소" : "좋아요"}
            >
                <Heart className={`h-3.5 w-3.5 ${isSaved ? "fill-primary text-primary" : "text-white"}`} />
            </button>
            <div className="aspect-square relative rounded-[10px] overflow-hidden">
                {entry.artworkUrl ? (
                    <img src={entry.artworkUrl} alt={entry.title} className="object-cover h-full w-full" />
                ) : (
                    <div className="h-full w-full bg-muted" />
                )}
                {stars && <DifficultyBadge stars={stars} className="absolute bottom-1.5 left-1.5" />}
            </div>
            <div className="mt-2 text-xs font-bold truncate">{entry.title}</div>
            <div className="text-[10px] text-muted-foreground truncate">{entry.artist}</div>
        </div>
    )
}