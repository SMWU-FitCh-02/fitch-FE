"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignupHeader } from "@/components/signup-header"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

const GENRES = [
  "발라드", "K-POP", "힙합",
  "인디", "밴드", "댄스",
  "R&B", "팝", "OST",
]

export default function GenrePreferencesPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  const [selected, setSelected] = React.useState<string[]>(profile.preferredGenres || [])

  function toggle(genre: string) {
    setSelected((cur) =>
      cur.includes(genre) ? cur.filter((g) => g !== genre) : [...cur, genre]
    )
  }

  function next() {
    setProfile((p) => ({ ...p, preferredGenres: selected }))
    router.push("/signup/range-test")
  }

  const canNext = selected.length >= 1

  return (
    <main className="min-h-dvh flex flex-col px-6 pb-8">
      <SignupHeader step={4} total={5} />
      <h1 className="text-2xl font-extrabold">좋아하는 장르</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        하나 이상 선택해주세요. 취향에 맞는 곡을 찾아드려요.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3 flex-1">
        {GENRES.map((genre) => {
          const on = selected.includes(genre)
          return (
            <button
              key={genre}
              type="button"
              onClick={() => toggle(genre)}
              className={cn(
                "aspect-square rounded-[14px] border-2 grid place-items-center text-sm font-semibold transition-colors",
                on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-surface/40 text-muted-foreground"
              )}
            >
              {genre}
            </button>
          )
        })}
      </div>

      <div className="pt-6">
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