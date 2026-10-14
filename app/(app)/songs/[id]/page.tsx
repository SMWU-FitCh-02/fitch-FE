"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { api, type SongResponse } from "@/lib/api"
import { difficultyTier, colorFromString } from "@/lib/song-display"
import { BackendSongCard } from "@/components/backend-song-card"
import { SongCredit } from "@/components/song-credit"

export default function SongDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const songId = Number(params.id)

  const [song, setSong] = React.useState<SongResponse | null>(null)
  const [similar, setSimilar] = React.useState<SongResponse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!songId) return
    let cancelled = false

    async function load() {
      try {
        const s = await api.getSong(songId)
        if (cancelled) return
        setSong(s)

        // "similar range" = other songs within 3 semitones of this one's max note
        const all: SongResponse[] = await api.getSongs()
        if (cancelled) return
        const nearby = all
          .filter((x) => x.songId !== s.songId && Math.abs(x.maxNote - s.maxNote) <= 3)
          .slice(0, 6)
        setSimilar(nearby)
      } catch {
        if (!cancelled) setError("곡 정보를 불러오지 못했어요.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [songId])

  if (loading) {
    return <div className="px-4 pt-10 text-center text-sm text-muted-foreground">불러오는 중...</div>
  }
  if (error || !song) {
    return <div className="px-4 pt-10 text-center text-sm text-destructive">{error || "곡을 찾을 수 없어요."}</div>
  }

  const tier = difficultyTier(song.maxNote)
  const bg = colorFromString(song.title + song.artist)

  return (
      <main className="px-4 pt-4 pb-24">
        <header className="flex items-center justify-between px-1 mb-4">
          <button onClick={() => router.back()} className="h-10 w-10 grid place-items-center rounded-[10px] hover:bg-muted text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </header>
      <div className="rounded-[16px] overflow-hidden border border-border mb-5">
        <div
          className="w-full aspect-square grid place-items-center text-white text-5xl font-extrabold"
          style={{ backgroundColor: bg }}
        >
          {song.title.charAt(0)}
        </div>
        <div className="p-4">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${tier.className}`}>
            {tier.label}
          </span>
          <div className="text-2xl font-extrabold">{song.title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{song.artist}</div>
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card p-4 mb-6">
        <div className="text-sm font-bold mb-3">곡 정보</div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-muted-foreground">장르</div>
          <div className="text-right">{song.genre || "-"}</div>
          <div className="text-muted-foreground">최저음</div>
          <div className="text-right">{song.minNoteLabel}</div>
          <div className="text-muted-foreground">최고음</div>
          <div className="text-right">{song.maxNoteLabel}</div>
        </div>
        <div className="mt-3 pt-3 border-t border-border/60">
          <SongCredit title={song.title} artist={song.artist} />
        </div>
      </div>

      <div className="text-sm font-bold px-1 mb-3">비슷한 음역대 곡</div>
      <div className="space-y-2">
        {similar.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">비슷한 음역대의 곡이 아직 없어요.</div>
        ) : (
          similar.map((s) => <BackendSongCard key={s.songId} song={s} />)
        )}
      </div>
    </main>
  )
}
