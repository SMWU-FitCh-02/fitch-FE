"use client"

import { useRouter } from "next/navigation"
import { SignupHeader } from "@/components/signup-header"
import { RangeTest } from "@/components/range-test"
import { useStore } from "@/lib/store"

export default function SignupRangeTestPage() {
    const router = useRouter()
    const { profile, setProfile } = useStore()
    const startNote = profile.gender === "male" ? "C3" : "C4"

    return (
        <main className="min-h-dvh flex flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+3rem)]">      <SignupHeader step={4} total={4} />
            <div>
                <h1 className="text-2xl font-extrabold">음역대 테스트</h1>
            </div>
            <div className="mt-6 flex-1">
                <RangeTest
                    userId={profile.userId}
                    startNote={startNote}
                    onComplete={(rec) => {
                        setProfile((p) => ({
                            ...p,
                            range: rec,
                            history: [rec, ...p.history],
                            loggedIn: true,
                        }))
                        router.replace("/home")
                    }}
                />
            </div>
        </main>
    )
}