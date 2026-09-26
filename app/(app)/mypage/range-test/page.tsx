"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { RangeTest } from "@/components/range-test"
import { useStore } from "@/lib/store"
import { api } from "@/lib/api"
import { noteToMidi } from "@/lib/songs"

export default function MyPageRangeTestPage() {
    const router = useRouter()
    const { profile, setProfile } = useStore()
    return (
        <main className="px-4 pb-6">
            <PageHeader title="음역대 검사" subtitle="3분 안에 결과가 나와요" />
            <div className="mt-4">
                <RangeTest
                    userId={profile.userId}
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