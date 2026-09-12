"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Bookmark, BookmarkCheck, Play, Music2, Clock, Hash, KeyRound, AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SONGS, recommendSongs, noteToMidi } from "@/lib/songs"
import { useStore } from "@/lib/store"
import { difficultyLabel, SongCard } from "@/components/song-card"

export default function SongDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const song = SONGS.find((s) => s.id === id)
  const { profile, toggleLibrary } = useStore()

  if (!song) {
    return (
      <main className="px-4 pb-6">
        <PageHeader title="곡 정보" />
        <div className="mt-10 text-center text-sm text-muted-foreground">곡을 찾을 수 없어요.</div>
      </main>
    )
  }

  const inLib = profile.library.includes(song.id)
  const diff = difficultyLabel(song.difficulty)

  const similar = React.useMemo(
    () => recommendSongs(song.highestNote, { limit: 6, tolerance: 3, exclude: [song.id] }),
    [song]
  )

  const fitInfo = profile.range
    ? (() => {
        const userMidi = noteToMidi(profile.range!.comfortableHigh)
        const songMidi = noteToMidi(song.highestNote)
        const diff = songMidi - userMidi
        const abs = Math.abs(diff)
        if (abs <= 1) return { label: "딱 맞아요", variant: "success" as const, hint: "편안하게 부를 수 있어요" }
        if (diff > 1 && diff <= 4) return { label: "조금 어려워요", variant: "warning" as const, hint: `${diff}반음 더 높음` }
        if (diff > 4) return { label: "고난도", variant: "destructive" as const, hint: `${diff}반음 더 높음` }
        return { label: "여유 있어요", variant: "muted" as const, hint: `${abs}반음 낮음` }
      })()
    : null

  return (
    <main className="pb-6">
      <PageHeader title="" right={
        <button
          onClick={() => toggleLibrary(song.id)}
          className="h-10 w-10 grid place-items-center rounded-[10px] hover:bg-muted"
          aria-label={inLib ? "보관함 해제" : "보관함 저장"}
        >
          {inLib ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
        </button>
      } className="px-4" />

      <div className="px-4">
        <div className="relative aspect-square rounded-[16px] overflow-hidden border border-border/60">
          <Image src={song.cover} alt={song.title} fill className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <Badge variant={diff.variant}>{diff.label}</Badge>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight">{song.title}</h1>
            <div className="text-sm text-white/85">{song.artist}</div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 flex gap-2">
        <Button variant="brand" size="lg" className="flex-1">
          <Play className="h-4 w-4" /> 미리듣기
        </Button>
        <Button
          variant={inLib ? "secondary" : "outline"}
          size="lg"
          className="px-4"
          onClick={() => toggleLibrary(song.id)}
        >
          {inLib ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        </Button>
      </div>

      {fitInfo && (
        <div className="mx-4 mt-5 rounded-[14px] bg-card border border-border/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">내 음역대 적합도</span>
          </div>
          <div className="flex items-center justify-between">
            <Badge variant={fitInfo.variant}>{fitInfo.label}</Badge>
            <span className="text-xs text-muted-foreground">{fitInfo.hint}</span>
          </div>
          <Separator className="my-3" />
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-[10px] bg-surface/60 p-3">
              <div className="text-[10px] text-muted-foreground">곡 최고음</div>
              <div className="text-lg font-extrabold text-brand">{song.highestNote}</div>
            </div>
            <div className="rounded-[10px] bg-surface/60 p-3">
              <div className="text-[10px] text-muted-foreground">내 편한 고음</div>
              <div className="text-lg font-extrabold">{profile.range!.comfortableHigh}</div>
            </div>
          </div>
          {fitInfo.variant === "destructive" && (
            <div className="mt-3 flex items-start gap-2 text-xs rounded-[10px] bg-destructive/15 text-destructive p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>키를 낮춰 부르거나, 음역대 비슷한 다른 곡을 추천드려요.</div>
            </div>
          )}
          <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
            <Link href="/mypage/key-adjustment">키 조정해보기</Link>
          </Button>
        </div>
      )}

      <div className="mx-4 mt-5 rounded-[14px] bg-card border border-border/60 p-4">
        <div className="text-sm font-bold mb-3">곡 정보</div>
        <div className="grid grid-cols-2 gap-y-3 text-xs">
          <Meta icon={<Music2 className="h-3.5 w-3.5" />} label="장르" value={song.genre.toUpperCase()} />
          <Meta icon={<Clock className="h-3.5 w-3.5" />} label="재생시간" value={song.duration} />
          <Meta icon={<Hash className="h-3.5 w-3.5" />} label="TJ 번호" value={song.tjNumber || "—"} />
          <Meta icon={<Hash className="h-3.5 w-3.5" />} label="금영 번호" value={song.kyNumber || "—"} />
          <Meta label="발매" value={String(song.releaseYear)} />
          <Meta label="최저음" value={song.lowestNote} />
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-6 px-4">
          <h2 className="text-base font-bold mb-3">비슷한 음역대 곡</h2>
          <div className="space-y-2">
            {similar.map((s) => (
              <SongCard key={s.id} song={s} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function Meta({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-semibold">{value}</span>
    </div>
  )
}
