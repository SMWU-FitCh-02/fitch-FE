"use client"

import * as React from "react"
import Link from "next/link"
import type { SongResponse } from "@/lib/api"
import { difficultyTier, colorFromString } from "@/lib/song-display"
import { fetchArtwork } from "@/lib/artwork-cache"

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
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tier.className}`}>
            {tier.label}
          </span>
          <span className="text-[10px] text-muted-foreground">최고음 {song.maxNoteLabel}</span>
          {song.genre && <span className="text-[10px] text-muted-foreground">· {song.genre}</span>}
        </div>
      </div>
    </Link>
  )
}
