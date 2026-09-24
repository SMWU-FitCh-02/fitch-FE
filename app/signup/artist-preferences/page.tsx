"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignupHeader } from "@/components/signup-header"
import { useStore } from "@/lib/store"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

const GENRES = [
    "발라드", "댄스", "POP",
    "랩/힙합", "R&B/어반", "OST",
]

export default function GenrePreferencesPage() {
    const router = useRouter()
    const { profile, setProfile } = useStore()
    const [selected, setSelected] = React.useState<string[]>(profile.preferredGenres || [])
    const [submitting, setSubmitting] = React.useState(false)

    function toggle(genre: string) {
        setSelected((cur) =>
            cur.includes(genre) ? cur.filter((g) => g !== genre) : [...cur, genre]
        )
    }

    const displayGenres = React.useMemo(
        () => [...selected, ...GENRES.filter((g) => !selected.includes(g))],
        [selected]
    )

    async function next() {
        setProfile((p) => ({ ...p, preferredGenres: selected }))

        if (profile.userId) {
            setSubmitting(true)
            try {
                await api.updatePreferredGenres(profile.userId, selected)
            } catch {
                // 저장 실패해도 회원가입 흐름은 막지 않음
            } finally {
                setSubmitting(false)
            }
        }

        router.push("/signup/range-test")
    }

    const canNext = selected.length >= 1

    return (
        <main className="min-h-dvh flex flex-col px-6 pb-32">
            <SignupHeader step={4} total={5} />
            <h1 className="text-2xl font-extrabold">좋아하는 장르</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
                하나 이상 선택해주세요. 취향에 맞는 곡을 찾아드려요.
            </p>

            <div className="flex-1 flex flex-col justify-center pb-24">
                <div className="grid grid-cols-3 gap-3">
                    {displayGenres.map((genre) => {
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
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                <Button
                    variant="brand"
                    size="lg"
                    className="w-full"
                    disabled={!canNext || submitting}
                    onClick={next}
                >
                    {submitting ? "저장 중..." : "다음"} <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
        </main>
    )
}