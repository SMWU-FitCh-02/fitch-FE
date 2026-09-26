"use client"

import * as React from "react"
import Link from "next/link"
import type { SongResponse } from "@/lib/api"
import { difficultyTier, colorFromString } from "@/lib/song-display"
import { fetchArtwork } from "@/lib/artwork-cache"
import { noteToKorean } from "@/lib/songs"

// 다른 화면(인기차트, 유사 음색 아티스트 추천 등)의 ChartSongRow/ChartPodiumItem에서
// 쓰는 난이도 배지랑 색/모양을 똑같이 맞춘다 — 검은 반투명 배경에 ★/☆ 텍스트,
// 1=초록(쉬움) 2=노랑(보통) 3=빨강(어려움).
function DifficultyBadge({ stars }: { stars: 1 | 2 | 3 }) {
  const color = stars === 1 ? "text-emerald-400" : stars === 2 ? "text-amber-400" : "text-rose-400"
  return (
      <span
          className={`inline-flex items-center rounded-full bg-black/70 backdrop-blur font-bold leading-none whitespace-nowrap px-1.5 py-0.5 text-[10px] ${color}`}
      >
      {"★".repeat(stars)}
        <span className="text-white/25">{"☆".repeat(3 - stars)}</span>
    </span>
  )
}

export function BackendSongCard({ song }: { song: SongResponse }) {
  const tier = difficultyTier(song.maxNote)
  const bg = colorFromString(song.title + song.artist)
  const [artworkUrl, setArtworkUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    fetchArtwork(song.title, song.artist).then((data) => {
      if (!cancelled && data.artworkUrl) setArtworkUrl(data.artworkUrl)
    })
    return () => {
      cancelled = true
    }
  }, [song.title, song.artist])

  return (
      <Link
          href={`/songs/${song.songId}`}
          className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-3 transition-colors hover:bg-card/70"
      >
        {artworkUrl ? (
            <img
                src={artworkUrl}
                alt={song.title}
                className="h-14 w-14 shrink-0 rounded-[10px] object-cover"
            />
        ) : (
            <div
                className="h-14 w-14 shrink-0 rounded-[10px] grid place-items-center text-white text-lg font-extrabold"
                style={{ backgroundColor: bg }}
            >
              {song.title.charAt(0)}
            </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{song.title}</div>
          <div className="truncate text-xs text-muted-foreground">{song.artist}</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <DifficultyBadge stars={tier.stars as 1 | 2 | 3} />
            <span className="text-[10px] text-muted-foreground">최고음 {noteToKorean(song.maxNoteLabel)}</span>
            {song.genre && <span className="text-[10px] text-muted-foreground">· {song.genre}</span>}
          </div>
        </div>
      </Link>
  )
}