"use client"

import { useRouter } from "next/navigation"
import { SignupHeader } from "@/components/signup-header"
import { RangeTest } from "@/components/range-test"
import { useStore } from "@/lib/store"

export default function SignupRangeTestPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()

  return (
      <main className="min-h-dvh flex flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+3rem)]">      <SignupHeader step={4} total={4} />
      <div>
        <h1 className="text-2xl font-extrabold">음역대 테스트</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          마지막 단계예요! 짧은 녹음으로 음역대를 측정해요.
        </p>
      </div>
      <div className="mt-6 flex-1">
        <RangeTest
          userId={profile.userId}
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
