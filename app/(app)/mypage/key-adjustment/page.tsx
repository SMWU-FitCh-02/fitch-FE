"use client"

import * as React from "react"
import Link from "next/link"
import { Search, ChevronRight, KeyRound, Minus, Plus, Mic, X } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/lib/store"
import { api, type SongResponse } from "@/lib/api"
import { fetchArtwork } from "@/lib/artwork-cache"
import { colorFromString } from "@/lib/song-display"

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
function midiToNote(midi: number): string {
  const note = NOTES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${note}${octave}`
}

export default function KeyAdjustmentPage() {
  const { profile } = useStore()
  const hasRange = !!profile.range
  const [query, setQuery] = React.useState("")
  const [allSongs, setAllSongs] = React.useState<SongResponse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<SongResponse | null>(null)
  const [offset, setOffset] = React.useState(0)
  const [userMaxNote, setUserMaxNote] = React.useState<number | null>(null)
  const [artworkUrl, setArtworkUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!hasRange) return
    let cancelled = false
    api
      .getSongs()
      .then((songs) => {
        if (!cancelled) setAllSongs(songs)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasRange])

  React.useEffect(() => {
    if (!hasRange || !profile.userId) return
    let cancelled = false
    api
      .getVocalRange(profile.userId)
      .then((r) => {
        if (!cancelled) setUserMaxNote(r.maxNote)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [hasRange, profile.userId])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allSongs.slice(0, 10)
    return allSongs
      .filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
      .slice(0, 20)
  }, [query, allSongs])

  React.useEffect(() => {
    if (selected && userMaxNote != null) {
      setOffset(userMaxNote - selected.maxNote)
    } else {
      setOffset(0)
    }
  }, [selected, userMaxNote])

  React.useEffect(() => {
    if (!selected) {
      setArtworkUrl(null)
      return
    }
    let cancelled = false
    fetchArtwork(selected.title, selected.artist).then((data) => {
      if (!cancelled) setArtworkUrl(data.artworkUrl)
    })
    return () => {
      cancelled = true
    }
  }, [selected])

  const newHighMidi = selected ? selected.maxNote + offset : 0
  const newHigh = selected ? midiToNote(newHighMidi) : "—"
  const fit = selected && userMaxNote != null ? Math.abs(newHighMidi - userMaxNote) : 99
  const sign = offset > 0 ? "+" : ""

  if (!hasRange) {
    return (
      <main className="px-4 pb-6">
        <PageHeader title="키 조정" subtitle="추천 키를 받아보세요" />
        <div className="mt-10 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-surface/60 border border-border grid place-items-center">
            <Mic className="h-9 w-9 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-bold">먼저 음역대 측정이 필요해요</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
            맞춤 키를 계산하려면 내 음역대 데이터가 필요해요.
          </p>
          <Button variant="brand" size="lg" className="mt-6 w-full" asChild>
            <Link href="/mypage/range-test">음역대 테스트</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-6">
      <PageHeader title="키 조정" subtitle="부르고 싶은 곡 검색 후 추천 키 확인" />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="곡 또는 가수 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <div className="mt-6 text-center text-xs text-muted-foreground">곡 목록 불러오는 중...</div>}

      <div className="mt-4 space-y-1.5">
        {filtered.map((s) => {
          const bg = colorFromString(s.title + s.artist)
          return (
            <button
              key={s.songId}
              type="button"
              onClick={() => setSelected(s)}
              className={`w-full flex items-center gap-3 p-2 rounded-[10px] text-left transition-colors ${
                selected?.songId === s.songId ? "bg-primary/10" : "hover:bg-surface/60"
              }`}
            >
              <div
                className="h-10 w-10 shrink-0 rounded-[8px] grid place-items-center text-white text-xs font-extrabold"
                style={{ backgroundColor: bg }}
              >
                {s.title.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold">{s.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {s.artist} · 최고음 {s.maxNoteLabel}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 flex items-end justify-center pointer-events-none"
          style={{ top: "4rem" }}
        >
          <div className="mobile-shell w-full px-4 pb-4 pointer-events-auto">
            <div
              className="relative rounded-[14px] bg-surface-elevated/95 backdrop-blur border border-primary/30 p-4 shadow-[0_-12px_30px_-8px_rgba(0,0,0,0.5)] overflow-y-auto"
              style={{ maxHeight: "100%" }}
            >
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="닫기"
                className="absolute right-4 top-4 h-8 w-8 grid place-items-center rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-3 pr-8">
                {artworkUrl ? (
                  <img
                    src={artworkUrl}
                    alt={selected.title}
                    className="h-12 w-12 rounded-[10px] object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="h-12 w-12 rounded-[10px] shrink-0 grid place-items-center text-white text-sm font-extrabold"
                    style={{ backgroundColor: colorFromString(selected.title + selected.artist) }}
                  >
                    {selected.title.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-bold">{selected.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{selected.artist}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-muted-foreground">원곡 최고음</div>
                  <div className="text-sm font-extrabold">{selected.maxNoteLabel}</div>
                </div>
              </div>

              <div className="mt-3 rounded-[12px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-3">
                <div className="flex items-center gap-2 text-xs text-primary font-bold">
                  <KeyRound className="h-4 w-4" /> 추천 키
                </div>

                <div className="mt-2 flex items-center gap-4 justify-center">
                  <button
                    type="button"
                    onClick={() => setOffset((v) => v - 1)}
                    className="h-9 w-9 rounded-full bg-surface border border-border grid place-items-center"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="text-center">
                    <div className="text-3xl font-extrabold text-foreground">
                      {sign}
                      {offset}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      반음 ({offset > 0 ? "올림" : offset < 0 ? "내림" : "변화 없음"})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOffset((v) => v + 1)}
                    className="h-9 w-9 rounded-full bg-surface border border-border grid place-items-center"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">조정 후 최고음</span>
                  <span className="font-bold text-brand">{newHigh}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">내 최고음</span>
                  <span className="font-bold">
                    {userMaxNote != null ? midiToNote(userMaxNote) : "—"}
                  </span>
                </div>
                <div className="mt-3">
                  <Badge variant={fit <= 1 ? "success" : fit <= 3 ? "warning" : "destructive"}>
                    {fit <= 1 ? "완벽한 키예요" : fit <= 3 ? "도전해볼 만해요" : "조금 더 조정해보세요"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && <div className="h-72" />}
    </main>
  )
}
