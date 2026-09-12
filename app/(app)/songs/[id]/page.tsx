"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Bookmark, Play, Pause } from "lucide-react"
import { api, type SongResponse } from "@/lib/api"
import { difficultyTier, colorFromString } from "@/lib/song-display"
import { fetchArtwork } from "@/lib/artwork-cache"
import { BackendSongCard } from "@/components/backend-song-card"

export default function SongDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const songId = Number(params.id)

  const [song, setSong] = React.useState<SongResponse | null>(null)
  const [similar, setSimilar] = React.useState<SongResponse[]>([])
  const [artworkUrl, setArtworkUrl] = React.useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [playing, setPlaying] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  React.useEffect(() => {
    if (!songId) return
    let cancelled = false

    async function load() {
      try {
        const s = await api.getSong(songId)
        if (cancelled) return
        setSong(s)

        // real cover + real 30s preview, looked up by title/artist
        fetchArtwork(s.title, s.artist).then((data) => {
          if (cancelled) return
          setArtworkUrl(data.artworkUrl)
          setPreviewUrl(data.previewUrl)
        })

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

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

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
        <button className="h-10 w-10 grid place-items-center rounded-[10px] hover:bg-muted text-muted-foreground">
          <Bookmark className="h-5 w-5" />
        </button>
      </header>

      <div className="rounded-[16px] overflow-hidden border border-border mb-5">
        {artworkUrl ? (
          <img src={artworkUrl} alt={song.title} className="w-full aspect-square object-cover" />
        ) : (
          <div
            className="w-full aspect-square grid place-items-center text-white text-5xl font-extrabold"
            style={{ backgroundColor: bg }}
          >
            {song.title.charAt(0)}
          </div>
        )}
        <div className="p-4">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${tier.className}`}>
            {tier.label}
          </span>
          <div className="text-2xl font-extrabold">{song.title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{song.artist}</div>
        </div>
      </div>

      {previewUrl ? (
        <button
          onClick={togglePlay}
          className="w-full h-12 rounded-[10px] bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 mb-5"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "일시정지" : "미리듣기 (30초)"}
          <audio
            ref={audioRef}
            src={previewUrl}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        </button>
      ) : (
        <div className="w-full h-12 rounded-[10px] bg-muted text-muted-foreground text-sm font-medium flex items-center justify-center mb-5">
          미리듣기를 찾을 수 없어요
        </div>
      )}

      <div className="rounded-[14px] border border-border bg-card p-4 mb-6">
        <div className="text-sm font-bold mb-3">곡 정보</div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-muted-foreground">장르</div>
          <div className="text-right">{song.genre || "-"}</div>
          <div className="text-muted-foreground">원곡 키</div>
          <div className="text-right">{song.key || "-"}</div>
          <div className="text-muted-foreground">최저음</div>
          <div className="text-right">{song.minNoteLabel}</div>
          <div className="text-muted-foreground">최고음</div>
          <div className="text-right">{song.maxNoteLabel}</div>
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
