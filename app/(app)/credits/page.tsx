"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SONG_CREDITS } from "@/lib/credits"
import { CreditLine } from "@/components/song-credit"

export default function CreditsPage() {
  const router = useRouter()
  return (
    <main className="px-4 pt-4 pb-24">
      <header className="flex items-center gap-2 px-1 mb-4">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 grid place-items-center rounded-[10px] hover:bg-muted text-muted-foreground"
          aria-label="뒤로"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">음원 출처</h1>
      </header>

      <p className="px-1 mb-4 text-xs leading-relaxed text-muted-foreground">
        FitCh의 곡별 음역대 데이터는 Free Music Archive의 CC BY 라이선스 음원을 분석해 만들었습니다.
        음원 자체는 앱에서 재생하거나 배포하지 않으며, 분석한 최저음·최고음 수치만 사용합니다.
      </p>

      <div className="space-y-2">
        {SONG_CREDITS.map((c) => (
          <div key={`${c.title}::${c.artist}`} className="rounded-[12px] border border-border bg-card p-3">
            <CreditLine credit={c} />
          </div>
        ))}
      </div>
    </main>
  )
}
