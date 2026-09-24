"use client"

import * as React from "react"
import Link from "next/link"
import { BookmarkCheck, Music2, Heart } from "lucide-react"
import { useStore } from "@/lib/store"
import { BackendSongCard } from "@/components/backend-song-card"
import { Button } from "@/components/ui/button"
import { api, type SongResponse, type ChartLikeEntry } from "@/lib/api"

export default function LibraryPage() {
  const { profile, toggleChartLikeRemote } = useStore()

  const [savedSongs, setSavedSongs] = React.useState<SongResponse[]>([])
  const [likedCharts, setLikedCharts] = React.useState<ChartLikeEntry[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!profile.userId) return
    let cancelled = false
    Promise.all([api.getSongBookmarks(), api.getChartLikes()])
      .then(([songs, charts]) => {
        if (cancelled) return
        setSavedSongs(songs)
        setLikedCharts(charts)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [profile.userId])

  return (
      <main className="px-4 pt-1 pb-6">
        <header className="px-1 mb-5">
        <div className="text-xs text-muted-foreground">{profile.name || "FitCh 유저"}님의</div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <BookmarkCheck className="h-6 w-6 text-primary" />
          내 보관함
        </h1>
        <div className="mt-1 text-xs text-muted-foreground">
          저장한 곡 {savedSongs.length}개 · 좋아요한 인기차트 {likedCharts.length}개
        </div>
      </header>

      {loading ? (
        <div className="text-center text-xs text-muted-foreground py-10">불러오는 중...</div>
      ) : (
        <>
          {/* 저장한 곡 (곡 상세페이지에서 북마크한 것) */}
          <section className="mb-6">
            <h2 className="px-1 mb-2 text-sm font-bold flex items-center gap-1.5">
              <BookmarkCheck className="h-4 w-4 text-primary" /> 저장한 곡
            </h2>
            {savedSongs.length === 0 ? (
              <div className="mt-2 text-center py-8">
                <div className="mx-auto h-16 w-16 rounded-full bg-surface/60 border border-border grid place-items-center">
                  <Music2 className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground max-w-xs mx-auto">
                  마음에 드는 추천곡을 저장해 노래방에서 빠르게 찾아보세요.
                </p>
                <Button variant="brand" size="sm" className="mt-4" asChild>
                  <Link href="/recommendations">추천곡 보러가기</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedSongs.map((s) => (
                  <BackendSongCard key={s.songId} song={s} />
                ))}
              </div>
            )}
          </section>

          {/* 좋아요한 인기차트 곡 */}
          <section>
            <h2 className="px-1 mb-2 text-sm font-bold flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-primary" /> 좋아요한 인기차트
            </h2>
            {likedCharts.length === 0 ? (
              <div className="mt-2 text-center py-8">
                <p className="text-xs text-muted-foreground">
                  인기차트에서 하트를 눌러 좋아하는 곡을 표시해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {likedCharts.map((c) => (
                  <div
                    key={c.externalId}
                    className="flex items-center gap-3 rounded-[12px] bg-card/70 border border-border/60 p-2.5"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
                      {c.artworkUrl ? (
                        <img src={c.artworkUrl} alt={c.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{c.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.artist}</div>
                    </div>
                    <button
                      onClick={async () => {
                        await toggleChartLikeRemote(c)
                        setLikedCharts((prev) => prev.filter((x) => x.externalId !== c.externalId))
                      }}
                      className="shrink-0 h-9 w-9 grid place-items-center rounded-full hover:bg-muted"
                      aria-label="좋아요 취소"
                    >
                      <Heart className="h-4 w-4 fill-primary text-primary" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
