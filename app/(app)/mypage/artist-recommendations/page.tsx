"use client"

import * as React from "react"
import { Search, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { similarArtistSongs, SONGS, uniqueArtists } from "@/lib/songs"
import { SongCard } from "@/components/song-card"
import { cn } from "@/lib/utils"

export default function ArtistRecommendationsPage() {
  const { profile } = useStore()
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string | null>(
    profile.preferredArtists[0] || null
  )

  const artists = React.useMemo(() => uniqueArtists(), [])
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? artists.filter((a) => a.toLowerCase().includes(q)) : artists
  }, [artists, query])

  const songs = React.useMemo(() => {
    if (!selected) return []
    return similarArtistSongs(selected, 20)
  }, [selected])

  const sample = selected ? SONGS.find((s) => s.artist === selected) : null

  return (
    <main className="px-4 pb-6">
      <PageHeader
        title="유사 음색 아티스트 추천"
        subtitle="아티스트 검색 → 비슷한 음색의 곡"
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="좋아하는 아티스트 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {filtered.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setSelected(a)}
            className={cn(
              "shrink-0 h-9 px-3 rounded-full border text-xs font-semibold transition-colors",
              selected === a
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-surface/40 text-muted-foreground"
            )}
          >
            {a}
          </button>
        ))}
      </div>

      {selected && sample ? (
        <div className="mt-5 rounded-[14px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold">{selected}와 비슷한 음색</span>
          </div>
          <div className="mt-1 text-base font-extrabold">
            {songs.length}곡의 유사 음색 곡을 찾았어요
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {sample.genre.toUpperCase()} 장르, 최고음 {sample.highestNote} 기준
          </div>
        </div>
      ) : (
        <div className="mt-10 text-center text-sm text-muted-foreground">
          위에서 아티스트를 선택해주세요.
        </div>
      )}

      <div className="mt-5 space-y-2">
        {songs.map((s) => (
          <SongCard key={s.id} song={s} />
        ))}
      </div>
    </main>
  )
}
