"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { RangeTest } from "@/components/range-test"
import { useStore } from "@/lib/store"

export default function MyPageRangeTestPage() {
  const router = useRouter()
  const { profile, setProfile } = useStore()
  return (
    <main className="px-4 pb-6">
      <PageHeader title="음역대 검사" subtitle="3분 안에 결과가 나와요" />
      <div className="mt-4">
        <RangeTest
          userId={profile.userId}
          onComplete={(rec) => {
            setProfile((p) => ({
              ...p,
              range: rec,
              history: [rec, ...p.history],
            }))
            router.replace("/mypage/history")
          }}
        />
      </div>
    </main>
  )
}
