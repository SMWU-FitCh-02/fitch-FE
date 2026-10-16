"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { RangeTest } from "@/components/range-test"
import { useStore } from "@/lib/store"
import { api } from "@/lib/api"
import { noteToMidi } from "@/lib/songs"

export default function MyPageRangeTestPage() {
    const router = useRouter()
    const { profile, setProfile } = useStore()
    const [gender, setGender] = React.useState<"male" | "female" | undefined>(undefined)

    // 서버에 저장된 성별을 불러와 검사 시작 음을 정하는 데 사용 (없거나 "기타"면 기본 C4에서 시작)
    React.useEffect(() => {
        if (!profile.userId) return
        let cancelled = false
        api
            .getUser(profile.userId)
            .then((u) => {
                if (cancelled) return
                const g = String(u.gender ?? "").toLowerCase()
                setGender(g === "male" ? "male" : g === "female" ? "female" : undefined)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [profile.userId])

    return (
        <main className="px-4 pb-6">
            <PageHeader title="음역대 검사" subtitle="3분 안에 결과가 나와요" />
            <div className="mt-4">
                <RangeTest
                    userId={profile.userId}
                    gender={gender}
                    onComplete={async (rec) => {
                        setProfile((p) => ({
                            ...p,
                            range: rec,
                            history: [rec, ...p.history],
                        }))

                        if (profile.userId) {
                            try {
                                await api.saveVocalRange(
                                    profile.userId,
                                    noteToMidi(rec.lowestNote),
                                    noteToMidi(rec.highestNote)
                                )
                            } catch (e) {
                                console.error("음역대 저장 실패", e)
                            }
                        }

                        router.replace("/mypage/history")
                    }}
                />
            </div>
        </main>
    )
}