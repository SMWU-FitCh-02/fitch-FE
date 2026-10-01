"use client"

import * as React from "react"
import { Heart, Play, Pause, Loader2, Wand2 } from "lucide-react"
import type { ChartEntry } from "@/lib/itunes"
import { useStore } from "@/lib/store"
import { noteToMidi } from "@/lib/songs"
import { fetchArtwork } from "@/lib/artwork-cache"
import { usePreviewPlayer } from "@/lib/audio-preview"
import { useKeyAdjustPreviewPlayer } from "@/lib/key-adjust-player"

export type ChartEntryWithRange = ChartEntry & {
    minNote?: number
    maxNote?: number
}

type VocalRange = { lowestNote: string; highestNote: string }

// 크롤링 곡의 minNote/maxNote(MIDI)와 사용자 음역대를 비교해 1~3점 난이도 산출.
// 훅 밖(목록 정렬/필터링 등)에서도 쓸 수 있도록 순수 함수로 분리해둠.
export function computeDifficultyStars(
    entry: ChartEntryWithRange,
    range?: VocalRange | null
): 1 | 2 | 3 | null {
    if (entry.minNote == null || entry.maxNote == null || !range) return null
    const userMin = noteToMidi(range.lowestNote)
    const userMax = noteToMidi(range.highestNote)
    const overHigh = Math.max(0, entry.maxNote - userMax)
    const overLow = Math.max(0, userMin - entry.minNote)
    const totalOver = overHigh + overLow
    if (totalOver === 0) return 1
    if (totalOver <= 3) return 2
    return 3
}

function useDifficultyStars(entry: ChartEntryWithRange): 1 | 2 | 3 | null {
    const { profile } = useStore()
    return computeDifficultyStars(entry, profile.range)
}

// 곡이 내 음역대를 벗어난 만큼 몇 반음을 조정해야 내 음역대 안에 들어오는지 계산.
// 0이면 이미 내 음역대 안이라 조정이 필요 없다는 뜻.
export function computeKeySemitoneShift(
    entry: ChartEntryWithRange,
    range?: VocalRange | null
): number {
    if (entry.minNote == null || entry.maxNote == null || !range) return 0
    const userMin = noteToMidi(range.lowestNote)
    const userMax = noteToMidi(range.highestNote)
    const overHigh = Math.max(0, entry.maxNote - userMax)
    const overLow = Math.max(0, userMin - entry.minNote)
    if (overHigh >= overLow && overHigh > 0) return -overHigh // 고음이 안 닿으면 내려서 맞춤
    if (overLow > 0) return overLow // 저음이 안 닿으면 올려서 맞춤
    return 0
}

// 앨범 커버 위에 올라가는 작은 별 뱃지 (어느 배경에서도 잘 보이도록 어두운 배경 + 색 텍스트)
function DifficultyBadge({
                             stars,
                             className = "",
                             size = "md",
                         }: {
    stars: 1 | 2 | 3
    className?: string
    size?: "md" | "sm"
}) {
    const color = stars === 1 ? "text-emerald-400" : stars === 2 ? "text-amber-400" : "text-rose-400"
    const sizeClass = size === "sm" ? "px-1 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[10px]"
    return (
        <div
            className={`inline-flex items-center rounded-full bg-black/70 backdrop-blur font-bold leading-none whitespace-nowrap ${sizeClass} ${color} ${className}`}
        >
            {"★".repeat(stars)}
            <span className="text-white/25">{"☆".repeat(3 - stars)}</span>
        </div>
    )
}

// 곡의 30초 미리듣기 재생/일시정지 버튼. previewUrl은 클릭 시점에 lazy하게 가져온다
// (차트에 곡이 많아서 전부 미리 fetch하면 낭비이기 때문).
// showLabel=false면 좁은 카드(포디움/타일)용 아이콘 전용 버튼으로 렌더링해서
// 난이도 뱃지랑 겹치지 않게 한다.
function PreviewButton({
                           entry,
                           size = "md",
                           showLabel = true,
                       }: {
    entry: ChartEntryWithRange
    size?: "md" | "sm"
    showLabel?: boolean
}) {
    const { playingId, toggle } = usePreviewPlayer()
    const [previewUrl, setPreviewUrl] = React.useState<string | null | undefined>(undefined) // undefined=아직 모름, null=없음
    const [loading, setLoading] = React.useState(false)
    const isPlaying = playingId === entry.id

    async function handleClick(e: React.MouseEvent) {
        e.stopPropagation()
        e.preventDefault()

        if (previewUrl) {
            toggle(entry.id, previewUrl)
            return
        }
        if (previewUrl === null) return // 이미 찾아봤는데 없었음

        setLoading(true)
        try {
            const data = await fetchArtwork(entry.title, entry.artist)
            setPreviewUrl(data.previewUrl ?? null)
            if (data.previewUrl) toggle(entry.id, data.previewUrl)
        } catch {
            setPreviewUrl(null)
        } finally {
            setLoading(false)
        }
    }

    if (previewUrl === null) return null // 미리듣기 없는 곡은 버튼 자체를 숨김

    const iconClass = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
    const icon = loading ? (
        <Loader2 className={`${iconClass} animate-spin`} />
    ) : isPlaying ? (
        <Pause className={iconClass} />
    ) : (
        <Play className={`${iconClass} translate-x-[0.5px]`} />
    )

    if (!showLabel) {
        const circleSize = size === "sm" ? "h-6 w-6" : "h-7 w-7"
        return (
            <button
                onClick={handleClick}
                className={`inline-flex items-center justify-center rounded-full bg-black/70 backdrop-blur text-primary hover:bg-black/85 transition-colors shrink-0 ${circleSize}`}
                aria-label={isPlaying ? "일시정지" : "미리듣기"}
            >
                {icon}
            </button>
        )
    }

    const sizeClass = size === "sm" ? "h-6 pl-1.5 pr-2 text-[9px] gap-1.5" : "h-7 pl-2 pr-2.5 text-[11px] gap-2"
    return (
        <button
            onClick={handleClick}
            className={`inline-flex items-center rounded-full bg-black/70 backdrop-blur text-primary font-semibold whitespace-nowrap hover:bg-black/85 transition-colors shrink-0 ${sizeClass}`}
            aria-label={isPlaying ? "일시정지" : "미리듣기"}
        >
            {icon}
            <span>{isPlaying ? "재생 중" : "미리듣기"}</span>
        </button>
    )
}

// "내 키로 듣기" 버튼 — 곡이 내 음역대를 벗어나 있을 때만 보임.
// 반음 수(shift)는 computeKeySemitoneShift로 클라이언트에서 바로 계산하고,
// 재생은 PreviewButton과 같은 previewUrl(fetchArtwork)을 그대로 쓰되
// Tone.js PitchShift를 거쳐서 들려준다.
function KeyAdjustButton({
                             entry,
                             size = "md",
                         }: {
    entry: ChartEntryWithRange
    size?: "md" | "sm"
}) {
    const { profile } = useStore()
    const shift = computeKeySemitoneShift(entry, profile.range)
    const { playingId, state, toggle } = useKeyAdjustPreviewPlayer()
    const isPlaying = playingId === entry.id

    if (shift === 0) return null // 이미 내 음역대 안이면 키 조정할 필요 없음

    async function handleClick(e: React.MouseEvent) {
        e.stopPropagation()
        e.preventDefault()

        if (isPlaying) {
            toggle(entry.id, "", 0) // currentId가 같으면 내부적으로 정지 분기를 타므로 url/semitone은 쓰이지 않음
            return
        }

        const data = await fetchArtwork(entry.title, entry.artist)
        if (!data.previewUrl) return
        toggle(entry.id, data.previewUrl, shift)
    }

    const iconClass = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
    const icon =
        state === "loading" ? (
            <Loader2 className={`${iconClass} animate-spin`} />
        ) : isPlaying ? (
            <Pause className={iconClass} />
        ) : (
            <Wand2 className={iconClass} />
        )

    const label = shift > 0 ? `+${shift}키` : `${shift}키`
    const sizeClass = size === "sm" ? "h-6 pl-1.5 pr-2 text-[9px] gap-1.5" : "h-7 pl-2 pr-2.5 text-[11px] gap-2"

    return (
        <button
            onClick={handleClick}
            className={`inline-flex items-center rounded-full bg-black/70 backdrop-blur text-brand font-semibold whitespace-nowrap hover:bg-black/85 transition-colors shrink-0 ${sizeClass}`}
            aria-label={isPlaying ? "일시정지" : `내 키로 듣기 (${label})`}
        >
            {icon}
            <span>{label}</span>
        </button>
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
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{entry.title}</div>
                <div className="truncate text-xs text-muted-foreground">{entry.artist}</div>
            </div>
            <div className="flex flex-col items-end justify-center gap-1 h-14 shrink-0">
                {stars && <DifficultyBadge stars={stars} size="sm" />}
                <div className="flex items-center gap-1">
                    <KeyAdjustButton entry={entry} size="sm" />
                    <PreviewButton entry={entry} size="sm" />
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
                        className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted"
                        aria-label={isSaved ? "좋아요 취소" : "좋아요"}
                    >
                        <Heart className={`h-4 w-4 ${isSaved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                </div>
            </div>
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
                {stars && <DifficultyBadge stars={stars} className="absolute bottom-1.5 right-1.5" />}
                <div className="absolute bottom-1.5 left-1.5">
                    <PreviewButton entry={entry} size="sm" showLabel={false} />
                </div>
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
                {stars && <DifficultyBadge stars={stars} className="absolute bottom-1.5 right-1.5" />}
                <div className="absolute bottom-1.5 left-1.5">
                    <PreviewButton entry={entry} size="sm" showLabel={false} />
                </div>
            </div>
            <div className="mt-2 text-xs font-bold truncate">{entry.title}</div>
            <div className="text-[10px] text-muted-foreground truncate">{entry.artist}</div>
        </div>
    )
}