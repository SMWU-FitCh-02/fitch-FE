"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, ChevronRight, KeyRound, Minus, Plus, Mic } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SONGS, suggestKeyOffset, noteToMidi } from "@/lib/songs"
import { useStore } from "@/lib/store"

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
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [offset, setOffset] = React.useState(0)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SONGS.slice(0, 10)
    return SONGS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [query])

  const selected = SONGS.find((s) => s.id === selectedId) || null

  // when selected change, recalc offset based on user
  React.useEffect(() => {
    if (selected && hasRange) {
      const suggested = suggestKeyOffset(profile.range!.comfortableHigh, selected.highestNote)
      setOffset(suggested)
    } else {
      setOffset(0)
    }
  }, [selected, hasRange, profile.range])

  const newHighMidi = selected ? noteToMidi(selected.highestNote) + offset : 0
  const newHigh = selected ? midiToNote(newHighMidi) : "—"
  const sign = offset > 0 ? "+" : ""
  const fit = selected && hasRange
    ? Math.abs(newHighMidi - noteToMidi(profile.range!.comfortableHigh))
    : 99

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

      <div className="mt-4 space-y-1.5">
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className={`w-full flex items-center gap-3 p-2 rounded-[10px] text-left transition-colors ${
              selectedId === s.id ? "bg-primary/10" : "hover:bg-surface/60"
            }`}
          >
            <div className="relative h-10 w-10 overflow-hidden rounded-[8px]">
              <Image src={s.cover} alt={s.title} width={40} height={40} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold">{s.title}</div>
              <div className="truncate text-[11px] text-muted-foreground">{s.artist} · 최고음 {s.highestNote}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <div className="mobile-shell px-4 pb-4">
            <div className="rounded-[14px] bg-surface-elevated/95 backdrop-blur border border-primary/30 p-4 shadow-[0_-12px_30px_-8px_rgba(0,0,0,0.5)]">
              <div className="flex items-start gap-3">
                <div className="relative h-12 w-12 rounded-[10px] overflow-hidden shrink-0">
                  <Image src={selected.cover} alt={selected.title} width={48} height={48} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-bold">{selected.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{selected.artist}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">원곡 최고음</div>
                  <div className="text-sm font-extrabold">{selected.highestNote}</div>
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
                      {sign}{offset}
                    </div>
                    <div className="text-[10px] text-muted-foreground">반음 ({offset > 0 ? "올림" : offset < 0 ? "내림" : "변화 없음"})</div>
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
                  <span className="text-muted-foreground">내 편한 고음</span>
                  <span className="font-bold">{profile.range!.comfortableHigh}</span>
                </div>
                <div className="mt-3">
                  <Badge variant={fit <= 1 ? "success" : fit <= 3 ? "warning" : "destructive"}>
                    {fit <= 1
                      ? "완벽한 키예요"
                      : fit <= 3
                      ? "도전해볼 만해요"
                      : "조금 더 조정해보세요"}
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
