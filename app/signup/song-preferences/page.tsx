"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronRight, Check, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SignupHeader } from "@/components/signup-header"
import { SONGS } from "@/lib/songs"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export default function SongPreferencesPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  const [selected, setSelected] = React.useState<string[]>(profile.preferredSongIds)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SONGS
    return SONGS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    )
  }, [query])

  function toggle(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    )
  }

  function next() {
    setProfile((p) => ({ ...p, preferredSongIds: selected }))
    router.push("/signup/artist-preferences")
  }

  const canNext = selected.length >= 3

  return (
      <main className="min-h-dvh flex flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)]">      <SignupHeader step={3} total={5} />
      <h1 className="text-2xl font-extrabold">좋아하는 노래를 골라주세요</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        3곡 이상 선택하면 더 정확한 추천을 받을 수 있어요.
      </p>

      <div className="mt-5 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="노래 또는 가수 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="mt-5 flex-1 -mx-6 overflow-y-auto px-6">
        <div className="grid grid-cols-3 gap-3 pb-4">
          {filtered.map((s) => {
            const on = selected.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={cn(
                  "relative rounded-[12px] overflow-hidden text-left border-2 transition-all",
                  on ? "border-primary scale-[0.98]" : "border-transparent"
                )}
              >
                <div className="relative aspect-square w-full">
                  <Image
                    src={s.cover}
                    alt={s.title}
                    width={200}
                    height={200}
                    className="object-cover h-full w-full"
                  />
                  {on && (
                    <div className="absolute inset-0 bg-primary/40 grid place-items-center">
                      <div className="h-9 w-9 rounded-full bg-primary grid place-items-center">
                        <Check className="h-5 w-5 text-primary-foreground" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-1.5 pt-1.5 pb-2">
                  <div className="truncate text-xs font-semibold">{s.title}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{s.artist}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="pt-4">
        <div className="mb-3 text-xs text-muted-foreground text-center">
          {selected.length}곡 선택됨
        </div>
        <Button
          variant="brand"
          size="lg"
          className="w-full"
          disabled={!canNext}
          onClick={next}
        >
          다음 <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </main>
  )
}
