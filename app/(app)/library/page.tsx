"use client"

import * as React from "react"
import Link from "next/link"
import { BookmarkCheck, Music2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { SONGS } from "@/lib/songs"
import { SongCard } from "@/components/song-card"
import { Button } from "@/components/ui/button"

export default function LibraryPage() {
  const { profile } = useStore()
  const saved = React.useMemo(
    () => SONGS.filter((s) => profile.library.includes(s.id)),
    [profile.library]
  )

  return (
    <main className="px-4 pt-4 pb-6">
      <header className="px-1 mb-5">
        <div className="text-xs text-muted-foreground">{profile.name || "FitCh 유저"}님의</div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <BookmarkCheck className="h-6 w-6 text-primary" />
          내 보관함
        </h1>
        <div className="mt-1 text-xs text-muted-foreground">
          저장한 곡 {saved.length}개
        </div>
      </header>

      {saved.length === 0 ? (
        <div className="mt-10 text-center">
          <div className="mx-auto h-20 w-20 rounded-full bg-surface/60 border border-border grid place-items-center">
            <Music2 className="h-9 w-9 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-bold">아직 저장한 곡이 없어요</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
            마음에 드는 추천곡을 보관함에 저장해 노래방에서 빠르게 찾아보세요.
          </p>
          <Button variant="brand" size="lg" className="mt-6 w-full" asChild>
            <Link href="/recommendations">추천곡 보러가기</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {saved.map((s) => (
            <SongCard key={s.id} song={s} />
          ))}
        </div>
      )}
    </main>
  )
}
