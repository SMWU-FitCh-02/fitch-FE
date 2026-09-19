"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Bookmark, BookmarkCheck, Play } from "lucide-react"
import type { Song } from "@/lib/songs"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { noteToKorean } from "@/lib/songs"

export function difficultyLabel(d: 1 | 2 | 3 | 4 | 5) {
  const map: Record<number, { label: string; variant: "success" | "warning" | "default" | "secondary" | "destructive" }> = {
    1: { label: "⭐️", variant: "success" },
    2: { label: "⭐⭐", variant: "secondary" },
    3: { label: "⭐⭐⭐", variant: "default" },
    4: { label: "⭐⭐⭐⭐", variant: "warning" },
    5: { label: "⭐⭐⭐⭐⭐", variant: "destructive" },
  }
  return map[d]
}

export function SongCard({
  song,
  compact = false,
  rank,
}: {
  song: Song
  compact?: boolean
  rank?: number
}) {
  const { profile, toggleLibrary } = useStore()
  const inLib = profile.library.includes(song.id)
  const diff = difficultyLabel(song.difficulty)

  return (
    <div className="group relative flex items-center gap-3 rounded-[12px] bg-card/70 border border-border/60 p-2.5 transition-colors hover:bg-card">
      {typeof rank === "number" && (
        <div className="w-7 text-center text-base font-bold text-muted-foreground">
          {rank}
        </div>
      )}
      <Link href={`/song/${song.id}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
        <Image
          src={song.cover}
          alt={song.title}
          width={56}
          height={56}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <Play className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
        </div>
      </Link>
      <Link href={`/song/${song.id}`} className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">
          {song.title}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {song.artist}
        </div>
        {!compact && (
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant={diff.variant} className="text-[10px] py-0">
              {diff.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">최고음 {noteToKorean(song.highestNote)}</span>          </div>
        )}
      </Link>
      <button
        type="button"
        aria-label={inLib ? "보관함에서 빼기" : "보관함에 저장"}
        onClick={() => toggleLibrary(song.id)}
        className={cn(
          "shrink-0 grid place-items-center h-9 w-9 rounded-[10px] transition-colors",
          inLib ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {inLib ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
      </button>
    </div>
  )
}

export function SongTile({ song }: { song: Song }) {
  return (
    <Link
      href={`/song/${song.id}`}
      className="block w-32 shrink-0 group"
    >
      <div className="relative w-32 h-32 overflow-hidden rounded-[12px] border border-border/40">
        <Image
          src={song.cover}
          alt={song.title}
          width={128}
          height={128}
          className="object-cover h-full w-full transition-transform group-hover:scale-105"
        />
      </div>
      <div className="mt-2 truncate text-sm font-semibold">{song.title}</div>
      <div className="truncate text-xs text-muted-foreground">{song.artist}</div>
    </Link>
  )
}
